"use node";
import { ApifyClient } from "apify-client";
import { action, internalAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { cacheInstagramImage } from "./lib/mediaKitImages";
import { normalizeProfile, normalizeTikTokProfile } from "./lib/mediaKitModel";
const jobArgs = { importId: v.id("media_kit_imports"), generation: v.string() };
function client() {
  if (!process.env.APIFY_API_TOKEN)
    throw Error("Account import is not configured.");
  return new ApifyClient({ token: process.env.APIFY_API_TOKEN, maxRetries: 0 });
}
export const startImport = internalAction({
  args: jobArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    const current = await ctx.runQuery(internal.mediaKits.getJob, args);
    if (!current?.active) return null;
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
    let startedRunId: string | undefined;
    try {
      const configured = Number(process.env.MEDIA_KIT_MAX_CHARGE_USD ?? "0.05");
      if (!Number.isFinite(configured) || configured <= 0 || configured > 1)
        throw Error("Invalid import budget.");
      const apify = client();
      const run = await apify
        .actor(
          current.account.platform === "tiktok"
            ? "clockworks/tiktok-scraper"
            : "apify/instagram-profile-scraper",
        )
        .start(
          current.account.platform === "tiktok"
            ? {
                profiles: [current.account.handle],
                resultsPerPage: 12,
                profileScrapeSections: ["videos"],
                profileSorting: "latest",
                excludePinnedPosts: true,
                maxFollowersPerProfile: 0,
                maxFollowingPerProfile: 0,
              }
            : { usernames: [current.account.handle] },
          { timeout: 600, maxTotalChargeUsd: configured },
        );
      startedRunId = run.id;
      const accepted = await ctx.runMutation(internal.mediaKits.beginRun, {
        ...args,
        runId: run.id,
      });
      if (!accepted) {
        await apify.run(run.id).abort();
        return null;
      }
      await ctx.scheduler.runAfter(15000, internal.mediaKitActions.pollImport, {
        ...args,
        runId: run.id,
        attempt: 0,
      });
    } catch {
      if (startedRunId) {
        try {
          await client().run(startedRunId).abort();
        } catch {}
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
    const key = { importId: args.importId, generation: args.generation };
    const state = await ctx.runQuery(internal.mediaKits.getJob, key);
    let apify: ApifyClient;
    try {
      apify = client();
    } catch {
      await ctx.runMutation(internal.mediaKits.finishImport, {
        ...key,
        error: "Account import is not configured.",
      });
      return null;
    }
    if (!state?.active) {
      try {
        await apify.run(args.runId).abort();
      } catch {}
      return null;
    }
    let completed = false;
    const cached: Id<"_storage">[] = [];
    try {
      if (Date.now() - state.job.started_at >= 600000) {
        completed = true;
        await apify.run(args.runId).abort();
        throw Error("Timed out");
      }
      const run = await apify.run(args.runId).get();
      if (!run) throw Error("Missing run");
      if (run.status === "SUCCEEDED") {
        completed = true;
        const data = await apify
          .dataset(run.defaultDatasetId)
          .listItems({ limit: state.account.platform === "tiktok" ? 12 : 1 });
        const profile =
          state.account.platform === "tiktok"
            ? normalizeTikTokProfile(data.items, state.account.handle)
            : normalizeProfile(data.items[0], state.account.handle);
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
        if (!accepted) for (const id of cached) await ctx.storage.delete(id);
        return null;
      }
      if (["FAILED", "ABORTED", "TIMED-OUT"].includes(run.status)) {
        completed = true;
        throw Error("Run failed");
      }
      if (Date.now() - state.job.started_at >= 600000) {
        completed = true;
        await apify.run(args.runId).abort();
        throw Error("Timed out");
      }
    } catch {
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
      await client().run(args.runId).abort();
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
