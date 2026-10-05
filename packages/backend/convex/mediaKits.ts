import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { v, type Infer } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import * as V from "./mediaKitValidators";
import {
  DAY,
  defaultMetrics,
  normalizeInstagramHandle,
  normalizeAccountHandle,
  validateSettings,
  validateSlug,
  contactHref,
  projectAccount,
} from "./lib/mediaKitModel";
import { projectInsightWindows } from "./lib/instagramInsightWindows";
import { scrapePool } from "./workpools";
import { instagramProvider, accountForProvider } from "./lib/instagramOfficial";
import type { InstagramProvider } from "./lib/instagramOfficial";
function imageIds(snapshot?: {
  avatarStorageId?: Id<"_storage">;
  posts: { imageStorageId?: Id<"_storage"> }[];
}) {
  return [
    ...new Set(
      [
        snapshot?.avatarStorageId,
        ...(snapshot?.posts.map((p) => p.imageStorageId) ?? []),
      ].filter((id): id is Id<"_storage"> => !!id),
    ),
  ];
}
async function owner(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw Error("Sign in to edit your media kit.");
  const creator = await ctx.db
    .query("creators")
    .withIndex("by_user", (q) => q.eq("user_id", identity.subject))
    .unique();
  if (!creator || creator.is_deleted)
    throw Error("A creator account is required.");
  return creator;
}
async function ownKit(ctx: QueryCtx | MutationCtx) {
  const creator = await owner(ctx);
  return ctx.db
    .query("media_kits")
    .withIndex("by_creator_id", (q) => q.eq("creator_id", creator._id))
    .unique();
}
async function ownAccount(ctx: MutationCtx, id: Id<"media_kit_accounts">) {
  const kit = await ownKit(ctx);
  const account = await ctx.db.get(id);
  if (!kit || !account || account.kit_id !== kit._id)
    throw Error("Account not found.");
  return account;
}
export async function queue(
  ctx: MutationCtx,
  accountId: Id<"media_kit_accounts">,
  daily = false,
  providerOverride?: InstagramProvider,
  force = false,
) {
  const account = await ctx.db.get(accountId);
  if (!account) return null;
  const kit = await ctx.db.get(account.kit_id);
  const creator = kit && (await ctx.db.get(kit.creator_id));
  if (!creator || creator.is_deleted) return null;
  const provider = account.platform === "tiktok" ? "SCRAPING" : providerOverride ?? instagramProvider();
  const selected = accountForProvider(account, provider);
  const connection = provider === "META_OFFICIAL"
    ? await ctx.db.query("instagram_connections").withIndex("by_account_id", q => q.eq("account_id", accountId)).unique()
    : null;
  if (provider === "META_OFFICIAL" && (!connection || connection.status !== "connected" || connection.expires_at <= Date.now())) {
    if (connection && connection.expires_at <= Date.now()) await ctx.db.patch(connection._id, { status: "reconnect_required", access_token: "" });
    if (daily) return null;
    throw Error("Connect or reconnect Instagram to import official insights.");
  }
  const previous =
    account.current_import_id && (await ctx.db.get(account.current_import_id));
  if (previous && ["queued", "running"].includes(previous.status)) {
    if (Date.now() - previous.started_at < 600000)
      return daily ? null : previous._id;
    await ctx.db.patch(previous._id, {
      status: "failed",
      finished_at: Date.now(),
      error_message: "Import expired. Please try again.",
    });
    if (previous.apify_run_id)
      await ctx.scheduler.runAfter(0, internal.mediaKitActions.abortRun, {
        runId: previous.apify_run_id,
      });
  }
  if (!force && (
    Date.now() < selected.refresh_available_at ||
    (daily &&
      selected.last_success_at !== undefined &&
      Date.now() - selected.last_success_at < DAY)
  )) {
    if (daily) return null;
    throw Error("This account can be refreshed again after its cooldown.");
  }
  const generation = crypto.randomUUID();
  const importId = await ctx.db.insert("media_kit_imports", {
    account_id: accountId,
    generation,
    provider,
    ...(connection ? { connection_generation: connection.generation } : {}),
    status: "queued",
    started_at: Date.now(),
  });
  await ctx.db.patch(accountId, { current_import_id: importId });
  if (provider === "META_OFFICIAL") {
    await ctx.scheduler.runAfter(0, internal.instagramOfficialActions.importProfile, { importId, generation });
  } else await scrapePool.enqueueAction(
    ctx,
    internal.mediaKitActions.startImport,
    { importId, generation },
    { retry: false, runAfter: 0 },
  );
  return importId;
}
export async function ensureCreatorKit(ctx: MutationCtx, creator: Doc<"creators">): Promise<Doc<"media_kits">> {
  const existing = await ctx.db.query("media_kits").withIndex("by_creator_id", q => q.eq("creator_id", creator._id)).unique();
  if (existing) return existing;
  let slug = `creator-${crypto.randomUUID().slice(0, 12)}`;
  try {
    const preferred = validateSlug(creator.username ?? "");
    const used = await ctx.db.query("media_kits").withIndex("by_slug", q => q.eq("slug", preferred)).unique();
    if (!used) slug = preferred;
  } catch { /* Use an editable fallback for creators without a valid username. */ }
  const created = Date.now();
  const id = await ctx.db.insert("media_kits", {
    creator_id: creator._id, slug, display_name: creator.name, bio: "", category: "",
    total_audience_visible: true, rates_visible: true, contacts_visible: true,
    partnerships: [], partnerships_visible: true, rates: [], contacts: [],
    is_published: true, created_at: created, updated_at: created,
  });
  return (await ctx.db.get(id))!;
}
export const addAccount = mutation({
  args: { handle: v.string(), platform: v.optional(V.platform) },
  returns: v.id("media_kit_accounts"),
  handler: async (ctx, args) => {
    const creator = await owner(ctx);
    const platform = args.platform ?? "instagram";
    const handle = normalizeAccountHandle(args.handle, platform);
    const kit = await ensureCreatorKit(ctx, creator);
    const accounts = await ctx.db
      .query("media_kit_accounts")
      .withIndex("by_kit_id", (q) => q.eq("kit_id", kit._id))
      .take(6);
    if (accounts.length >= 5) throw Error("Add up to five social accounts.");
    if (
      accounts.some(
        (a) => a.handle === handle && (a.platform ?? "instagram") === platform,
      )
    )
      throw Error("This account is already added.");
    const id = await ctx.db.insert("media_kit_accounts", {
      kit_id: kit._id,
      handle,
      platform,
      is_visible: true,
      metric_visibility: defaultMetrics,
      refresh_available_at: 0,
      created_at: Date.now(),
    });
    if (!kit.primary_account_id)
      await ctx.db.patch(kit._id, { primary_account_id: id });
    await queue(ctx, id);
    return id;
  },
});
export const getEditor = query({
  args: {},
  returns: v.object({
    provider: V.instagramProvider,
    instagramConfigured: v.boolean(),
    kit: v.union(V.kitDoc, v.null()),
    photoUrl: v.union(v.string(), v.null()),
    accounts: v.array(
      v.object({
        account: V.accountDoc,
        job: v.union(V.importDoc, v.null()),
        avatarUrl: v.union(v.string(), v.null()),
        postImages: v.array(v.union(v.string(), v.null())),
        connectionStatus: v.union(v.literal("disconnected"), v.literal("connected"), v.literal("reconnect_required")),
      }),
    ),
  }),
  handler: async (ctx) => {
    const provider = instagramProvider();
    const kit = await ownKit(ctx);
    const accounts = kit
      ? await ctx.db
          .query("media_kit_accounts")
          .withIndex("by_kit_id", (q) => q.eq("kit_id", kit._id))
          .take(5)
      : [];
    return {
      provider,
      instagramConfigured: Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET && process.env.CONVEX_SITE_URL && process.env.SITE_URL),
      kit,
      photoUrl: kit?.photo_storage_id
        ? await ctx.storage.getUrl(kit.photo_storage_id)
        : null,
      accounts: await Promise.all(
        accounts.map(account => accountForProvider(account, provider)).map(async (account) => ({
          account,
          connectionStatus: (await ctx.db.query("instagram_connections").withIndex("by_account_id", q => q.eq("account_id", account._id)).unique())?.status ?? ("disconnected" as const),
          avatarUrl: account.snapshot?.avatarStorageId
            ? await ctx.storage.getUrl(account.snapshot.avatarStorageId)
            : null,
          postImages: await Promise.all(
            (account.snapshot?.posts ?? []).map((p) =>
              p.imageStorageId ? ctx.storage.getUrl(p.imageStorageId) : null,
            ),
          ),
          job:
            (
              await ctx.db
                .query("media_kit_imports")
                .withIndex("by_account_id", (q) =>
                  q.eq("account_id", account._id),
                )
                .order("desc")
                .take(1)
            )[0] ?? null,
        })),
      ),
    };
  },
});
export const saveSettings = mutation({
  args: { settings: V.settings },
  returns: v.null(),
  handler: async (ctx, args) => {
    const kit = await ownKit(ctx);
    if (!kit) throw Error("Add a social account first.");
    const settings = validateSettings({
      ...args.settings,
      total_audience_visible: true,
      rates_visible: true,
      contacts_visible: true,
      // Older open editors omit these fields; preserve existing partnerships.
      partnerships: args.settings.partnerships ?? kit.partnerships ?? [],
      partnerships_visible: true,
    });
    const existing = await ctx.db
      .query("media_kits")
      .withIndex("by_slug", (q) => q.eq("slug", settings.slug))
      .unique();
    if (existing && existing._id !== kit._id)
      throw Error("This public link is already taken.");
    const accounts = await ctx.db
      .query("media_kit_accounts")
      .withIndex("by_kit_id", (q) => q.eq("kit_id", kit._id))
      .take(5);
    for (const contact of settings.contacts)
      if (
        contact.kind === "instagram" &&
        !accounts.some(
          (a) =>
            (a.platform ?? "instagram") === "instagram" &&
            a.handle === normalizeInstagramHandle(contact.value),
        )
      )
        throw Error("Instagram contact must match an account in your kit.");
    await ctx.db.patch(kit._id, {
      ...settings,
      is_published: true,
      updated_at: Date.now(),
    });
    return null;
  },
});
export const setAccountDisplay = mutation({
  args: {
    accountId: v.id("media_kit_accounts"),
    isVisible: v.boolean(),
    metricVisibility: V.metricVisibility,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const account = await ownAccount(ctx, args.accountId);
    if (account.is_visible && !args.isVisible && account.current_import_id) {
      const job = await ctx.db.get(account.current_import_id);
      if (job?.apify_run_id)
        await ctx.scheduler.runAfter(0, internal.mediaKitActions.abortRun, {
          runId: job.apify_run_id,
        });
      await ctx.db.patch(account.current_import_id, {
        status: "aborted",
        finished_at: Date.now(),
      });
      await ctx.db.patch(account._id, { current_import_id: undefined });
    }
    await ctx.db.patch(account._id, {
      is_visible: args.isVisible,
      metric_visibility: args.metricVisibility,
    });
    return null;
  },
});
export const setPublished = mutation({
  args: { published: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const kit = await ownKit(ctx);
    if (!kit) throw Error("Add an account first.");
    if (args.published) {
      const accounts = await ctx.db
        .query("media_kit_accounts")
        .withIndex("by_kit_id", (q) => q.eq("kit_id", kit._id))
        .take(5);
      const pages = await ctx.db.query("facebook_page_connections")
        .withIndex("by_creator_id", q => q.eq("creator_id", kit.creator_id)).take(5);
      if (!accounts.some((a) => a.is_visible && accountForProvider(a, instagramProvider()).snapshot)
        && !pages.some(page => (page.is_visible ?? true) && page.snapshot))
        throw Error("Import and show at least one account before publishing.");
    }
    await ctx.db.patch(kit._id, {
      is_published: args.published,
      updated_at: Date.now(),
    });
    return null;
  },
});
export const removeAccount = mutation({
  args: { accountId: v.id("media_kit_accounts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const account = await ownAccount(ctx, args.accountId);
    const connection = await ctx.db.query("instagram_connections").withIndex("by_account_id", q => q.eq("account_id", account._id)).unique();
    if (connection) await ctx.db.delete(connection._id);
    if (account.current_import_id) {
      const job = await ctx.db.get(account.current_import_id);
      if (job?.apify_run_id)
        await ctx.scheduler.runAfter(0, internal.mediaKitActions.abortRun, {
          runId: job.apify_run_id,
        });
      await ctx.db.patch(account.current_import_id, {
        status: "aborted",
        finished_at: Date.now(),
      });
    }
    await ctx.db.delete(account._id);
    for (const id of new Set([...imageIds(account.snapshot), ...imageIds(account.official_snapshot)])) await ctx.storage.delete(id);
    const kit = (await ctx.db.get(account.kit_id))!;
    if (kit.primary_account_id === account._id) {
      const next = await ctx.db
        .query("media_kit_accounts")
        .withIndex("by_kit_id", (q) => q.eq("kit_id", kit._id))
        .take(1);
      await ctx.db.patch(kit._id, { primary_account_id: next[0]?._id });
    }
    return null;
  },
});
export const requestRefresh = mutation({
  args: { accountId: v.id("media_kit_accounts") },
  returns: v.union(v.id("media_kit_imports"), v.null()),
  handler: async (ctx, args) => {
    await ownAccount(ctx, args.accountId);
    return queue(ctx, args.accountId);
  },
});
export const enqueueDaily = internalMutation({
  args: { accountId: v.id("media_kit_accounts") },
  returns: v.union(v.id("media_kit_imports"), v.null()),
  handler: (ctx, args) => queue(ctx, args.accountId, true),
});
export const refreshOfficialOnce = internalMutation({
  args: { accountId: v.id("media_kit_accounts") },
  returns: v.union(v.id("media_kit_imports"), v.null()),
  handler: (ctx, args) => queue(ctx, args.accountId, true, "META_OFFICIAL", true),
});
export const getPublic = query({
  args: { slug: v.string() },
  returns: v.union(V.publicKit, v.null()),
  handler: async (ctx, args) => {
    const kit = await ctx.db
      .query("media_kits")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!kit || !kit.is_published) return null;
    const creator = await ctx.db.get(kit.creator_id);
    if (!creator || creator.is_deleted) return null;
    const saved = await ctx.db
      .query("media_kit_accounts")
      .withIndex("by_kit_id", (q) => q.eq("kit_id", kit._id))
      .take(5);
    const shown = saved.map(a => accountForProvider(a, instagramProvider())).filter((a) => a.is_visible && a.snapshot);
    const accounts = await Promise.all(
      shown.map(async (a) => {
        const { posts, ...p } = projectAccount(
          a.snapshot!,
          a.metric_visibility,
        );
        return {
          ...p,
          ...((a.platform ?? "instagram") === "instagram" && instagramProvider() === "META_OFFICIAL" && a.official_insights
            ? { insightWindows: projectInsightWindows(a.official_insights.windows ?? [{ ...a.official_insights, days: Math.round((a.official_insights.until - a.official_insights.since) / 86400) }], a.metric_visibility) }
            : {}),
          dataSource: a.platform === "tiktok" ? "SCRAPING" as const : instagramProvider(),
          id: a._id,
          handle: a.handle,
          platform: a.platform ?? "instagram",
          updatedAt: a.last_success_at ?? 0,
          avatarUrl: a.snapshot!.avatarStorageId
            ? await ctx.storage.getUrl(a.snapshot!.avatarStorageId)
            : null,
          ...(posts
            ? {
                posts: await Promise.all(
                  posts.map(async (post) => {
                    const original = a.snapshot!.posts.find(
                      (x) => x.id === post.id,
                    );
                    return {
                      ...post,
                      imageUrl: original?.imageStorageId
                        ? await ctx.storage.getUrl(original.imageStorageId)
                        : null,
                    };
                  }),
                ),
              }
            : {}),
        };
      }),
    );
    const pages = await ctx.db.query("facebook_page_connections")
      .withIndex("by_creator_id", q => q.eq("creator_id", kit.creator_id)).take(5);
    const facebookAccounts = pages.filter(page => (page.is_visible ?? true) && page.snapshot)
      .map(page => ({
        id: page._id,
        platform: "facebook" as const,
        handle: page.page_id,
        displayName: page.name,
        biography: "",
        verified: false,
        avatarUrl: null,
        updatedAt: page.snapshot!.fetched_at,
        ...(page.snapshot!.followers !== undefined ? { followers: page.snapshot!.followers } : {}),
        ...(page.snapshot!.page_likes !== undefined ? { pageLikes: page.snapshot!.page_likes } : {}),
        ...(page.snapshot!.average_likes !== undefined ? { averageLikes: page.snapshot!.average_likes } : {}),
        ...(page.snapshot!.average_reactions !== undefined ? { averageReactions: page.snapshot!.average_reactions } : {}),
        ...(page.snapshot!.engagement_rate !== undefined ? { engagementRate: page.snapshot!.engagement_rate } : {}),
        ...(page.snapshot!.post_sample_size !== undefined ? { postSampleSize: page.snapshot!.post_sample_size } : {}),
        ...(page.snapshot!.audience_country !== undefined ? { audienceCountry: page.snapshot!.audience_country } : {}),
        ...(page.snapshot!.media_views !== undefined ? { mediaViews: page.snapshot!.media_views } : {}),
      }));
    const publicAccounts: Infer<typeof V.publicAccount>[] = [...accounts, ...facebookAccounts];
    const primary =
      shown.find((a) => a._id === kit.primary_account_id) ?? shown[0];
    return {
      slug: kit.slug,
      displayName: kit.display_name,
      bio: kit.bio,
      category: kit.category,
      photoUrl: kit.photo_storage_id
        ? await ctx.storage.getUrl(kit.photo_storage_id)
        : primary?.snapshot?.avatarStorageId
          ? await ctx.storage.getUrl(primary.snapshot.avatarStorageId)
          : null,
      accounts: publicAccounts,
      ...(publicAccounts.some((account) => account.followers !== undefined)
        ? {
            totalAudience: publicAccounts.reduce(
              (total, account) => total + (account.followers ?? 0),
              0,
            ),
          }
        : {}),
      partnerships: (kit.partnerships ?? []).filter((p) => p.is_visible),
      rates: kit.rates.filter((r) => r.is_visible),
      contacts: kit.contacts
        .filter(
          (c) =>
            c.is_visible &&
            (c.kind !== "instagram" ||
              shown.some(
                (a) =>
                  (a.platform ?? "instagram") === "instagram" &&
                  a.handle === normalizeInstagramHandle(c.value),
              )),
        )
        .map((c) => ({
          kind: c.kind,
          label:
            c.kind === "instagram"
              ? "Instagram DM"
              : c.kind === "whatsapp"
                ? "WhatsApp"
                : c.value,
          href: contactHref(c),
        })),
    };
  },
});
export const getJob = internalQuery({
  args: { importId: v.id("media_kit_imports"), generation: v.string() },
  returns: v.union(
    v.object({ job: V.importDoc, account: V.accountDoc, active: v.boolean() }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.importId);
    if (!job) return null;
    const account = await ctx.db.get(job.account_id);
    if (!account) return null;
    const kit = await ctx.db.get(account.kit_id);
    const creator = kit && (await ctx.db.get(kit.creator_id));
    return {
      job,
      account,
      active:
        !!creator &&
        !creator.is_deleted &&
        job.generation === args.generation &&
        account.current_import_id === job._id &&
        ["queued", "running"].includes(job.status),
    };
  },
});
export const beginRun = internalMutation({
  args: {
    importId: v.id("media_kit_imports"),
    generation: v.string(),
    runId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.importId);
    const account = job && (await ctx.db.get(job.account_id));
    if (
      !job ||
      !account ||
      account.current_import_id !== job._id ||
      job.generation !== args.generation ||
      job.status !== "running" ||
      !!job.apify_run_id
    )
      return false;
    const kit = await ctx.db.get(account.kit_id);
    const creator = kit && (await ctx.db.get(kit.creator_id));
    if (!creator || creator.is_deleted) return false;
    await ctx.db.patch(job._id, {
      status: "running",
      apify_run_id: args.runId,
    });
    return true;
  },
});
export const finishImport = internalMutation({
  args: {
    importId: v.id("media_kit_imports"),
    generation: v.string(),
    snapshot: v.optional(V.snapshot),
    error: v.optional(v.string()),
    insights: v.optional(V.officialInsights),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.importId);
    const account = job && (await ctx.db.get(job.account_id));
    if (
      !job ||
      !account ||
      account.current_import_id !== job._id ||
      job.generation !== args.generation ||
      !["queued", "running"].includes(job.status)
    )
      return false;
    const kit = await ctx.db.get(account.kit_id);
    const creator = kit && (await ctx.db.get(kit.creator_id));
    if (!creator || creator.is_deleted) return false;
    const official = job.provider === "META_OFFICIAL";
    if (official) {
      const connection = await ctx.db.query("instagram_connections").withIndex("by_account_id", q => q.eq("account_id", account._id)).unique();
      if (!connection || connection.generation !== job.connection_generation) return false;
    }
    if (args.snapshot) {
      if (
        !account.snapshot && !account.official_snapshot &&
        kit?.primary_account_id === account._id &&
        kit.updated_at === kit.created_at
      ) {
        await ctx.db.patch(kit._id, {
          display_name: args.snapshot.displayName,
          bio: args.snapshot.biography,
          category: args.snapshot.category,
          updated_at: Date.now(),
        });
      }
      const next = new Set(imageIds(args.snapshot));
      for (const id of imageIds(official ? account.official_snapshot : account.snapshot))
        if (!next.has(id)) await ctx.storage.delete(id);
    }
    const now = Date.now();
    await ctx.db.patch(job._id, {
      status: args.snapshot ? "succeeded" : "failed",
      finished_at: now,
      ...(!args.snapshot
        ? {
            error_message: (
              args.error ?? "Import failed. Please retry later."
            ).slice(0, 500),
          }
        : {}),
    });
    await ctx.db.patch(account._id, {
      current_import_id: undefined,
      ...(official
        ? { official_refresh_available_at: now + (args.snapshot ? DAY : 600000) }
        : { refresh_available_at: now + (args.snapshot ? DAY : 600000) }),
      ...(args.snapshot
        ? official
          ? { official_snapshot: args.snapshot, official_success_at: now, ...(args.insights ? { official_insights: args.insights } : {}) }
          : { snapshot: args.snapshot, last_success_at: now }
        : {}),
    });
    return true;
  },
});
export const listAccounts = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(V.accountDoc),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const { page, isDone, continueCursor } = await ctx.db
      .query("media_kit_accounts")
      .paginate(args.paginationOpts);
    // Convex also returns pageStatus/splitCursor; this API exposes only what
    // the daily refresh consumes, matching its strict return validator.
    return { page, isDone, continueCursor };
  },
});

