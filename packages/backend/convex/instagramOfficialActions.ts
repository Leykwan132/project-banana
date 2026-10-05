import { internalAction, httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { callbackUrl, hashState, metaRequest, graphRequest, fetchOfficialData, safeMetaError, MetaApiError } from "./lib/instagramOfficial";
import { cacheInstagramImage } from "./lib/mediaKitImages";
import type { Id } from "./_generated/dataModel";

function tokenLifetime(payload: Record<string, any>): { token: string; expiresAt: number } {
  if (typeof payload.access_token !== "string" || !payload.access_token || !Number.isFinite(payload.expires_in) || payload.expires_in <= 0) throw Error("Invalid token response.");
  return { token: payload.access_token, expiresAt: Date.now() + payload.expires_in * 1000 };
}
export const completeLogin = internalAction({
  args: { state: v.string(), code: v.optional(v.string()), denied: v.boolean() },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    if (args.state.length > 200 || !args.state) return "invalid_state";
    const intent = await ctx.runMutation(internal.instagramConnections.consumeState, { stateHash: await hashState(args.state) });
    if (!intent) return "invalid_state";
    if (args.denied) return "cancelled";
    if (!args.code || args.code.length > 4096) return "connection_failed";
    try {
      const appId = process.env.INSTAGRAM_APP_ID, secret = process.env.INSTAGRAM_APP_SECRET, site = process.env.CONVEX_SITE_URL;
      if (!appId || !secret || !site) return "connection_failed";
      const exchange = await metaRequest("https://api.instagram.com/oauth/access_token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: appId, client_secret: secret, grant_type: "authorization_code", redirect_uri: callbackUrl(site), code: args.code }).toString(),
      });
      const short = Array.isArray(exchange.data) && exchange.data.length === 1 ? exchange.data[0] : exchange;
      if (typeof short.access_token !== "string") throw Error("Invalid token response.");
      const url = new URL("https://graph.instagram.com/access_token");
      url.search = new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: secret, access_token: short.access_token }).toString();
      const long = tokenLifetime(await metaRequest(url.toString()));
      const identity = await graphRequest("me", long.token, { fields: "user_id,username" });
      const userId = String(identity.user_id ?? short.user_id ?? "");
      if (!/^\d+$/.test(userId) || typeof identity.username !== "string") throw Error("Invalid Instagram identity.");
      await ctx.runMutation(internal.instagramConnections.saveConnection, { creatorId: intent.creator_id, ...(intent.account_id ? { accountId: intent.account_id } : {}), instagramUserId: userId, handle: identity.username, accessToken: long.token, expiresAt: long.expiresAt });
      return "connected";
    } catch (error) {
      if (error instanceof Error && error.message.includes("matching this card")) return "account_mismatch";
      return "connection_failed";
    }
  },
});
export const oauthCallback = httpAction(async (ctx, request) => {
  const frontend = process.env.SITE_URL;
  if (!frontend) return new Response("Instagram connection is not configured.", { status: 503 });
  const returnUrl = new URL("/creator/media-kit", frontend);
  if (returnUrl.protocol !== "https:" && !(returnUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(returnUrl.hostname))) return new Response("Instagram connection is not configured.", { status: 503 });
  const query = new URL(request.url).searchParams;
  let result = "connection_failed";
  try { result = await ctx.runAction(internal.instagramOfficialActions.completeLogin, { state: query.get("state") ?? "", ...(query.get("code") ? { code: query.get("code")! } : {}), denied: query.has("error") }); }
  catch { /* Return a safe error; never render OAuth parameters or upstream errors. */ }
  returnUrl.searchParams.set("instagram", result);
  return new Response(null, { status: 303, headers: { Location: returnUrl.toString(), "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
});
export const importProfile = internalAction({
  args: { importId: v.id("media_kit_imports"), generation: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(internal.mediaKits.getJob, args);
    if (!job?.active || job.job.provider !== "META_OFFICIAL") return null;
    const connection = await ctx.runQuery(internal.instagramConnections.getConnectionForJob, args);
    if (!connection) {
      await ctx.runMutation(internal.mediaKits.finishImport, { ...args, error: "Connect or reconnect Instagram to import official insights." });
      return null;
    }
    if (!await ctx.runMutation(internal.instagramConnections.claimOfficialImport, args)) return null;
    const imageIds: Id<"_storage">[] = [];
    try {
      let token = connection.access_token;
      if (connection.expires_at <= Date.now()) throw new MetaApiError(190, 401);
      if (connection.expires_at - Date.now() < 7 * 86400000 && Date.now() - connection.refreshed_at >= 86400000) {
        const url = new URL("https://graph.instagram.com/refresh_access_token");
        url.search = new URLSearchParams({ grant_type: "ig_refresh_token", access_token: token }).toString();
        const refreshed = tokenLifetime(await metaRequest(url.toString()));
        if (!await ctx.runMutation(internal.instagramConnections.updateToken, { connectionId: connection._id, generation: connection.generation, accessToken: refreshed.token, expiresAt: refreshed.expiresAt })) return null;
        token = refreshed.token;
      }
      const { snapshot, insights } = await fetchOfficialData(connection.instagram_user_id, token, job.account.handle);
      const avatarStorageId = await cacheInstagramImage(ctx, snapshot.profileImageUrl);
      if (avatarStorageId) imageIds.push(avatarStorageId);
      const posts = [];
      for (const post of snapshot.posts) {
        const imageStorageId = await cacheInstagramImage(ctx, post.imageUrl);
        if (imageStorageId) imageIds.push(imageStorageId);
        const { imageStorageId: _old, ...fields } = post;
        posts.push({ ...fields, ...(imageStorageId ? { imageStorageId } : {}) });
      }
      const { avatarStorageId: _oldAvatar, ...fields } = snapshot;
      const saved = await ctx.runMutation(internal.mediaKits.finishImport, { ...args, snapshot: { ...fields, ...(avatarStorageId ? { avatarStorageId } : {}), posts }, insights });
      if (!saved) for (const id of imageIds) await ctx.storage.delete(id);
    } catch (error) {
      for (const id of imageIds) await ctx.storage.delete(id);
      if (error instanceof MetaApiError && [190, 10, 200].includes(error.code)) await ctx.runMutation(internal.instagramConnections.markReconnect, { connectionId: connection._id, generation: connection.generation });
      await ctx.runMutation(internal.mediaKits.finishImport, { ...args, error: safeMetaError(error) });
    }
    return null;
  },
});
