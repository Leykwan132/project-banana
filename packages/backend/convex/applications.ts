import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { CampaignStatus, ApplicationStatus, UserCampaignStatus } from "./constants";
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
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
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
                    campaignCoverPhotoUrl: campaign?.cover_photo_url ?? campaign?.logo_url,
                    campaignLogoUrl: campaign?.logo_url,
                    campaignLogoS3Key: campaign?.logo_s3_key,
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


        // TODO: fix this, it should query top posts by all users correctly.
        const results = await Promise.all(
            topStatuses.map(async (status) => {
                // Fetch the application to get the post URL
                const application = await ctx.db
                    .query("applications")
                    .withIndex("by_user_campaign", (q) => q.eq("user_id", status.user_id).eq("campaign_id", args.campaignId))
                    .first();

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

export const getNonEarningApplicationByCampaignId = query({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) return null;

        return await ctx.db
            .query("applications")
            .withIndex("by_user_campaign", (q) =>
                q.eq("user_id", user.subject).eq("campaign_id", args.campaignId)
            )
            .filter((q) => q.neq(q.field("status"), ApplicationStatus.Earning))
            .first();
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
                q.eq("user_id", user.subject).eq("campaign_id", args.campaignId)
            )
            .order("desc")
            .collect();

        return applications.map((application, index) => ({
            ...application,
            title: `Application ${applications.length - index}`,
            views: application.views ?? 0,
            likes: application.likes ?? 0,
            comments: application.comments ?? 0,
            shares: application.shares ?? 0,
            earnings: application.earnings ?? 0,
        }));
    },
});

