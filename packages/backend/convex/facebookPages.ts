import { ensureCreatorKit } from "./mediaKits";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { hashState } from "./lib/instagramOfficial";
import { facebookAuthorizationUrl, facebookCallbackUrl } from "./lib/facebookPages";
import { pageChoice, pageMetricVisibility, pageSnapshot, pageConnectionDoc, refreshArgs } from "./facebookPageValidators";

async function owner(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw Error("Sign in to connect Facebook.");
  const creator = await ctx.db.query("creators").withIndex("by_user", q => q.eq("user_id", identity.subject)).unique();
  if (!creator || creator.is_deleted) throw Error("A creator account is required.");
  return creator;
}
export const startLogin = mutation({
  args: {}, returns: v.object({ url: v.string() }),
  handler: async ctx => {
    const creator = await owner(ctx);
    const id = process.env.META_APP_ID, site = process.env.CONVEX_SITE_URL;
    if (!id || !site || !process.env.META_APP_SECRET || !process.env.SITE_URL) throw Error("Facebook Page insights are not configured.");
    const state = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const url = facebookAuthorizationUrl(id, site, state);
    await ctx.db.insert("facebook_oauth_states", { creator_id: creator._id, state_hash: await hashState(state), expires_at: Date.now() + 600000 });
    return { url };
  },
});
export const consumeState = internalMutation({
  args: { stateHash: v.string() }, returns: v.union(v.id("creators"), v.null()),
  handler: async (ctx, args) => {
    const state = await ctx.db.query("facebook_oauth_states").withIndex("by_state_hash", q => q.eq("state_hash", args.stateHash)).unique();
    if (!state) return null;
    await ctx.db.delete(state._id);
    const creator = await ctx.db.get(state.creator_id);
    return state.expires_at > Date.now() && creator && !creator.is_deleted ? creator._id : null;
  },
});
export const saveChoices = internalMutation({
  args: { creatorId: v.id("creators"), pages: v.array(pageChoice) }, returns: v.null(),
  handler: async (ctx, args) => {
    const creator = await ctx.db.get(args.creatorId);
    if (!creator || creator.is_deleted || args.pages.length > 100) throw Error("Creator unavailable.");
    const previous = await ctx.db.query("facebook_page_choices").withIndex("by_creator_id", q => q.eq("creator_id", args.creatorId)).unique();
    if (previous) await ctx.db.delete(previous._id);
    await ctx.db.insert("facebook_page_choices", { creator_id: args.creatorId, pages: args.pages, expires_at: Date.now() + 600000 });
    return null;
  },
});
export const getEditor = query({
  args: { now: v.number() }, returns: v.object({
    configured: v.boolean(), choices: v.array(v.object({ id: v.string(), name: v.string() })),
    pages: v.array(v.object({ id: v.id("facebook_page_connections"), pageId: v.string(), name: v.string(), connectedAt: v.number(), isVisible: v.boolean(), metricVisibility: pageMetricVisibility, status: v.union(v.literal("connected"), v.literal("reconnect_required")), refreshing: v.boolean(), refreshAvailableAt: v.number(), snapshot: v.optional(pageSnapshot), error: v.optional(v.string()) })),
  }),
  handler: async (ctx, args) => {
    const creator = await owner(ctx);
    const choices = await ctx.db.query("facebook_page_choices").withIndex("by_creator_id", q => q.eq("creator_id", creator._id)).unique();
    const pages = await ctx.db.query("facebook_page_connections").withIndex("by_creator_id", q => q.eq("creator_id", creator._id)).take(5);
    return {
      configured: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.CONVEX_SITE_URL && process.env.SITE_URL),
      choices: choices && choices.expires_at > args.now ? choices.pages.map(({ id, name }) => ({ id, name })) : [],
      pages: pages.map(page => ({ id: page._id, pageId: page.page_id, name: page.name, connectedAt: page._creationTime, isVisible: page.is_visible ?? true, metricVisibility: page.metric_visibility ?? {}, status: page.status, refreshing: Boolean(page.refresh_id && args.now - (page.refresh_started_at ?? 0) < 300000), refreshAvailableAt: page.refresh_available_at, ...(page.snapshot ? { snapshot: page.snapshot } : {}), ...(page.error ? { error: page.error } : {}) })),
    };
  },
});
async function queueRefresh(ctx: MutationCtx, page: Doc<"facebook_page_connections">, force = false) {
  if (page.status !== "connected") throw Error("Reconnect Facebook first.");
  if (page.refresh_id && Date.now() - (page.refresh_started_at ?? 0) < 300000) return;
  if (!force && page.refresh_available_at > Date.now()) throw Error("Page insights can be refreshed later.");
  const refreshId = crypto.randomUUID();
  await ctx.db.patch(page._id, { refresh_id: refreshId, refresh_status: "queued", refresh_started_at: Date.now(), error: undefined });
  await ctx.scheduler.runAfter(0, internal.facebookPageActions.refreshPage, { connectionId: page._id, generation: page.generation, refreshId });
}
export const selectPage = mutation({
  args: { pageId: v.string() }, returns: v.id("facebook_page_connections"),
  handler: async (ctx, args) => {
    const creator = await owner(ctx);
    const choices = await ctx.db.query("facebook_page_choices").withIndex("by_creator_id", q => q.eq("creator_id", creator._id)).unique();
    if (!choices || choices.expires_at <= Date.now()) throw Error("Page selection expired. Connect Facebook again.");
    const selected = choices.pages.find(page => page.id === args.pageId);
    if (!selected) throw Error("Choose a Page authorized by your Facebook login.");
    const existing = await ctx.db.query("facebook_page_connections").withIndex("by_creator_and_page", q => q.eq("creator_id", creator._id).eq("page_id", args.pageId)).unique();
    const pages = await ctx.db.query("facebook_page_connections").withIndex("by_creator_id", q => q.eq("creator_id", creator._id)).take(5);
    if (!existing && pages.length >= 5) throw Error("Connect up to five Facebook Pages.");
    const fields = { creator_id: creator._id, page_id: selected.id, name: selected.name, access_token: selected.token, generation: crypto.randomUUID(), status: "connected" as const, refresh_available_at: 0 };
    const id = existing?._id ?? await ctx.db.insert("facebook_page_connections", fields);
    if (existing) await ctx.db.patch(id, { ...fields, refresh_id: undefined, refresh_status: undefined, refresh_started_at: undefined, error: undefined });
    await ensureCreatorKit(ctx, creator);
    // Keep other choices for selecting multiple Pages, but never return their tokens.
    await ctx.db.patch(choices._id, { pages: choices.pages.filter(page => page.id !== args.pageId) });
    await queueRefresh(ctx, (await ctx.db.get(id))!);
    return id;
  },
});
async function ownedPage(ctx: MutationCtx, id: Id<"facebook_page_connections">) {
  const creator = await owner(ctx), page = await ctx.db.get(id);
  if (!page || page.creator_id !== creator._id) throw Error("Page not found.");
  return page;
}
export const ensureKit = mutation({
  args: {}, returns: v.null(),
  handler: async ctx => {
    const creator = await owner(ctx);
    const pages = await ctx.db.query("facebook_page_connections")
      .withIndex("by_creator_id", q => q.eq("creator_id", creator._id)).take(1);
    if (pages.length) await ensureCreatorKit(ctx, creator);
    return null;
  },
});
export const setVisibility = mutation({
  args: { connectionId: v.id("facebook_page_connections"), isVisible: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const page = await ownedPage(ctx, args.connectionId);
    await ctx.db.patch(page._id, { is_visible: args.isVisible });
    return null;
  },
});
export const setMetricVisibility = mutation({
  args: { connectionId: v.id("facebook_page_connections"), metricVisibility: pageMetricVisibility },
  returns: v.null(),
  handler: async (ctx, args) => {
    const page = await ownedPage(ctx, args.connectionId);
    await ctx.db.patch(page._id, { metric_visibility: args.metricVisibility });
    return null;
  },
});
export const disconnect = mutation({
  args: { connectionId: v.id("facebook_page_connections") }, returns: v.null(),
  handler: async (ctx, args) => { await ownedPage(ctx, args.connectionId); await ctx.db.delete(args.connectionId); return null; },
});
export const requestRefresh = mutation({
  args: { connectionId: v.id("facebook_page_connections") }, returns: v.null(),
  handler: async (ctx, args) => { await queueRefresh(ctx, await ownedPage(ctx, args.connectionId)); return null; },
});
export const claimRefresh = internalMutation({
  args: refreshArgs, returns: v.union(pageConnectionDoc, v.null()),
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.connectionId);
    const creator = page && await ctx.db.get(page.creator_id);
    if (!page || !creator || creator.is_deleted || page.generation !== args.generation || page.refresh_id !== args.refreshId || page.refresh_status !== "queued" || page.status !== "connected") return null;
    await ctx.db.patch(page._id, { refresh_status: "running" });
    return page;
  },
});
export const finishRefresh = internalMutation({
  args: { ...refreshArgs, snapshot: v.optional(pageSnapshot), error: v.optional(v.string()), reconnect: v.optional(v.boolean()) }, returns: v.boolean(),
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.connectionId);
    const creator = page && await ctx.db.get(page.creator_id);
    if (!page || !creator || creator.is_deleted || page.generation !== args.generation || page.refresh_id !== args.refreshId) return false;
    await ctx.db.patch(page._id, {
      refresh_id: undefined, refresh_status: undefined, refresh_started_at: undefined,
      refresh_available_at: Date.now() + (args.snapshot ? 86400000 : 600000), error: args.error,
      ...(args.snapshot ? { snapshot: args.snapshot } : {}),
      ...(args.reconnect ? { status: "reconnect_required" as const, access_token: "" } : {}),
    });
    return true;
  },
});
export const refreshDailyBatch = internalMutation({
  args: { paginationOpts: paginationOptsValidator }, returns: v.null(),
  handler: async (ctx, args) => {
    const result = await ctx.db.query("facebook_page_connections").paginate(args.paginationOpts);
    for (const page of result.page) {
      const creator = await ctx.db.get(page.creator_id);
      if (!creator || creator.is_deleted) { await ctx.db.delete(page._id); continue; }
      if (page.status === "connected" && page.refresh_available_at <= Date.now()) await queueRefresh(ctx, page);
    }
    if (!result.isDone) await ctx.scheduler.runAfter(0, internal.facebookPages.refreshDailyBatch, { paginationOpts: { numItems: 50, cursor: result.continueCursor } });
    return null;
  },
});
export const cleanupStates = internalMutation({
  args: {}, returns: v.null(),
  handler: async ctx => {
    for (const table of ["facebook_oauth_states", "facebook_page_choices"] as const) {
      const rows = await ctx.db.query(table).withIndex("by_expires_at", q => q.lte("expires_at", Date.now())).take(100);
      for (const row of rows) await ctx.db.delete(row._id);
      if (rows.length === 100) await ctx.scheduler.runAfter(0, internal.facebookPages.cleanupStates, {});
    }
    return null;
  },
});
export const configurationStatus = internalQuery({
  args: {}, returns: v.object({ appIdConfigured: v.boolean(), appSecretConfigured: v.boolean(), frontendOrigin: v.union(v.string(), v.null()), callback: v.union(v.string(), v.null()) }),
  handler: async () => ({ appIdConfigured: Boolean(process.env.META_APP_ID), appSecretConfigured: Boolean(process.env.META_APP_SECRET), frontendOrigin: process.env.SITE_URL ? new URL(process.env.SITE_URL).origin : null, callback: process.env.CONVEX_SITE_URL ? facebookCallbackUrl(process.env.CONVEX_SITE_URL) : null }),
});

export const refreshOnce = internalMutation({
  args: { connectionId: v.id("facebook_page_connections") }, returns: v.null(),
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.connectionId);
    const creator = page && await ctx.db.get(page.creator_id);
    if (!page || !creator || creator.is_deleted) return null;
    await queueRefresh(ctx, page, true);
    return null;
  },
});
