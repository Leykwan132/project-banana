import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

// ============================================================
// QUERIES
// ============================================================

export const getMyApplications = query({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return { page: [], isDone: true, continueCursor: "" };

        const user = await ctx.db
            .query("users")
            .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
            .unique();

        if (!user) return { page: [], isDone: true, continueCursor: "" };

        return await ctx.db
            .query("applications")
            .withIndex("by_user", (q) => q.eq("user_id", user._id))
            .order("desc")
            .paginate(args.paginationOpts);
    },
});

export const getApplication = query({
    args: { applicationId: v.id("applications") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.applicationId);
    }
});

export const getAllActiveApplications = internalQuery({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("applications")
            .withIndex("by_status", (q) => q.eq("status", "earning"))
            .collect();
    },
});

// ============================================================
// MUTATIONS
// ============================================================

export const createApplication = mutation({
    args: {
        campaignId: v.id("campaigns"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");

        // Check if already applied
        const existing = await ctx.db
            .query("applications")
            .withIndex("by_user_campaign", (q) => q.eq("user_id", user._id).eq("campaign_id", args.campaignId))
            .unique();

        if (existing) throw new Error("Already applied to this campaign");

        const now = Date.now();
        const applicationId = await ctx.db.insert("applications", {
            user_id: user._id,
            campaign_id: args.campaignId,
            status: "pending_submission",
            created_at: now,
            updated_at: now,
            earning: 0,
        });

        return applicationId;
    },
});

export const updateApplicationStatus = mutation({
    args: {
        applicationId: v.id("applications"),
        status: v.string(), // e.g. "ready_to_post", "earning"
        // Optional fields to update
        ig_post_url: v.optional(v.string()),
        tiktok_post_url: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to mutation");
        }

        // Validation logic can be added here

        await ctx.db.patch(args.applicationId, {
            status: args.status,
            ig_post_url: args.ig_post_url,
            tiktok_post_url: args.tiktok_post_url,
            updated_at: Date.now(),
        });
    }
});