export const getApplicationsForEarningCheck = internalQuery({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        console.log('querying applications for earning check...');
        // Find users/campaigns that are actively earning with pagination
        const earningStatusesResult = await ctx.db
            .query("user_campaign_status")
            .withIndex("by_status", (q) => q.eq("status", UserCampaignStatus.Earning))
            .paginate(args.paginationOpts);
        console.log('earningStatusesResult: ', earningStatusesResult);
        const applications = [];

        for (const status of earningStatusesResult.page) {
            // Find application for this user and campaign

            const apps = await ctx.db
                .query("applications")
                .withIndex("by_user_campaign", (q) => q.eq("user_id", status.user_id).eq("campaign_id", status.campaign_id)).collect();


            const campaign = await ctx.db.get(status.campaign_id);

            if (!campaign) continue;

            const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
            const now = Date.now();

            const isActive = campaign.status === CampaignStatus.Active || campaign.status === CampaignStatus.Paused;
            const isCancelledWithinGracePeriod = campaign.status === CampaignStatus.Cancelled
                && campaign.cancelled_at != null
                && (now - campaign.cancelled_at) <= SEVEN_DAYS_MS;

            if (apps && (isActive || isCancelledWithinGracePeriod)) {
                for (const app of apps) {
                    if (app.status === ApplicationStatus.Earning) {
                        applications.push({
                            ...app,
                            campaignStatusId: status._id,
                            userCampaignMaxPayout: status.maximum_payout,
                            currentEarnings: status.total_earnings
                        });
                    }
                }
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
        const user = await ctx.auth.getUserIdentity();
        if (!user) throw new Error("Unauthenticated");

        const now = Date.now();
        // Generate a random 6-character string for the tracking tag
        const randomTag = Math.random().toString(36).substring(2, 8).toUpperCase();
        const trackingTag = `UGCO${randomTag}`;

        const applicationId = await ctx.db.insert("applications", {
            user_id: user.subject,
            campaign_id: args.campaignId,
            status: ApplicationStatus.PendingSubmission,
            tracking_tag: trackingTag,
            views: 0,
            likes: 0,
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
            posted_at: args.status === ApplicationStatus.Earning ? Date.now() : undefined,
            ig_post_url: args.ig_post_url,
            tiktok_post_url: args.tiktok_post_url,
        });
    }
});

// ============================================================
// INTERNAL MUTATIONS (for cron jobs)
// ============================================================

/**
 * Calculate earning based on cumulative threshold logic.
 * Each threshold can be counted multiple times based on views.
 * Processes thresholds from largest to smallest (greedy algorithm).
 */
function calculateEarning(
    views: number,
    thresholds: Array<{ views: number; payout: number }>,
    maximumPayout: number
): number {
    // Sort thresholds by views descending (greedy: use largest first)
    const sorted = [...thresholds].sort((a, b) => b.views - a.views);

    let remainingViews = views;
    let totalEarning = 0;

    for (const threshold of sorted) {
        if (remainingViews >= threshold.views) {
            // How many times does this threshold fit?
            const count = Math.floor(remainingViews / threshold.views);
            totalEarning += count * threshold.payout;
            remainingViews -= count * threshold.views;
        }
    }

    // Cap at maximum payout
    return Math.min(totalEarning, maximumPayout);
}

export const updateApplicationEarning = internalMutation({
    args: {
        applicationId: v.id("applications"),
        campaignId: v.id("campaigns"),
        userCampaignStatusId: v.id("user_campaign_status"),
        views: v.number(),
        likes: v.number(),
        comments: v.number(),
        shares: v.number(),
    },
    handler: async (ctx, args) => {
        const now = Date.now();

        // 1. Get current application to compute deltas
        const application = await ctx.db.get(args.applicationId);
        if (!application) return;

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) return;

        const previousAppEarnings = application.earnings ?? 0;
        const previousViews = application.views ?? 0;
        const previousLikes = application.likes ?? 0;
        const previousComments = application.comments ?? 0;
        const previousShares = application.shares ?? 0;

        const viewsDelta = Math.max(0, args.views - previousViews);
        const likesDelta = Math.max(0, args.likes - previousLikes);
        const commentsDelta = Math.max(0, args.comments - previousComments);
        const sharesDelta = Math.max(0, args.shares - previousShares);

        // 2. Get current user campaign record to compute new accumulated values
        const userCampaign = await ctx.db.get(args.userCampaignStatusId);
        if (!userCampaign) return;

        // Early exit: user already maxed out — stats still update but earnings are capped at maximum_payout
        if (userCampaign.status === UserCampaignStatus.MaxedOut) {
            await ctx.db.patch(args.applicationId, {
                views: args.views,
                likes: args.likes,
                comments: args.comments,
                shares: args.shares,
                earnings: userCampaign.maximum_payout,
                updated_at: now,
            });
            // No new earnings delta since already maxed; still propagate stat deltas.
            return {
                viewsDelta,
                likesDelta,
                commentsDelta,
                sharesDelta,
                earningsDelta: 0,
            };
        }

        const newCampaignViews = (userCampaign.views || 0) + viewsDelta;
        const newCampaignLikes = (userCampaign.likes || 0) + likesDelta;
        const newCampaignComments = (userCampaign.comments || 0) + commentsDelta;
        const newCampaignShares = (userCampaign.shares || 0) + sharesDelta;

        // 3. Get campaign and evaluate new earnings based on this application's own scraped views
        // This value has been capped by maximum payout.
        const newApplicationEarnings = calculateEarning(
            args.views,
            campaign.payout_thresholds,
            userCampaign.maximum_payout
        );

        const earningDelta = Math.max(0, newApplicationEarnings - previousAppEarnings);

        // 4. Update application's own stats (for fast rendering/caching)
        await ctx.db.patch(args.applicationId, {
            views: args.views,
            likes: args.likes,
            comments: args.comments,
            shares: args.shares,
            earnings: newApplicationEarnings,
            updated_at: now,
        });

        // 5. Update user_campaign_status with latest accumulated stats
        const userCampaignPatch: Record<string, any> = {
            views: newCampaignViews,
            likes: newCampaignLikes,
            comments: newCampaignComments,
            shares: newCampaignShares,
            updated_at: now,
        };

        const remainingBudget = campaign.total_budget - campaign.budget_claimed;

        // Cap the delta to available budget - never exceed total_budget
        const cappedDelta = Math.min(earningDelta, remainingBudget);

        // Case 1: No budget left or no new earning
        if (cappedDelta <= 0) {
            // Still update stats even if no budget left or no new earning
            await ctx.db.patch(args.userCampaignStatusId, userCampaignPatch);

            // Update creator + business totals (views/likes/comments/shares only — delta)
            if (viewsDelta > 0 || likesDelta > 0 || commentsDelta > 0 || sharesDelta > 0) {
                const creator = await ctx.db
                    .query("creators")
                    .withIndex("by_user", (q) => q.eq("user_id", application.user_id))
                    .unique();
                if (creator) {
                    await ctx.db.patch(creator._id, {
                        total_views: (creator.total_views ?? 0) + viewsDelta,
                    });
                }

                // Increment business high-level stats by delta only
                const business = await ctx.db.get(campaign.business_id);
                if (business) {
                    await ctx.db.patch(campaign.business_id, {
                        total_views: (business.total_views ?? 0) + viewsDelta,
                        total_likes: (business.total_likes ?? 0) + likesDelta,
                        total_comments: (business.total_comments ?? 0) + commentsDelta,
                        total_shares: (business.total_shares ?? 0) + sharesDelta,
                        updated_at: now,
                    });
                }
            }
            // Daily analytics expects deltas, not cumulative totals.
            return {
                viewsDelta,
                likesDelta,
                commentsDelta,
                sharesDelta,
                earningsDelta: 0,
            };
        }

        // Case 2: Budget left and new earning
        // 6. Update campaign budget_claimed
        const newBudgetClaimed = campaign.budget_claimed + cappedDelta;
        const campaignPatch: Record<string, any> = {
            budget_claimed: newBudgetClaimed,
        };

        // 6b. Mark campaign as completed if budget is fully claimed
        if (newBudgetClaimed >= campaign.total_budget) {
            campaignPatch.status = CampaignStatus.Completed;
        }

        await ctx.db.patch(args.campaignId, campaignPatch);

        // 7. Update user_campaign_status with earnings + stats
        const newCampaignEarnings = userCampaign.total_earnings + cappedDelta;
        const isNowMaxedOut = newCampaignEarnings >= userCampaign.maximum_payout;

        await ctx.db.patch(args.userCampaignStatusId, {
            ...userCampaignPatch,
            total_earnings: newCampaignEarnings,
            status: isNowMaxedOut ? UserCampaignStatus.MaxedOut : userCampaign.status,
        });

        // 8. Update creator totals (views + earnings)
        const creator = await ctx.db
            .query("creators")
            .withIndex("by_user", (q) => q.eq("user_id", application.user_id))
            .unique();
        if (creator) {
            await ctx.db.patch(creator._id, {
                total_views: (creator.total_views ?? 0) + viewsDelta,
                total_earnings: (creator.total_earnings ?? 0) + cappedDelta,
                balance: (creator.balance ?? 0) + cappedDelta,
            });
        }

        // 9. Increment business high-level stats by delta only (views + earnings)
        const business = await ctx.db.get(campaign.business_id);
        if (business) {
            await ctx.db.patch(campaign.business_id, {
                total_views: (business.total_views ?? 0) + viewsDelta,
                total_likes: (business.total_likes ?? 0) + likesDelta,
                total_comments: (business.total_comments ?? 0) + commentsDelta,
                total_shares: (business.total_shares ?? 0) + sharesDelta,
                updated_at: now,
            });
        }

        return {
            viewsDelta,
            likesDelta,
            commentsDelta,
            sharesDelta,
            earningsDelta: cappedDelta,
        };
    },
});
