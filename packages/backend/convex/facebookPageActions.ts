import { internalAction, httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { hashState, metaRequest, MetaApiError } from "./lib/instagramOfficial";
import { facebookCallbackUrl, facebookGraph, facebookGraphUrl, fetchPageInsights, safeFacebookError } from "./lib/facebookPages";
import { refreshArgs } from "./facebookPageValidators";

export const completeLogin = internalAction({
  args: { state: v.string(), code: v.optional(v.string()), denied: v.boolean() }, returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    if (!args.state || args.state.length > 200) return "invalid_state";
    const creatorId = await ctx.runMutation(internal.facebookPages.consumeState, { stateHash: await hashState(args.state) });
    if (!creatorId) return "invalid_state";
    if (args.denied) return "cancelled";
    if (!args.code || args.code.length > 4096) return "connection_failed";
    try {
      const appId = process.env.META_APP_ID, secret = process.env.META_APP_SECRET, site = process.env.CONVEX_SITE_URL;
      if (!appId || !secret || !site) return "connection_failed";
      const short = await metaRequest(facebookGraphUrl("oauth/access_token", { client_id: appId, client_secret: secret, redirect_uri: facebookCallbackUrl(site), code: args.code }).toString());
      if (typeof short.access_token !== "string" || !short.access_token) return "connection_failed";
      const long = await metaRequest(facebookGraphUrl("oauth/access_token", { client_id: appId, client_secret: secret, grant_type: "fb_exchange_token", fb_exchange_token: short.access_token }).toString());
      if (typeof long.access_token !== "string" || !long.access_token) return "connection_failed";
      const permissions = await facebookGraph("me/permissions", long.access_token);
      const granted = new Set(Array.isArray(permissions.data) ? permissions.data.filter((item: any) => item.status === "granted").map((item: any) => item.permission) : []);
      if (!["pages_show_list", "pages_read_engagement", "read_insights"].every(permission => granted.has(permission))) return "permission_required";
      const pages: { id: string; name: string; token: string }[] = [];
      let after: string | undefined;
      for (let batch = 0; batch < 4; batch++) {
        const response = await facebookGraph("me/accounts", long.access_token, { fields: "id,name,access_token", limit: "25", ...(after ? { after } : {}) });
        if (!Array.isArray(response.data)) throw Error("Invalid Page response.");
        for (const page of response.data) {
          if (/^\d+$/.test(page.id) && typeof page.name === "string" && typeof page.access_token === "string" && page.access_token && !pages.some(existing => existing.id === page.id)) pages.push({ id: page.id, name: page.name, token: page.access_token });
        }
        if (pages.length > 100) throw Error("Too many Pages.");
        if (!response.paging?.next) break;
        const cursor = response.paging?.cursors?.after;
        if (batch === 3 || typeof cursor !== "string" || !cursor || cursor === after) throw Error("Page listing incomplete.");
        // Follow only the cursor, never an API-provided URL containing credentials.
        after = cursor;
      }
      await ctx.runMutation(internal.facebookPages.saveChoices, { creatorId, pages });
      return pages.length ? "choose_page" : "no_pages";
    } catch { return "connection_failed"; }
  },
});
export const oauthCallback = httpAction(async (ctx, request) => {
  if (!process.env.SITE_URL) return new Response("Facebook connection is not configured.", { status: 503 });
  const destination = new URL("/creator/media-kit", process.env.SITE_URL);
  if (destination.protocol !== "https:" && !(destination.protocol === "http:" && ["localhost", "127.0.0.1"].includes(destination.hostname))) return new Response("Facebook connection is not configured.", { status: 503 });
  const query = new URL(request.url).searchParams;
  let result = "connection_failed";
  try { result = await ctx.runAction(internal.facebookPageActions.completeLogin, { state: query.get("state") ?? "", ...(query.get("code") ? { code: query.get("code")! } : {}), denied: query.has("error") }); }
  catch { /* OAuth parameters and raw errors never reach the browser. */ }
  destination.searchParams.set("facebook", result);
  return new Response(null, { status: 303, headers: { Location: destination.toString(), "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
});
export const refreshPage = internalAction({
  args: refreshArgs, returns: v.null(),
  handler: async (ctx, args) => {
    const connection = await ctx.runMutation(internal.facebookPages.claimRefresh, args);
    if (!connection) return null;
    try {
      const snapshot = await fetchPageInsights(connection.page_id, connection.access_token);
      await ctx.runMutation(internal.facebookPages.finishRefresh, { ...args, snapshot });
    } catch (error) {
      const reconnect = error instanceof MetaApiError && ([190, 10, 200].includes(error.code) || error.status === 403);
      await ctx.runMutation(internal.facebookPages.finishRefresh, { ...args, error: safeFacebookError(error), reconnect });
    }
    return null;
  },
});
