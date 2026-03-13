import { cronJobs } from "convex/server";
import { internalAction } from "./_generated/server";
import { api, internal, components } from "./_generated/api";
import { posthog } from "./posthog";
import { internalMutation } from "./_generated/server.js";
import { ApplicationStatus } from "./constants";
import { NotificationCopy, NotificationType } from "./notificationConstants";

const crons = cronJobs();

type PlatformMissingDescription = {
    trackingTagMissing: boolean;
    missingHashtags: string[];
    missingMentions: string[];
    reuploadRequired?: boolean;
    reuploadReason?: string;
};

type MissingPostDescription = {
    instagram?: PlatformMissingDescription;
    tiktok?: PlatformMissingDescription;
    checkedAt: number;
};

const PRIVATE_OR_MISSING_POST_ERROR_PATTERNS = [
    "post not found or private",
    "post not found",
    "private",
    "restricted_page",
    "restricted access",
];

const isVerifyingStatus = (status?: string) =>
    status === ApplicationStatus.Verifying;

const stripPrefix = (value: string, prefix: "#" | "@") => {
    const trimmed = value.trim();
    return trimmed.startsWith(prefix) ? trimmed.slice(1) : trimmed;
};

const normalizeAvailableValues = (values: string[], prefix?: "#" | "@") =>
    values
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => prefix ? stripPrefix(value, prefix) : value);

const normalizeTikTokHashtags = (hashtags: Array<{ name?: string }>) =>
    hashtags
        .map((item) => item.name?.trim())
        .filter((value): value is string => Boolean(value));

const collectMissingDescription = (args: {
    trackingTag?: string;
    requiredHashtags: string[];
    requiredMentions: string[];
    availableHashtags: string[];
    availableMentions: string[];
}): PlatformMissingDescription | undefined => {
    const availableHashtags = new Set(normalizeAvailableValues(args.availableHashtags, "#"));
    const availableMentions = new Set(normalizeAvailableValues(args.availableMentions, "@"));

    const trackingTagMissing = !!args.trackingTag && !availableHashtags.has(args.trackingTag);
    const missingHashtags = args.requiredHashtags.filter((value) => !availableHashtags.has(value));
    const missingMentions = args.requiredMentions.filter((value) => !availableMentions.has(value));

    if (!trackingTagMissing && missingHashtags.length === 0 && missingMentions.length === 0) {
        return undefined;
    }

    return {
        trackingTagMissing,
        missingHashtags,
        missingMentions,
    };
};

const getScrapeErrorMessage = (value: unknown) => {
    if (!value || typeof value !== "object") {
        return undefined;
    }

    const error = (value as { error?: unknown }).error;
    const errorDescription = (value as { errorDescription?: unknown }).errorDescription;
    const normalizedError = typeof error === "string" && error.trim() ? error.trim() : undefined;
    const normalizedDescription =
        typeof errorDescription === "string" && errorDescription.trim()
            ? errorDescription.trim()
            : undefined;

    if (normalizedError && normalizedDescription) {
        return `${normalizedError}: ${normalizedDescription}`;
    }

    return normalizedError ?? normalizedDescription;
};

const getThrowableMessage = (value: unknown) => {
    if (value instanceof Error) {
        return value.message;
    }

    return typeof value === "string" ? value : undefined;
};

const shouldRequireRelink = (message?: string) => {
    if (!message) {
        return false;
    }

    const normalized = message.toLowerCase();
    return PRIVATE_OR_MISSING_POST_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern));
};

const formatRelinkReason = (platform: "Instagram" | "TikTok", reason?: string) => {
    const normalized = reason?.toLowerCase() ?? "";

    if (
        normalized.includes("restricted_page") ||
        normalized.includes("restricted access") ||
        normalized.includes("post not found") ||
        normalized.includes("private")
    ) {
        return `We couldn't verify this ${platform} post. Please make sure your account is public and resubmit the link.`;
    }

    return `We couldn't verify this ${platform} post. Please make sure your account is public and resubmit the link.`;
};

const buildRelinkRequiredDescription = (
    platform: "Instagram" | "TikTok",
    reason?: string,
): PlatformMissingDescription => ({
    trackingTagMissing: false,
    missingHashtags: [],
    missingMentions: [],
    reuploadRequired: true,
    reuploadReason: formatRelinkReason(platform, reason),
});

