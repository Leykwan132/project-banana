"use node";
import { action, internalAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { cacheInstagramImage } from "./lib/mediaKitImages";
import { normalizeProfile, normalizeTikTokProfile } from "./lib/mediaKitModel";
const jobArgs = { importId: v.id("media_kit_imports"), generation: v.string() };
type ApifyRun = { id: string; status: string; defaultDatasetId: string };
function apiToken() {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw Error("Account import is not configured.");
  return token;
}
async function apifyRequest<T>(path: string, method = "GET", input?: unknown): Promise<T> {
  const response = await fetch(`https://api.apify.com/v2/${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiToken()}`, "Content-Type": "application/json" },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    signal: AbortSignal.timeout(30000),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw Object.assign(new Error(payload.error?.message ?? `Apify request failed (HTTP ${response.status})`), {
      statusCode: response.status,
      type: payload.error?.type,
    });
  }
  return payload as T;
}
async function abortApifyRun(runId: string) {
  await apifyRequest(`actor-runs/${encodeURIComponent(runId)}/abort`, "POST");
}
function importError(error: unknown) {
  const record = error as { name?: string; message?: string; statusCode?: number; type?: string } | null;
  let message = record?.message ?? String(error);
  const token = process.env.APIFY_API_TOKEN;
  if (token) message = message.split(token).join("[redacted]");
  message = message.replace(/https?:\/\/[^\s]+/g, "[URL redacted]");
  return { name: record?.name, message: message.slice(0, 2000), statusCode: record?.statusCode, type: record?.type };
}
export const startImport = internalAction({
  args: jobArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    console.info("[Media kit import] Starting job", { importId: args.importId });
    const current = await ctx.runQuery(internal.mediaKits.getJob, args);
    if (!current?.active) {
      console.info("[Media kit import] Skipped inactive job", { importId: args.importId });
      return null;
    }
    const lease = await ctx.runMutation(internal.mediaKits.claimRun, args);
    if (lease === null) return null;
    if (!lease) {
      await ctx.scheduler.runAfter(
        15000,
        internal.mediaKitActions.startImport,
        args,
      );
      return null;
    }
    console.info("[Media kit import] Lease result", { importId: args.importId, acquired: lease });
    let stage = "configuration";
    let startedRunId: string | undefined;
    try {
      const configured = Number(process.env.MEDIA_KIT_MAX_CHARGE_USD ?? "0.05");
      if (!Number.isFinite(configured) || configured <= 0 || configured > 1)
        throw Error("Invalid import budget.");
      console.info("[Media kit import] Configuration", { importId: args.importId, tokenConfigured: Boolean(process.env.APIFY_API_TOKEN), maxTotalChargeUsd: configured, platform: current.account.platform });
      apiToken();
      stage = "actor.start";
      console.info("[Media kit import] Starting Apify actor", { importId: args.importId, actor: current.account.platform === "tiktok" ? "clockworks/tiktok-scraper" : "apify/instagram-profile-scraper" });
      const actor = current.account.platform === "tiktok"
        ? "clockworks~tiktok-scraper" : "apify~instagram-profile-scraper";
      const input = current.account.platform === "tiktok"
        ? {
            profiles: [current.account.handle], resultsPerPage: 12,
            profileScrapeSections: ["videos"], profileSorting: "latest",
            excludePinnedPosts: true, maxFollowersPerProfile: 0, maxFollowingPerProfile: 0,
          }
        : { usernames: [current.account.handle] };
      const { data: run } = await apifyRequest<{ data: ApifyRun }>(
        `actors/${actor}/runs?timeout=600&maxTotalChargeUsd=${configured}`, "POST", input,
      );
      startedRunId = run.id;
      console.info("[Media kit import] Apify run started", { importId: args.importId, runId: run.id, status: run.status });
      stage = "beginRun";
      const accepted = await ctx.runMutation(internal.mediaKits.beginRun, {
        ...args,
        runId: run.id,
      });
      console.info("[Media kit import] Run registration", { importId: args.importId, runId: run.id, accepted });
      if (!accepted) {
        await abortApifyRun(run.id);
        return null;
      }
      stage = "schedule polling";
      await ctx.scheduler.runAfter(15000, internal.mediaKitActions.pollImport, {
        ...args,
        runId: run.id,
        attempt: 0,
      });
      console.info("[Media kit import] Poll scheduled", { importId: args.importId, runId: run.id });
    } catch (error) {
      console.error("[Media kit import] Start failed", { importId: args.importId, runId: startedRunId, stage, error: importError(error) });
      if (startedRunId) {
        try {
          await abortApifyRun(startedRunId);
        } catch (error) {
          console.warn("[Media kit import] Abort cleanup failed", { runId: startedRunId, error: importError(error) });
        }
      }
      await ctx.runMutation(internal.mediaKits.finishImport, {
        ...args,
        error:
          "Account import could not start. Check the service configuration or try again later.",
      });
    }
    return null;
  },
});
export const pollImport = internalAction({
  args: { ...jobArgs, runId: v.string(), attempt: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.info("[Media kit import] Polling", { importId: args.importId, runId: args.runId, attempt: args.attempt });
    const key = { importId: args.importId, generation: args.generation };
    const state = await ctx.runQuery(internal.mediaKits.getJob, key);
    try {
      apiToken();
    } catch {
      await ctx.runMutation(internal.mediaKits.finishImport, {
        ...key,
        error: "Account import is not configured.",
      });
      return null;
    }
    if (!state?.active) {
      try {
        await abortApifyRun(args.runId);
      } catch {}
      return null;
    }
    let completed = false;
    const cached: Id<"_storage">[] = [];
    try {
      if (Date.now() - state.job.started_at >= 600000) {
        completed = true;
        await abortApifyRun(args.runId);
        throw Error("Timed out");
      }
      const { data: run } = await apifyRequest<{ data: ApifyRun }>(`actor-runs/${encodeURIComponent(args.runId)}`);
      if (!run) throw Error("Missing run");
      console.info("[Media kit import] Run status", { importId: args.importId, runId: args.runId, status: run.status });
      if (run.status === "SUCCEEDED") {
        completed = true;
        const items = await apifyRequest<Record<string, unknown>[]>(
          `datasets/${encodeURIComponent(run.defaultDatasetId)}/items?format=json&limit=${state.account.platform === "tiktok" ? 12 : 1}`,
        );
        console.info("[Media kit import] Dataset fetched", { importId: args.importId, runId: args.runId, itemCount: items.length });
        const profile =
          state.account.platform === "tiktok"
            ? normalizeTikTokProfile(items, state.account.handle)
            : normalizeProfile(items[0], state.account.handle);
        const avatarStorageId = await cacheInstagramImage(
          ctx,
          profile.profileImageUrl,
        );
        if (avatarStorageId) cached.push(avatarStorageId);
        const posts = [];
        for (const post of profile.posts.slice(0, 6)) {
          const imageStorageId = await cacheInstagramImage(ctx, post.imageUrl);
          if (imageStorageId) cached.push(imageStorageId);
          const { imageUrl: _url, imageStorageId: _old, ...fields } = post;
          posts.push({
            ...fields,
            ...(imageStorageId ? { imageStorageId } : {}),
          });
        }
        const {
          profileImageUrl: _profile,
          avatarStorageId: _avatar,
          posts: _posts,
          ...fields
        } = profile;
        const accepted = await ctx.runMutation(
          internal.mediaKits.finishImport,
          {
            ...key,
            snapshot: {
              ...fields,
              posts,
              ...(avatarStorageId ? { avatarStorageId } : {}),
            },
          },
        );
        console.info("[Media kit import] Snapshot saved", { importId: args.importId, runId: args.runId, accepted });
        if (!accepted) for (const id of cached) await ctx.storage.delete(id);
        return null;
      }
      if (["FAILED", "ABORTED", "TIMED-OUT"].includes(run.status)) {
        completed = true;
        throw Error("Run failed");
      }
      if (Date.now() - state.job.started_at >= 600000) {
        completed = true;
        await abortApifyRun(args.runId);
        throw Error("Timed out");
      }
    } catch (error) {
      console.error("[Media kit import] Poll failed", { importId: args.importId, runId: args.runId, attempt: args.attempt, completed, error: importError(error) });
      for (const id of cached) {
        try {
          await ctx.storage.delete(id);
        } catch {}
      }
      if (completed || Date.now() - state.job.started_at >= 600000) {
        await ctx.runMutation(internal.mediaKits.finishImport, {
          ...key,
          error:
            "Account data could not be refreshed. Your last successful data is still available.",
        });
        return null;
      }
    }
    await ctx.scheduler.runAfter(15000, internal.mediaKitActions.pollImport, {
      ...args,
      attempt: args.attempt + 1,
    });
    return null;
  },
});
export const refreshDaily = internalAction({
  args: { cursor: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const batch = await ctx.runQuery(internal.mediaKits.listAccounts, {
      paginationOpts: { numItems: 100, cursor: args.cursor ?? null },
    });
    for (const account of batch.page) {
      try {
        await ctx.runMutation(internal.mediaKits.enqueueDaily, {
          accountId: account._id,
        });
      } catch {
        console.warn("Media kit refresh enqueue failed", account._id);
      }
    }
    if (!batch.isDone)
      await ctx.scheduler.runAfter(0, internal.mediaKitActions.refreshDaily, {
        cursor: batch.continueCursor,
      });
    return null;
  },
});

