import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
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

export const getApplicationsForEarningCheck = internalQuery({
    args: {
        cursor: v.optional(v.string()),
        numItems: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.numItems ?? 50; // Default batch size

        // Find users/campaigns that are actively earning with pagination
        const earningStatusesResult = await ctx.db
            .query("user_campaign_status")
            .withIndex("by_status", (q) => q.eq("status", "earning"))
            .paginate({ cursor: args.cursor ?? null, numItems: limit });

        const applications = [];

        for (const status of earningStatusesResult.page) {
            // Find application for this user and campaign
            const app = await ctx.db
                .query("applications")
                .withIndex("by_user_campaign", (q) => q.eq("user_id", status.user_id).eq("campaign_id", status.campaign_id))
                .unique();

            if (app) {
                applications.push({
                    ...app,
                    campaignStatusId: status._id,
                    userCampaignMaxPayout: status.maximum_payout,
                    currentEarnings: status.total_earnings
                });
            }
        }

        return {
            page: applications,
            continueCursor: earningStatusesResult.continueCursor,
            isDone: earningStatusesResult.isDone,
        };
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

// ============================================================
// INTERNAL MUTATIONS (for cron jobs)
// ============================================================

export const updateApplicationEarning = internalMutation({
    args: {
        applicationId: v.id("applications"),
        campaignId: v.id("campaigns"),
        userCampaignStatusId: v.id("user_campaign_status"),
        newEarning: v.number(),
        userCampaignMaxPayout: v.number(),
    },
    handler: async (ctx, args) => {
        // 1. Get current application earning
        const app = await ctx.db.get(args.applicationId);
        const existingEarning = app?.earning ?? 0;

        // 2. Calculate delta (only positive deltas to prevent rollback)
        const earningDelta = Math.max(0, args.newEarning - existingEarning);

        if (earningDelta === 0) return; // No change needed

        // 3. Get campaign and check budget availability
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) return; // Campaign not found

        const remainingBudget = campaign.total_budget - campaign.budget_claimed;

        // Cap the delta to available budget - never exceed total_budget
        const cappedDelta = Math.min(earningDelta, remainingBudget);

        if (cappedDelta <= 0) return; // No budget left

        // Calculate the actual new earning based on capped delta
        const actualNewEarning = existingEarning + cappedDelta;

        // 4. Update application earning (with capped amount)
        await ctx.db.patch(args.applicationId, {
            earning: actualNewEarning,
            updated_at: Date.now(),
        });

        // 5. Update campaign budget_claimed
        await ctx.db.patch(args.campaignId, {
            budget_claimed: campaign.budget_claimed + cappedDelta,
            updated_at: Date.now(),
        });

        // 6. Update user_campaign_status
        const status = await ctx.db.get(args.userCampaignStatusId);
        if (status) {
            const newTotalEarnings = status.total_earnings + cappedDelta;
            const newStatus = newTotalEarnings >= args.userCampaignMaxPayout
                ? "maxed_out"
                : status.status;

            await ctx.db.patch(args.userCampaignStatusId, {
                total_earnings: newTotalEarnings,
                status: newStatus,
                updated_at: Date.now(),
            });
        }
    },
});
