import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { CampaignStatus, ApplicationStatus, UserCampaignStatus } from "./constants";
import { TableAggregate } from "@convex-dev/aggregate";
import type { DataModel } from "./_generated/dataModel";
import { components } from "./_generated/api";
import { Triggers } from "convex-helpers/server/triggers";
import { customCtx, customMutation } from "convex-helpers/server/customFunctions";
import { ConvexError } from "convex/values";
import { ERROR_CODES } from "./errors";

const platformMissingDescriptionValidator = v.object({
    trackingTagMissing: v.boolean(),
    missingHashtags: v.array(v.string()),
    missingMentions: v.array(v.string()),
    reuploadRequired: v.optional(v.boolean()),
    reuploadReason: v.optional(v.string()),
});

const missingPostDescriptionValidator = v.object({
    instagram: v.optional(platformMissingDescriptionValidator),
    tiktok: v.optional(platformMissingDescriptionValidator),
    checkedAt: v.number(),
});

const aggregateApplicationByCampaign = new TableAggregate<{
    Key: [string, number, string];
    DataModel: DataModel;
    TableName: "applications";
}>((components as any).aggregateApplicationByCampaign, {
    sortKey: (doc) => [
        doc.campaign_id,
        -(doc.views ?? 0),
        doc._id,
    ],
});

const triggers = new Triggers<DataModel>();
triggers.register("applications", aggregateApplicationByCampaign.trigger());

const mutationWithTriggers = customMutation(
    mutation,
    customCtx(triggers.wrapDB),
);

const internalMutationWithTriggers = customMutation(
    internalMutation,
    customCtx(triggers.wrapDB),
);

const formatCompactViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${Math.round(views / 1000)}k`;
    return `${views}`;
};

const isVerifyingStatus = (status?: string) =>
    status === ApplicationStatus.Verifying;
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
                const business = campaign?.business_id ? await ctx.db.get(campaign.business_id) : null;
                let businessName = campaign?.business_name;

                // Fallback to fetching business if name not denormalized
                if (!businessName) {
                    businessName = business?.name;
                }

                return {
                    ...app,
                    campaignName: campaign?.name,
                    businessName,
                    campaignCoverPhotoUrl: campaign?.cover_photo_url ?? campaign?.logo_url,
                    campaignLogoUrl: campaign?.logo_url ?? business?.logo_url,
                    campaignLogoR2Key: campaign?.logo_r2_key ?? business?.logo_r2_key,
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
        const limit = args.limit ?? 5;
        const results: Array<{
            id: string;
            name: string;
            username?: string;
            views: string;
            amount?: string;
            logoUrl?: string;
            postUrl: string;
        }> = [];

        let cursor: string | undefined = undefined;
        let isDone = false;

        while (!isDone && results.length < limit) {
            const topApplicationPage = await aggregateApplicationByCampaign.paginate(ctx, {
                bounds: {
                    prefix: [args.campaignId],
                },
                cursor,
                pageSize: Math.max(limit * 4, 20),
            });

            const applicationRows = (await Promise.all(
                topApplicationPage.page.map((entry) => ctx.db.get(entry.id)),
            )).filter((row): row is NonNullable<typeof row> => row !== null);

            for (const application of applicationRows) {
                const views = application.views ?? 0;
                const postUrl = application.ig_post_url;

                if (!postUrl) {
                    continue;
                }

                const [creator, user] = await Promise.all([
                    ctx.db
                        .query("creators")
                        .withIndex("by_user", (q) => q.eq("user_id", application.user_id))
                        .unique(),
                    ctx.db
                        .query("users")
                        .withIndex("by_better_auth_user_id", (q) => q.eq("better_auth_user_id", application.user_id))
                        .unique(),
                ]);

                const username = creator?.username ?? user?.display_username ?? user?.username;

                results.push({
                    id: application._id,
                    name: username ?? creator?.name ?? user?.name ?? "Unknown Creator",
                    username: username ?? undefined,
                    views: formatCompactViews(views),
                    postUrl,
                });

                if (results.length >= limit) break;
            }

            cursor = topApplicationPage.cursor;
            isDone = topApplicationPage.isDone;
        }

        if (results.length > 0) {
            return results;
        }

        const applications = await ctx.db
            .query("applications")
            .withIndex("by_campaign", (q) => q.eq("campaign_id", args.campaignId))
            .collect();

        const fallbackApplications = applications
            .filter((application) => !!application.ig_post_url)
            .sort((a, b) => (b.views ?? 0) - (a.views ?? 0));

        for (const application of fallbackApplications) {
            if (results.length >= limit || !application.ig_post_url) {
                continue;
            }

            const [creator, user] = await Promise.all([
                ctx.db
                    .query("creators")
                    .withIndex("by_user", (q) => q.eq("user_id", application.user_id))
                    .unique(),
                ctx.db
                    .query("users")
                    .withIndex("by_better_auth_user_id", (q) => q.eq("better_auth_user_id", application.user_id))
                    .unique(),
            ]);

            const username = creator?.username ?? user?.display_username ?? user?.username;

            results.push({
                id: application._id,
                name: username ?? creator?.name ?? user?.name ?? "Unknown Creator",
                username: username ?? undefined,
                views: formatCompactViews(application.views ?? 0),
                postUrl: application.ig_post_url,
            });
        }

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
        // Find enrolled users/campaigns that should be evaluated during the nightly earning check.
        const earningStatusesResult = await ctx.db
            .query("user_campaign_status")
            .withIndex("by_status", (q) => q.eq("status", UserCampaignStatus.Earning))
            .paginate(args.paginationOpts);

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
                    if (
                        isVerifyingStatus(app.status) ||
                        app.status === ApplicationStatus.Earning ||
                        app.status === ApplicationStatus.ActionRequired
                    ) {
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

export const createApplication = mutationWithTriggers({
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

export const updateApplicationStatus = mutationWithTriggers({
    args: {
        applicationId: v.id("applications"),
        status: v.string(), // e.g. "ready_to_post", "verifying"
        // Optional fields to update
        ig_post_url: v.optional(v.string()),
        tiktok_post_url: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to mutation");
        }

        const application = await ctx.db.get(args.applicationId);
        if (!application) {
            throw new Error("Application not found");
        }

        if (application.user_id !== identity.subject) {
            throw new Error("Unauthorized");
        }

        const campaign = await ctx.db.get(application.campaign_id);
        if (!campaign) {
            throw new Error("Campaign not found");
        }

        const business = await ctx.db.get(campaign.business_id);
        const businessPlanType = (business?.subscription_plan_type ?? "free").toLowerCase();
        const requiresBothPlatformPosts = campaign.requires_both_platform_posts ?? false;
        const missingPostDescription = application.missing_post_description as
            | {
                instagram?: { reuploadRequired?: boolean };
                tiktok?: { reuploadRequired?: boolean };
            }
            | undefined;
        const isTargetedRelink =
            application.status === ApplicationStatus.ActionRequired &&
            (
                missingPostDescription?.instagram?.reuploadRequired === true ||
                missingPostDescription?.tiktok?.reuploadRequired === true
            );
        const requiresInstagramLink = isTargetedRelink
            ? missingPostDescription?.instagram?.reuploadRequired === true
            : (requiresBothPlatformPosts || businessPlanType === "free");
        const requiresTikTokLink = isTargetedRelink
            ? missingPostDescription?.tiktok?.reuploadRequired === true
            : requiresBothPlatformPosts;

        if (businessPlanType === "free" && args.tiktok_post_url) {
            throw new ConvexError({
                code: ERROR_CODES.PLAN_RESTRICTED_FEATURE.code,
                message: "TikTok URL submission is only available on Starter, Growth, or Unlimited plans.",
            });
        }

        if (requiresInstagramLink && !args.ig_post_url) {
            throw new ConvexError({
                code: ERROR_CODES.INVALID_INPUT.code,
                message: "Please provide your Instagram post URL.",
            });
        }

        if (requiresTikTokLink && !args.tiktok_post_url) {
            throw new ConvexError({
                code: ERROR_CODES.INVALID_INPUT.code,
                message: "Please provide your TikTok post URL.",
            });
        }

        if (!requiresInstagramLink && !requiresTikTokLink && !args.ig_post_url && !args.tiktok_post_url) {
            throw new ConvexError({
                code: ERROR_CODES.INVALID_INPUT.code,
                message: businessPlanType === "free"
                    ? "Please provide your Instagram post URL."
                    : "Please provide at least one post URL (Instagram or TikTok).",
            });
        }

        await ctx.db.patch(args.applicationId, {
            status: args.status,
            posted_at: args.status === ApplicationStatus.Verifying ? Date.now() : application.posted_at,
            ig_post_url: args.ig_post_url ?? application.ig_post_url,
            tiktok_post_url: args.tiktok_post_url ?? application.tiktok_post_url,
            missing_post_description: args.status === ApplicationStatus.Earning ? undefined : application.missing_post_description,
            updated_at: Date.now(),
        });
    }
});

export const setApplicationStatusFromCron = internalMutationWithTriggers({
    args: {
        applicationId: v.id("applications"),
        status: v.union(
            v.literal(ApplicationStatus.Verifying),
            v.literal(ApplicationStatus.ActionRequired),
            v.literal(ApplicationStatus.Earning),
        ),
        missingPostDescription: v.optional(missingPostDescriptionValidator),
    },
    handler: async (ctx, args) => {
        const application = await ctx.db.get(args.applicationId);
        if (!application) {
            return { didChange: false, shouldNotify: false };
        }

        const existingPayload = application.missing_post_description;
        const nextPayload = args.status === ApplicationStatus.ActionRequired ? args.missingPostDescription : undefined;
        const statusChanged = application.status !== args.status;
        const payloadChanged = JSON.stringify(existingPayload ?? null) !== JSON.stringify(nextPayload ?? null);

        if (!statusChanged && !payloadChanged) {
            return { didChange: false, shouldNotify: false };
        }

        await ctx.db.patch(args.applicationId, {
            status: args.status,
            missing_post_description: nextPayload,
            updated_at: Date.now(),
        });

        return {
            didChange: true,
            shouldNotify: args.status === ApplicationStatus.ActionRequired && (statusChanged || payloadChanged),
        };
    },
});

// ============================================================
// INTERNAL MUTATIONS (for cron jobs)
// ============================================================

/**
 * Calculate earning based on cumulative threshold logic.
 * Each threshold can be counted multiple times based on views.
 * Processes thresholds from largest to smallest (greedy algorithm).
 */
function calculateThresholdEarning(
    views: number,
    thresholds: Array<{ views: number; payout: number }>
): number {
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

    return totalEarning;
}

type EngagementMetrics = {
    views: number;
    likes: number;
    comments: number;
    shares: number;
};

function getEngagementMetrics(metrics: Partial<EngagementMetrics>): EngagementMetrics {
    return {
        views: metrics.views ?? 0,
        likes: metrics.likes ?? 0,
        comments: metrics.comments ?? 0,
        shares: metrics.shares ?? 0,
    };
}

function getEngagementDeltas(previous: EngagementMetrics, next: EngagementMetrics): EngagementMetrics {
    return {
        views: Math.max(0, next.views - previous.views),
        likes: Math.max(0, next.likes - previous.likes),
        comments: Math.max(0, next.comments - previous.comments),
        shares: Math.max(0, next.shares - previous.shares),
    };
}

function addEngagementDeltas(current: Partial<EngagementMetrics>, deltas: EngagementMetrics): EngagementMetrics {
    const currentMetrics = getEngagementMetrics(current);

    return {
        views: currentMetrics.views + deltas.views,
        likes: currentMetrics.likes + deltas.likes,
        comments: currentMetrics.comments + deltas.comments,
        shares: currentMetrics.shares + deltas.shares,
    };
}

function hasEngagementDelta(deltas: EngagementMetrics): boolean {
    return deltas.views > 0 || deltas.likes > 0 || deltas.comments > 0 || deltas.shares > 0;
}

function buildApplicationStatsPatch(
    metrics: EngagementMetrics,
    earnings: number,
    updatedAt: number,
) {
    return {
        views: metrics.views,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        earnings,
        updated_at: updatedAt,
    };
}

function calculateApplicationEarnings(args: {
    views: number;
    payoutThresholds: Array<{ views: number; payout: number }>;
    maximumPayout: number;
    basePay: number;
    previousApplicationEarnings: number;
    currentCampaignEarnings: number;
}): number {
    const basePayAlreadyIncluded =
        args.basePay > 0 &&
        (
            args.previousApplicationEarnings >= args.basePay ||
            args.currentCampaignEarnings >= args.basePay
        );
    const shouldAwardBasePayOnThisCronRun =
        args.basePay > 0 &&
        !basePayAlreadyIncluded &&
        args.previousApplicationEarnings === 0;
    const thresholdEarnings = calculateThresholdEarning(args.views, args.payoutThresholds);
    const basePayToInclude = basePayAlreadyIncluded || shouldAwardBasePayOnThisCronRun
        ? args.basePay
        : 0;

    return Math.min(basePayToInclude + thresholdEarnings, args.maximumPayout);
}

export const updateApplicationEarning = internalMutationWithTriggers({
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
        const application = await ctx.db.get(args.applicationId);
        if (!application) return;

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) return;

        const userCampaign = await ctx.db.get(args.userCampaignStatusId);
        if (!userCampaign) return;

        const previousMetrics = getEngagementMetrics(application);
        const scrapedMetrics: EngagementMetrics = {
            views: args.views,
            likes: args.likes,
            comments: args.comments,
            shares: args.shares,
        };
        const statDeltas = getEngagementDeltas(previousMetrics, scrapedMetrics);
        const previousAppEarnings = application.earnings ?? 0;

        if (userCampaign.status === UserCampaignStatus.MaxedOut) {
            await ctx.db.patch(
                args.applicationId,
                buildApplicationStatsPatch(scrapedMetrics, userCampaign.maximum_payout, now),
            );

            return {
                viewsDelta: statDeltas.views,
                likesDelta: statDeltas.likes,
                commentsDelta: statDeltas.comments,
                sharesDelta: statDeltas.shares,
                earningsDelta: 0,
            };
        }

        const updatedCampaignMetrics = addEngagementDeltas(userCampaign, statDeltas);
        const newApplicationEarnings = calculateApplicationEarnings({
            views: args.views,
            payoutThresholds: campaign.payout_thresholds,
            maximumPayout: userCampaign.maximum_payout,
            basePay: campaign.base_pay ?? 0,
            previousApplicationEarnings: previousAppEarnings,
            currentCampaignEarnings: userCampaign.total_earnings,
        });
        const earningDelta = Math.max(0, newApplicationEarnings - previousAppEarnings);
        const userCampaignStatsPatch = {
            ...updatedCampaignMetrics,
            updated_at: now,
        };
        const returnPayload = {
            viewsDelta: statDeltas.views,
            likesDelta: statDeltas.likes,
            commentsDelta: statDeltas.comments,
            sharesDelta: statDeltas.shares,
        };

        await ctx.db.patch(
            args.applicationId,
            buildApplicationStatsPatch(scrapedMetrics, newApplicationEarnings, now),
        );

        const updateCreatorTotals = async (earnedAmount: number) => {
            if (!hasEngagementDelta(statDeltas) && earnedAmount <= 0) {
                return;
            }

            const creator = await ctx.db
                .query("creators")
                .withIndex("by_user", (q) => q.eq("user_id", application.user_id))
                .unique();

            if (!creator) {
                return;
            }

            await ctx.db.patch(creator._id, {
                total_views: (creator.total_views ?? 0) + statDeltas.views,
                total_earnings: (creator.total_earnings ?? 0) + earnedAmount,
                balance: (creator.balance ?? 0) + earnedAmount,
            });
        };

        const updateBusinessTotals = async () => {
            if (!hasEngagementDelta(statDeltas)) {
                return;
            }

            const business = await ctx.db.get(campaign.business_id);
            if (!business) {
                return;
            }

            await ctx.db.patch(campaign.business_id, {
                total_views: (business.total_views ?? 0) + statDeltas.views,
                total_likes: (business.total_likes ?? 0) + statDeltas.likes,
                total_comments: (business.total_comments ?? 0) + statDeltas.comments,
                total_shares: (business.total_shares ?? 0) + statDeltas.shares,
                updated_at: now,
            });
        };

        const remainingBudget = campaign.total_budget - campaign.budget_claimed;
        const cappedDelta = Math.min(earningDelta, remainingBudget);

        if (cappedDelta <= 0) {
            await ctx.db.patch(args.userCampaignStatusId, userCampaignStatsPatch);
            await Promise.all([
                updateCreatorTotals(0),
                updateBusinessTotals(),
            ]);

            return {
                ...returnPayload,
                earningsDelta: 0,
            };
        }

        const newBudgetClaimed = campaign.budget_claimed + cappedDelta;
        const campaignPatch: { budget_claimed: number; status?: CampaignStatus } = {
            budget_claimed: newBudgetClaimed,
        };

        if (newBudgetClaimed >= campaign.total_budget) {
            campaignPatch.status = CampaignStatus.Completed;
        }

        await ctx.db.patch(args.campaignId, campaignPatch);

        const newCampaignEarnings = userCampaign.total_earnings + cappedDelta;
        const isNowMaxedOut = newCampaignEarnings >= userCampaign.maximum_payout;

        await ctx.db.patch(args.userCampaignStatusId, {
            ...userCampaignStatsPatch,
            total_earnings: newCampaignEarnings,
            status: isNowMaxedOut ? UserCampaignStatus.MaxedOut : userCampaign.status,
        });

        await Promise.all([
            updateCreatorTotals(cappedDelta),
            updateBusinessTotals(),
        ]);

        return {
            ...returnPayload,
            earningsDelta: cappedDelta,
        };
    },
});