export const abortRun = internalAction({
  args: { runId: v.string() },
  returns: v.null(),
  handler: async (_ctx, args) => {
    try {
      await abortApifyRun(args.runId);
    } catch {}
    return null;
  },
});

export const uploadProfilePhoto = action({
  args: { bytes: v.bytes() },
  returns: v.null(),
  handler: async (ctx, { bytes }) => {
    const editor = await ctx.runQuery(api.mediaKits.getEditor, {});
    if (!editor.kit)
      throw Error("Add an account before uploading a profile image.");
    if (bytes.byteLength === 0 || bytes.byteLength > 2 * 1024 * 1024)
      throw Error("Choose an image smaller than 2 MB.");
    const data = Buffer.from(bytes);
    const type = data
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? "image/png"
      : data[0] === 255 && data[1] === 216 && data[2] === 255
        ? "image/jpeg"
        : data.toString("ascii", 0, 4) === "RIFF" &&
            data.toString("ascii", 8, 12) === "WEBP"
          ? "image/webp"
          : null;
    if (!type) throw Error("Choose a JPG, PNG, or WebP image.");
    const storageId = await ctx.storage.store(new Blob([bytes], { type }));
    try {
      await ctx.runMutation(internal.mediaKits.setProfilePhoto, { storageId });
    } catch (error) {
      await ctx.storage.delete(storageId);
      throw error;
    }
    return null;
  },
});

export const uploadBrandLogo = action({
  args: { bytes: v.bytes() },
  returns: v.string(),
  handler: async (ctx, { bytes }) => {
    const editor = await ctx.runQuery(api.mediaKits.getEditor, {});
    if (!editor.kit)
      throw Error("Add an account before uploading a brand logo.");
    if (bytes.byteLength === 0 || bytes.byteLength > 2 * 1024 * 1024)
      throw Error("Choose an image smaller than 2 MB.");
    const data = Buffer.from(bytes);
    const type = data
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? "image/png"
      : data[0] === 255 && data[1] === 216 && data[2] === 255
        ? "image/jpeg"
        : data.toString("ascii", 0, 4) === "RIFF" &&
            data.toString("ascii", 8, 12) === "WEBP"
          ? "image/webp"
          : null;
    if (!type) throw Error("Choose a JPG, PNG, or WebP image.");
    const storageId = await ctx.storage.store(new Blob([bytes], { type }));
    const url = await ctx.storage.getUrl(storageId);
    if (!url) {
      await ctx.storage.delete(storageId);
      throw Error("Could not upload the brand logo.");
    }
    return url;
  },
});