export const runDailyScrape = internalAction({
    args: {},
    handler: async (ctx) => {
        console.log("Starting daily scrape cron job");

        let continueCursor: string | null = null;
        let isDone = false;
        let totalApplicationsProcessed = 0;

        while (!isDone) {
            console.log(`Processing batch starting from cursor: ${continueCursor ?? "start"}`);

            let page: Array<{
                _id: any;
                user_id: string;
                campaign_id: any;
                campaignStatusId: any;
                userCampaignMaxPayout: number;
                status: string;
                ig_post_url?: string;
                tiktok_post_url?: string;
                tracking_tag?: string;
            }>;

            ({ page, continueCursor, isDone } = await ctx.runQuery(internal.applications.getApplicationsForEarningCheck, {
                paginationOpts: { cursor: continueCursor, numItems: 50 },
            }));

            console.log(`Retrieved ${page.length} applications from database`);

            for (const app of page) {
                console.log(`\n--- Processing Application ${app._id} ---`);
                // Early check: Skip if no budget remaining for this campaign
                const campaign = await ctx.runQuery(api.campaigns.getCampaign, {
                    campaignId: app.campaign_id
                });

                if (!campaign) {
                    console.warn(`Campaign ${app.campaign_id} not found, skipping app ${app._id}`);
                    continue;
                }

                const remainingBudget = campaign.total_budget - campaign.budget_claimed;
                console.log(`Campaign: ${campaign.name} | Budget: ${campaign.budget_claimed}/${campaign.total_budget} (Remaining: ${remainingBudget})`);

                if (remainingBudget <= 0) {
                    console.log(`No budget remaining for campaign ${app.campaign_id}, skipping scrape`);
                    continue;
                }

                let totalViews = 0;
                let totalLikes = 0;
                let totalComments = 0;
                let totalShares = 0;
                let hasValidData = false;
                let validatedPlatformCount = 0;
                const submittedPlatformCount = Number(Boolean(app.ig_post_url)) + Number(Boolean(app.tiktok_post_url));
                const missingPostDescription: MissingPostDescription = {
                    checkedAt: Date.now(),
                };
                let hasMissingPostDescription = false;
                const requiredHashtags = campaign.hashtags ?? [];
                const requiredMentions = campaign.mentions ?? [];
                const businessPlanType = (campaign.business_plan_type ?? "free").toLowerCase();
                const descriptionRequiredHashtags = businessPlanType !== "free" ? requiredHashtags : [];
                const descriptionRequiredMentions = businessPlanType !== "free" ? requiredMentions : [];

                // Scrape IG
                if (app.ig_post_url) {
                    try {
                        const reels = await ctx.runAction(api.instagram.getInstagramReels, {
                            link: app.ig_post_url,
                        });

                        console.log(`IG Scraped for app ${app._id}: ${JSON.stringify(reels)}`);

                        if (reels && reels.length > 0) {
                            const reel = reels[0];
                            if (reel) {
                                const scrapeError = getScrapeErrorMessage(reel);
                                if (shouldRequireRelink(scrapeError)) {
                                    console.warn(`IG post for app ${app._id} needs a new public link: ${scrapeError}`);
                                    missingPostDescription.instagram = buildRelinkRequiredDescription("Instagram", scrapeError);
                                    hasMissingPostDescription = true;
                                } else {
                                    const igMissing = collectMissingDescription({
                                        trackingTag: app.tracking_tag,
                                        requiredHashtags: descriptionRequiredHashtags,
                                        requiredMentions: descriptionRequiredMentions,
                                        availableHashtags: (reel.hashtags || []) as string[],
                                        availableMentions: (reel.mentions || []) as string[],
                                    });

                                    if (igMissing) {
                                        console.warn(`IG post for app ${app._id} missing required structured description data`);
                                        missingPostDescription.instagram = igMissing;
                                        hasMissingPostDescription = true;
                                    } else {
                                        validatedPlatformCount += 1;
                                        const views = (reel.videoPlayCount || 0) as number;
                                        const likes = (reel.likesCount || 0) as number;
                                        const comments = (reel.commentsCount || 0) as number;
                                        const shares = (reel.sharesCount || 0) as number;

                                        console.log(`IG Scraped for app ${app._id}: Views=${views}, Likes=${likes}, Comments=${comments}, Shares=${shares}`);

                                        totalViews = totalViews + views;
                                        totalLikes = totalLikes + likes;
                                        totalComments = totalComments + comments;
                                        totalShares = totalShares + shares;
                                        hasValidData = true;
                                    }
                                }
                            } else {
                                console.log("No IG reel data found for this URL");
                            }
                        } else {
                            console.log("No IG reel data found for this URL");
                        }
                    } catch (e) {
                        const errorMessage = getThrowableMessage(e);
                        if (shouldRequireRelink(errorMessage)) {
                            console.warn(`IG post for app ${app._id} needs a new public link: ${errorMessage}`);
                            missingPostDescription.instagram = buildRelinkRequiredDescription("Instagram", errorMessage);
                            hasMissingPostDescription = true;
                        }
                        console.error(`Failed to scrape IG for app ${app._id}:`, e);
                    }
                }

                // Scrape TikTok
                if (app.tiktok_post_url) {
                    try {
                        const tiktokPost = await ctx.runAction(api.tiktok.getTiktokPost, {
                            url: app.tiktok_post_url,
                        });

                        console.log(`TikTok Scraped: ${JSON.stringify(tiktokPost)}`);

                        if (tiktokPost) {
                            const scrapeError = getScrapeErrorMessage(tiktokPost);
                            if (shouldRequireRelink(scrapeError)) {
                                console.warn(`TikTok post for app ${app._id} needs a new public link: ${scrapeError}`);
                                missingPostDescription.tiktok = buildRelinkRequiredDescription("TikTok", scrapeError);
                                hasMissingPostDescription = true;
                            } else {
                                const tiktokMissing = collectMissingDescription({
                                    trackingTag: app.tracking_tag,
                                    requiredHashtags: descriptionRequiredHashtags,
                                    requiredMentions: descriptionRequiredMentions,
                                    availableHashtags: normalizeTikTokHashtags((tiktokPost.hashtags || []) as Array<{ name?: string }>),
                                    availableMentions: (tiktokPost.mentions || []) as string[],
                                });

                                if (tiktokMissing) {
                                    console.warn(`TikTok post for app ${app._id} missing required structured description data`);
                                    missingPostDescription.tiktok = tiktokMissing;
                                    hasMissingPostDescription = true;
                                } else {
                                    validatedPlatformCount += 1;
                                    const views = (tiktokPost.playCount || 0) as number;
                                    const likes = (tiktokPost.diggCount || 0) as number;
                                    const comments = (tiktokPost.commentCount || 0) as number;
                                    const shares = (tiktokPost.shareCount || 0) as number;

                                    console.log(`TikTok Scraped: Views=${views}, Likes=${likes}, Comments=${comments}, Shares=${shares}`);

                                    totalViews = totalViews + views;
                                    totalLikes = totalLikes + likes;
                                    totalComments = totalComments + comments;
                                    totalShares = totalShares + shares;
                                    hasValidData = true;
                                }
                            }
                        } else {
                            console.log("No TikTok post data found for this URL");
                        }
                    } catch (e) {
                        const errorMessage = getThrowableMessage(e);
                        if (shouldRequireRelink(errorMessage)) {
                            console.warn(`TikTok post for app ${app._id} needs a new public link: ${errorMessage}`);
                            missingPostDescription.tiktok = buildRelinkRequiredDescription("TikTok", errorMessage);
                            hasMissingPostDescription = true;
                        }
                        console.error(`Failed to scrape TikTok for app ${app._id}:`, e);
                    }
                }

                if (hasMissingPostDescription) {
                    const result = await ctx.runMutation(internal.applications.setApplicationStatusFromCron, {
                        applicationId: app._id,
                        status: ApplicationStatus.ActionRequired,
                        missingPostDescription,
                    });

                    if (result.shouldNotify) {
                        await ctx.runMutation(internal.notifications.deliverCreatorNotification, {
                            betterAuthUserId: app.user_id,
                            title: NotificationCopy.postDescriptionMissing.title,
                            description: NotificationCopy.postDescriptionMissing.description(
                                campaign.name,
                            ),
                            data: {
                                type: NotificationType.PostDescriptionMissing,
                                applicationId: app._id,
                                missingPostDescription,
                            },
                        });
                    }

                    console.log(`Application ${app._id} moved to action_required because the post needs attention`);
                    totalApplicationsProcessed++;
                    continue;
                }

                const allSubmittedPlatformsValidated = submittedPlatformCount > 0 && validatedPlatformCount === submittedPlatformCount;

                if (
                    (isVerifyingStatus(app.status) || app.status === ApplicationStatus.ActionRequired)
                    && allSubmittedPlatformsValidated
                ) {
                    await ctx.runMutation(internal.applications.setApplicationStatusFromCron, {
                        applicationId: app._id,
                        status: ApplicationStatus.Earning,
                        missingPostDescription: undefined,
                    });
                } else if (app.status === ApplicationStatus.ActionRequired) {
                    console.log(`Application ${app._id} remains action_required until all submitted platforms are revalidated`);
                    totalApplicationsProcessed++;
                    continue;
                } else if (isVerifyingStatus(app.status)) {
                    console.log(`Application ${app._id} remains verifying until all submitted platforms are validated`);
                    totalApplicationsProcessed++;
                    continue;
                }

                // Save aggregated stats if we have valid data
                if (hasValidData) {
                    console.log(`Saving aggregated stats for app ${app._id}: Views=${totalViews}, Likes=${totalLikes}, Comments=${totalComments}, Shares=${totalShares}`);

                    // 1. Compute earnings and get deltas for all metrics
                    const scrapeDeltas = await ctx.runMutation(internal.applications.updateApplicationEarning, {
                        applicationId: app._id,
                        campaignId: app.campaign_id,
                        userCampaignStatusId: app.campaignStatusId,
                        views: totalViews,
                        likes: totalLikes,
                        comments: totalComments,
                        shares: totalShares,
                    });

                    // Deltas represent only new activity since the last scrape
                    const viewsDelta = scrapeDeltas?.viewsDelta ?? 0;
                    const likesDelta = scrapeDeltas?.likesDelta ?? 0;
                    const commentsDelta = scrapeDeltas?.commentsDelta ?? 0;
                    const sharesDelta = scrapeDeltas?.sharesDelta ?? 0;
                    const earningsDelta = scrapeDeltas?.earningsDelta ?? 0;

                    console.log(`Deltas for app ${app._id}: views=${viewsDelta}, likes=${likesDelta}, comments=${commentsDelta}, shares=${sharesDelta}, earnings=${earningsDelta}`);

                    // 2. App Analytics — additive delta (same as all other daily stats)
                    await ctx.runMutation(api.analytics.saveDailyAppStats, {
                        applicationId: app._id,
                        campaignId: app.campaign_id,
                        views: viewsDelta,
                        likes: likesDelta,
                        comments: commentsDelta,
                        shares: sharesDelta,
                        earnings: earningsDelta,
                    });

                    // 3. Campaign Analytics — additive, so pass deltas
                    await ctx.runMutation(api.analytics.saveDailyCampaignStats, {
                        campaignId: app.campaign_id,
                        views: viewsDelta,
                        likes: likesDelta,
                        comments: commentsDelta,
                        shares: sharesDelta,
                        earnings: earningsDelta,
                    });

                    // 4. Business Analytics — additive; amount_spent = amount spent per day (delta only)
                    await ctx.runMutation(api.analytics.saveDailyBusinessStats, {
                        businessId: campaign.business_id,
                        views: viewsDelta,
                        likes: likesDelta,
                        comments: commentsDelta,
                        shares: sharesDelta,
                        amount_spent: earningsDelta,
                    });

                    // 5. Creator Analytics — additive, so pass deltas
                    await ctx.runMutation(api.analytics.saveDailyCreatorStats, {
                        userId: app.user_id,
                        views: viewsDelta,
                        likes: likesDelta,
                        comments: commentsDelta,
                        shares: sharesDelta,
                        earnings: earningsDelta,
                    });

                    await posthog.capture(ctx, {
                        distinctId: app.user_id,
                        event: "daily_scrape_calculated",
                        properties: {
                            applicationId: app._id,
                            viewsDelta,
                            likesDelta,
                            commentsDelta,
                            sharesDelta,
                            earningsDelta,
                        }
                    });

                    console.log(`Successfully updated all database records for app ${app._id}`);
                } else {
                    console.log(`No valid data to save for app ${app._id}`);
                }


                totalApplicationsProcessed++;
            }
            console.log(`Finished batch processing. isDone: ${isDone}`);
        }

        console.log(`Finished daily scrape cron job. Total applications processed: ${totalApplicationsProcessed}`);
    },
});

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const cleanupResend = internalMutation({
    args: {},
    handler: async (ctx) => {
        await ctx.scheduler.runAfter(0, components.resend.lib.cleanupOldEmails, {
            olderThan: ONE_WEEK_MS,
        });
        await ctx.scheduler.runAfter(
            0,
            components.resend.lib.cleanupAbandonedEmails,
            // These generally indicate a bug, so keep them around for longer.
            { olderThan: 4 * ONE_WEEK_MS },
        );
    },
});

crons.interval(
    "Remove old emails from the resend component",
    { hours: 1 },
    internal.crons.cleanupResend,
);

crons.cron(
    "daily scrape",
    "15 16 * * *", // 12:15 AM SGT/MYT (16:15 UTC)
    (internal as any).crons.runDailyScrape,
);

export default crons;
