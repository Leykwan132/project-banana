import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { authComponent } from "./auth";
// ============================================================
// QUERIES
// ============================================================

export const getMyApplications = query({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) return { page: [], isDone: true, continueCursor: "" };

        const applications = await ctx.db
            .query("applications")
            .withIndex("by_user", (q) => q.eq("user_id", String(user._id)))
            .order("desc")
            .paginate(args.paginationOpts);

        const pageWithDetails = await Promise.all(
            applications.page.map(async (app) => {
                const campaign = await ctx.db.get(app.campaign_id);
                let businessName = campaign?.business_name;

                // Fallback to fetching business if name not denormalized
                if (!businessName && campaign?.business_id) {
                    const business = await ctx.db.get(campaign.business_id);
                    businessName = business?.name;
                }

                return {
                    ...app,
                    campaignName: campaign?.name,
                    businessName,
                    campaignCoverPhotoUrl: campaign?.cover_photo_url,
                };
            })
        );

        return {
            ...applications,
            page: pageWithDetails
        };
    },
});

export const getTopApplicationsByCampaign = query({
    args: {
        campaignId: v.id("campaigns"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 3;

        // 1. Fetch top earning statuses for the campaign efficiently using the index
        const topStatuses = await ctx.db
            .query("user_campaign_status")
            .withIndex("by_campaign_earnings", (q) => q.eq("campaign_id", args.campaignId))
            .order("desc")
            .take(limit);

        // 2. Fetch user details in parallel
        // 3. Enhance with application details
        const results = await Promise.all(
            topStatuses.map(async (status) => {
                // Fetch the application to get the post URL
                const application = await ctx.db
                    .query("applications")
                    .withIndex("by_user_campaign", (q) => q.eq("user_id", status.user_id).eq("campaign_id", args.campaignId))
                    .unique();

                return {
                    id: status._id, // Using status ID as unique key for list
                    name: "Unknown Creator",
                    views: "1.5M", // Placeholder/Mock for now
                    amount: `Rm ${(status.total_earnings || 0).toLocaleString()}`,
                    logoUrl: undefined,
                    postUrl: application?.ig_post_url || application?.tiktok_post_url,
                };
            })
        );

        return results;
    },
});

export const getApplication = query({
    args: { applicationId: v.id("applications") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.applicationId);
    }
});

export const getApplicationByCampaignId = query({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) return null;

        return await ctx.db
            .query("applications")
            .withIndex("by_user_campaign", (q) =>
                q.eq("user_id", String(user._id)).eq("campaign_id", args.campaignId)
            )
            .unique();
    },
});

export const getMyApplicationsByCampaignWithStats = query({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) return [];

        const applications = await ctx.db
            .query("applications")
            .withIndex("by_user_campaign", (q) =>
                q.eq("user_id", String(user._id)).eq("campaign_id", args.campaignId)
            )
            .order("desc")
            .collect();

        return applications.map((application, index) => ({
            ...application,
            title: `Application ${applications.length - index}`,
            views: application.views ?? 0,
            likes: application.likes ?? 0,
            saves: application.saves ?? 0,
            comments: application.comments ?? 0,
            shares: application.shares ?? 0,
            earnings: application.earnings ?? 0,
        }));
    },
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
        const user = await authComponent.getAuthUser(ctx);
        if (!user) throw new Error("Unauthenticated");

        const now = Date.now();
        // Generate a random 6-character string for the tracking tag
        const randomTag = Math.random().toString(36).substring(2, 8).toUpperCase();
        const trackingTag = `UGCO${randomTag}`;

        const applicationId = await ctx.db.insert("applications", {
            user_id: user._id,
            campaign_id: args.campaignId,
            status: "pending_submission",
            tracking_tag: trackingTag,
            views: 0,
            likes: 0,
            saves: 0,
            comments: 0,
            shares: 0,
            earnings: 0,
            created_at: now,
            updated_at: now,
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
        views: v.number(),
        likes: v.number(),
        comments: v.number(),
        shares: v.number(),
    },
    handler: async (ctx, args) => {
        // 1. Get current status to know existing earning
        const status = await ctx.db.get(args.userCampaignStatusId);
        if (!status) return;

        const existingEarning = status.total_earnings;

        // 2. Calculate delta (only positive deltas to prevent rollback)
        const earningDelta = Math.max(0, args.newEarning - existingEarning);

        // Keep per-application high-level stats cached for quick list rendering.
        await ctx.db.patch(args.applicationId, {
            views: args.views,
            likes: args.likes,
            comments: args.comments,
            shares: args.shares,
            earnings: args.newEarning,
            updated_at: Date.now(),
        });

        if (earningDelta === 0) return; // No earning delta to apply

        // 3. Get campaign and check budget availability
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) return; // Campaign not found

        const remainingBudget = campaign.total_budget - campaign.budget_claimed;

        // Cap the delta to available budget - never exceed total_budget
        const cappedDelta = Math.min(earningDelta, remainingBudget);

        if (cappedDelta <= 0) return; // No budget left

        // 4. Update campaign budget_claimed
        await ctx.db.patch(args.campaignId, {
            budget_claimed: campaign.budget_claimed + cappedDelta,
            updated_at: Date.now(),
        });

        // 5. Update user_campaign_status
        const newTotalEarnings = status.total_earnings + cappedDelta;
        const newStatus = newTotalEarnings >= args.userCampaignMaxPayout
            ? "maxed_out"
            : status.status;

        await ctx.db.patch(args.userCampaignStatusId, {
            total_earnings: newTotalEarnings,
            status: newStatus,
            updated_at: Date.now(),
        });
    },
});
