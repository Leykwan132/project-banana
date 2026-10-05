import { mutation, internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { authorizationUrl, hashState, callbackUrl, instagramProvider } from "./lib/instagramOfficial";
import { defaultMetrics, normalizeInstagramHandle } from "./lib/mediaKitModel";
import { connectionDoc, loginIntent } from "./instagramValidators";
import { ensureCreatorKit, queue } from "./mediaKits";

async function creatorOwner(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw Error("Sign in to connect Instagram.");
  const creator = await ctx.db.query("creators").withIndex("by_user", q => q.eq("user_id", identity.subject)).unique();
  if (!creator || creator.is_deleted) throw Error("A creator account is required.");
  return creator;
}
async function invalidateJob(ctx: MutationCtx, accountId: Id<"media_kit_accounts">) {
  const account = await ctx.db.get(accountId);
  const job = account?.current_import_id && await ctx.db.get(account.current_import_id);
  if (job?.provider === "META_OFFICIAL" && ["queued", "running"].includes(job.status)) {
    await ctx.db.patch(job._id, { status: "aborted", finished_at: Date.now() });
    await ctx.db.patch(accountId, { current_import_id: undefined });
  }
}
export const startLogin = mutation({
  args: { accountId: v.optional(v.id("media_kit_accounts")) },
  returns: v.object({ url: v.string() }),
  handler: async (ctx, args) => {
    const creator = await creatorOwner(ctx);
    if (args.accountId) {
      const account = await ctx.db.get(args.accountId);
      const kit = account && await ctx.db.get(account.kit_id);
      if (!account || (account.platform ?? "instagram") !== "instagram" || kit?.creator_id !== creator._id) throw Error("Account not found.");
    }
    const appId = process.env.INSTAGRAM_APP_ID;
    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!appId || !siteUrl || !process.env.INSTAGRAM_APP_SECRET || !process.env.SITE_URL) throw Error("Instagram connection is not configured.");
    const state = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const url = authorizationUrl(appId, siteUrl, state);
    await ctx.db.insert("instagram_oauth_states", { state_hash: await hashState(state), creator_id: creator._id, ...(args.accountId ? { account_id: args.accountId } : {}), expires_at: Date.now() + 600000 });
    return { url };
  },
});
export const consumeState = internalMutation({
  args: { stateHash: v.string() }, returns: v.union(loginIntent, v.null()),
  handler: async (ctx, args) => {
    const state = await ctx.db.query("instagram_oauth_states").withIndex("by_state_hash", q => q.eq("state_hash", args.stateHash)).unique();
    if (!state) return null;
    await ctx.db.delete(state._id);
    if (state.expires_at <= Date.now()) return null;
    const creator = await ctx.db.get(state.creator_id);
    if (!creator || creator.is_deleted) return null;
    return { creator_id: state.creator_id, ...(state.account_id ? { account_id: state.account_id } : {}) };
  },
});
export const saveConnection = internalMutation({
  args: { creatorId: v.id("creators"), accountId: v.optional(v.id("media_kit_accounts")), instagramUserId: v.string(), handle: v.string(), accessToken: v.string(), expiresAt: v.number() },
  returns: v.id("media_kit_accounts"),
  handler: async (ctx, args) => {
    const creator = await ctx.db.get(args.creatorId);
    if (!creator || creator.is_deleted) throw Error("Creator unavailable.");
    const handle = normalizeInstagramHandle(args.handle);
    let account = args.accountId ? await ctx.db.get(args.accountId) : null;
    if (args.accountId) {
      const kit = account && await ctx.db.get(account.kit_id);
      if (!account || kit?.creator_id !== creator._id || (account.platform ?? "instagram") !== "instagram" || account.handle !== handle) throw Error("Connect the Instagram account matching this card.");
    }
    const existing = await ctx.db.query("instagram_connections").withIndex("by_instagram_user_id", q => q.eq("instagram_user_id", args.instagramUserId)).unique();
    if (existing && existing.creator_id !== creator._id) throw Error("This Instagram account is connected to another creator.");
    const kit = await ensureCreatorKit(ctx, creator);
    const accounts = await ctx.db.query("media_kit_accounts").withIndex("by_kit_id", q => q.eq("kit_id", kit._id)).take(6);
    if (!account) account = accounts.find(a => (a.platform ?? "instagram") === "instagram" && a.handle === handle) ?? null;
    if (!account) {
      if (accounts.length >= 5) throw Error("Add up to five social accounts.");
      const id = await ctx.db.insert("media_kit_accounts", { kit_id: kit._id, handle, platform: "instagram", is_visible: true, metric_visibility: defaultMetrics, refresh_available_at: 0, created_at: Date.now() });
      account = (await ctx.db.get(id))!;
      if (!kit.primary_account_id) await ctx.db.patch(kit._id, { primary_account_id: id });
    }
    if (existing && existing.account_id !== account._id) throw Error("This Instagram account already has a connection.");
    await invalidateJob(ctx, account._id);
    const previous = await ctx.db.query("instagram_connections").withIndex("by_account_id", q => q.eq("account_id", account!._id)).unique();
    const fields = { creator_id: creator._id, account_id: account._id, instagram_user_id: args.instagramUserId, access_token: args.accessToken, expires_at: args.expiresAt, refreshed_at: Date.now(), generation: crypto.randomUUID(), status: "connected" as const };
    if (previous) await ctx.db.replace(previous._id, fields);
    else await ctx.db.insert("instagram_connections", fields);
    await ctx.db.patch(account._id, { official_refresh_available_at: 0 });
    await ctx.scheduler.runAfter(0, internal.instagramConnections.queueConnected, { accountId: account._id, attempt: 0 });
    return account._id;
  },
});
export const queueConnected = internalMutation({
  args: { accountId: v.id("media_kit_accounts"), attempt: v.number() }, returns: v.null(),
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) return null;
    const connection = await ctx.db.query("instagram_connections").withIndex("by_account_id", q => q.eq("account_id", account._id)).unique();
    if (!connection || connection.status !== "connected") return null;
    const job = account.current_import_id && await ctx.db.get(account.current_import_id);
    if (job && ["queued", "running"].includes(job.status) && Date.now() - job.started_at < 600000) {
      if (args.attempt < 10) await ctx.scheduler.runAfter(60000, internal.instagramConnections.queueConnected, { ...args, attempt: args.attempt + 1 });
      return null;
    }
    await queue(ctx, args.accountId, true, "META_OFFICIAL", true);
    return null;
  },
});
export const disconnect = mutation({
  args: { accountId: v.id("media_kit_accounts") }, returns: v.null(),
  handler: async (ctx, args) => {
    const creator = await creatorOwner(ctx);
    const account = await ctx.db.get(args.accountId);
    const kit = account && await ctx.db.get(account.kit_id);
    if (!account || kit?.creator_id !== creator._id) throw Error("Account not found.");
    const connection = await ctx.db.query("instagram_connections").withIndex("by_account_id", q => q.eq("account_id", args.accountId)).unique();
    if (connection) await ctx.db.delete(connection._id);
    await invalidateJob(ctx, args.accountId);
    return null;
  },
});
export const getConnectionForJob = internalQuery({
  args: { importId: v.id("media_kit_imports"), generation: v.string() }, returns: v.union(connectionDoc, v.null()),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.importId);
    if (!job || job.generation !== args.generation || job.provider !== "META_OFFICIAL" || !["queued", "running"].includes(job.status)) return null;
    const account = await ctx.db.get(job.account_id);
    if (!account || account.current_import_id !== job._id) return null;
    const kit = await ctx.db.get(account.kit_id);
    const creator = kit && await ctx.db.get(kit.creator_id);
    if (!creator || creator.is_deleted) return null;
    const connection = await ctx.db.query("instagram_connections").withIndex("by_account_id", q => q.eq("account_id", account._id)).unique();
    if (!connection || connection.creator_id !== creator._id || connection.generation !== job.connection_generation || connection.status !== "connected") return null;
    return connection;
  },
});
export const claimOfficialImport = internalMutation({
  args: { importId: v.id("media_kit_imports"), generation: v.string() }, returns: v.boolean(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.importId);
    if (!job || job.provider !== "META_OFFICIAL" || job.status !== "queued" || job.generation !== args.generation) return false;
    const account = await ctx.db.get(job.account_id);
    if (!account || account.current_import_id !== job._id) return false;
    const connection = await ctx.db.query("instagram_connections").withIndex("by_account_id", q => q.eq("account_id", account._id)).unique();
    if (!connection || connection.generation !== job.connection_generation || connection.status !== "connected") return false;
    await ctx.db.patch(job._id, { status: "running" });
    return true;
  },
});
export const configurationStatus = internalQuery({
  args: {}, returns: v.object({ provider: v.string(), appIdConfigured: v.boolean(), appSecretConfigured: v.boolean(), frontendOrigin: v.union(v.string(), v.null()), callback: v.union(v.string(), v.null()) }),
  handler: async () => ({ provider: instagramProvider(), appIdConfigured: Boolean(process.env.INSTAGRAM_APP_ID), appSecretConfigured: Boolean(process.env.INSTAGRAM_APP_SECRET), frontendOrigin: process.env.SITE_URL ? new URL(process.env.SITE_URL).origin : null, callback: process.env.CONVEX_SITE_URL ? callbackUrl(process.env.CONVEX_SITE_URL) : null }),
});
export const updateToken = internalMutation({
  args: { connectionId: v.id("instagram_connections"), generation: v.string(), accessToken: v.string(), expiresAt: v.number() }, returns: v.boolean(),
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection || connection.generation !== args.generation || connection.status !== "connected") return false;
    await ctx.db.patch(connection._id, { access_token: args.accessToken, expires_at: args.expiresAt, refreshed_at: Date.now() });
    return true;
  },
});
export const markReconnect = internalMutation({
  args: { connectionId: v.id("instagram_connections"), generation: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (connection?.generation === args.generation) await ctx.db.patch(connection._id, { status: "reconnect_required", access_token: "" });
    return null;
  },
});
export const cleanupStates = internalMutation({
  args: {}, returns: v.null(),
  handler: async (ctx) => {
    const expired = await ctx.db.query("instagram_oauth_states").withIndex("by_expires_at", q => q.lte("expires_at", Date.now())).take(100);
    for (const state of expired) await ctx.db.delete(state._id);
    if (expired.length === 100) await ctx.scheduler.runAfter(0, internal.instagramConnections.cleanupStates, {});
    return null;
  },
});