export const setPrimaryAccount = mutation({
  args: { accountId: v.id("media_kit_accounts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const account = await ownAccount(ctx, args.accountId);
    await ctx.db.patch(account.kit_id, { primary_account_id: account._id });
    return null;
  },
});

export const claimRun = internalMutation({
  args: { importId: v.id("media_kit_imports"), generation: v.string() },
  returns: v.union(v.boolean(), v.null()),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.importId);
    const account = job && (await ctx.db.get(job.account_id));
    if (
      !job ||
      !account ||
      job.generation !== args.generation ||
      account.current_import_id !== job._id ||
      job.status !== "queued"
    )
      return null;
    if (Date.now() - job.started_at >= 600000) {
      await ctx.db.patch(job._id, {
        status: "failed",
        finished_at: Date.now(),
        error_message: "Import expired. Please refresh again.",
      });
      await ctx.db.patch(account._id, { current_import_id: undefined });
      return null;
    }
    const kit = await ctx.db.get(account.kit_id);
    const creator = kit && (await ctx.db.get(kit.creator_id));
    if (!creator || creator.is_deleted) {
      await ctx.db.patch(job._id, {
        status: "aborted",
        finished_at: Date.now(),
      });
      await ctx.db.patch(account._id, { current_import_id: undefined });
      return null;
    }
    const active = await ctx.db
      .query("media_kit_imports")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .take(3);
    for (const old of active)
      if (Date.now() - old.started_at >= 600000) {
        await ctx.db.patch(old._id, {
          status: "failed",
          finished_at: Date.now(),
          error_message: "Import timed out.",
        });
        if (old.apify_run_id)
          await ctx.scheduler.runAfter(0, internal.mediaKitActions.abortRun, {
            runId: old.apify_run_id,
          });
      }
    if (active.filter((j) => Date.now() - j.started_at < 600000).length >= 3)
      return false;
    await ctx.db.patch(job._id, { status: "running" });
    return true;
  },
});

export const setProfilePhoto = internalMutation({
  args: { storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, { storageId }) => {
    const kit = await ownKit(ctx);
    if (!kit) throw Error("Media kit unavailable.");
    const previous = kit.photo_storage_id;
    await ctx.db.patch(kit._id, {
      photo_storage_id: storageId,
      updated_at: Date.now(),
    });
    if (previous && previous !== storageId) await ctx.storage.delete(previous);
    return null;
  },
});
