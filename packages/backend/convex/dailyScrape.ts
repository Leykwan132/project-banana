import type { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import { ApplicationStatus } from "./constants";
import { NotificationCopy, NotificationType } from "./notificationConstants";
import { posthog } from "./posthog";
import { notificationPool } from "./workpools";

export type PlatformMissingDescription = {
    trackingTagMissing: boolean;
    missingHashtags: string[];
    missingMentions: string[];
    reuploadRequired?: boolean;
    reuploadReason?: string;
};

export type MissingPostDescription = {
    instagram?: PlatformMissingDescription;
    tiktok?: PlatformMissingDescription;
    checkedAt: number;
};

export type DailyScrapeWorkArgs = {
    applicationId: Id<"applications">;
    userId: string;
    campaignId: Id<"campaigns">;
    campaignStatusId: Id<"user_campaign_status">;
    igPostUrl?: string;
    tiktokPostUrl?: string;
    trackingTag?: string;
};

export type DailyScrapeWorkResult = {
    applicationId: Id<"applications">;
    userId: string;
    campaignId: Id<"campaigns">;
    campaignStatusId: Id<"user_campaign_status">;
    skipReason?: "campaign_not_found" | "budget_exhausted";
    submittedPlatformCount: number;
    validatedPlatformCount: number;
    hasValidData: boolean;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    missingPostDescription?: MissingPostDescription;
};

const PRIVATE_OR_MISSING_POST_ERROR_PATTERNS = [
    "post not found or private",
    "post not found",
    "private",
    "restricted_page",
    "restricted access",
];

export const isVerifyingStatus = (status?: string) =>
    status === ApplicationStatus.Verifying;

export const stripPrefix = (value: string, prefix: "#" | "@") => {
    const trimmed = value.trim();
    return trimmed.startsWith(prefix) ? trimmed.slice(1) : trimmed;
};

export const normalizeAvailableValues = (values: string[], prefix?: "#" | "@") =>
    values
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => prefix ? stripPrefix(value, prefix) : value);

export const normalizeTikTokHashtags = (hashtags: Array<{ name?: string }>) =>
    hashtags
        .map((item) => item.name?.trim())
        .filter((value): value is string => Boolean(value));

export const collectMissingDescription = (args: {
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

export const getScrapeErrorMessage = (value: unknown) => {
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

export const getThrowableMessage = (value: unknown) => {
    if (value instanceof Error) {
        return value.message;
    }

    return typeof value === "string" ? value : undefined;
};

export const shouldRequireRelink = (message?: string) => {
    if (!message) {
        return false;
    }

    const normalized = message.toLowerCase();
    return PRIVATE_OR_MISSING_POST_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern));
};

const formatRelinkReason = (platform: "Instagram" | "TikTok", _reason?: string) => {
    return `We couldn't verify this ${platform} post. Please make sure your account is public and resubmit the link.`;
};

export const buildRelinkRequiredDescription = (
    platform: "Instagram" | "TikTok",
    reason?: string,
): PlatformMissingDescription => ({
    trackingTagMissing: false,
    missingHashtags: [],
    missingMentions: [],
    reuploadRequired: true,
    reuploadReason: formatRelinkReason(platform, reason),
});

const handleTransientScrapeError = (
    platform: "Instagram" | "TikTok",
    errorMessage: string,
    hasMissingPostDescription: boolean,
) => {
    if (hasMissingPostDescription) {
        return;
    }

    throw new Error(`${platform} scrape failed: ${errorMessage}`);
};

export const runDailyScrapeApplicationJob = async (
    ctx: {
        runQuery: (fn: any, args: any) => Promise<any>;
        runAction: (fn: any, args: any) => Promise<any>;
    },
    args: DailyScrapeWorkArgs,
): Promise<DailyScrapeWorkResult> => {
    const campaign = await ctx.runQuery(api.campaigns.getCampaign, {
        campaignId: args.campaignId,
    });

    if (!campaign) {
        return {
            applicationId: args.applicationId,
            userId: args.userId,
            campaignId: args.campaignId,
            campaignStatusId: args.campaignStatusId,
            skipReason: "campaign_not_found",
            submittedPlatformCount: 0,
            validatedPlatformCount: 0,
            hasValidData: false,
            totalViews: 0,
            totalLikes: 0,
            totalComments: 0,
            totalShares: 0,
        };
    }

    const remainingBudget = campaign.total_budget - campaign.budget_claimed;
    if (remainingBudget <= 0) {
        return {
            applicationId: args.applicationId,
            userId: args.userId,
            campaignId: args.campaignId,
            campaignStatusId: args.campaignStatusId,
            skipReason: "budget_exhausted",
            submittedPlatformCount: Number(Boolean(args.igPostUrl)) + Number(Boolean(args.tiktokPostUrl)),
            validatedPlatformCount: 0,
            hasValidData: false,
            totalViews: 0,
            totalLikes: 0,
            totalComments: 0,
            totalShares: 0,
        };
    }

    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let hasValidData = false;
    let validatedPlatformCount = 0;
    const submittedPlatformCount = Number(Boolean(args.igPostUrl)) + Number(Boolean(args.tiktokPostUrl));
    const missingPostDescription: MissingPostDescription = {
        checkedAt: Date.now(),
    };
    let hasMissingPostDescription = false;
    const requiredHashtags = campaign.hashtags ?? [];
    const requiredMentions = campaign.mentions ?? [];
    const businessPlanType = (campaign.business_plan_type ?? "payasyougo").toLowerCase();
    const isPayAsYouGoPlan = businessPlanType === "payasyougo";
    const descriptionRequiredHashtags = !isPayAsYouGoPlan ? requiredHashtags : [];
    const descriptionRequiredMentions = !isPayAsYouGoPlan ? requiredMentions : [];

    if (args.igPostUrl) {
        try {
            const reels = await ctx.runAction(api.instagram.getInstagramReels, {
                link: args.igPostUrl,
            });

            if (reels && reels.length > 0) {
                const reel = reels[0];
                if (reel) {
                    const scrapeError = getScrapeErrorMessage(reel);
                    if (scrapeError) {
                        if (shouldRequireRelink(scrapeError)) {
                            missingPostDescription.instagram = buildRelinkRequiredDescription("Instagram", scrapeError);
                            hasMissingPostDescription = true;
                        } else {
                            handleTransientScrapeError("Instagram", scrapeError, hasMissingPostDescription);
                        }
                    } else {
                        const igMissing = collectMissingDescription({
                            trackingTag: args.trackingTag,
                            requiredHashtags: descriptionRequiredHashtags,
                            requiredMentions: descriptionRequiredMentions,
                            availableHashtags: (reel.hashtags || []) as string[],
                            availableMentions: (reel.mentions || []) as string[],
                        });

                        if (igMissing) {
                            missingPostDescription.instagram = igMissing;
                            hasMissingPostDescription = true;
                        } else {
                            validatedPlatformCount += 1;
                            totalViews += (reel.videoPlayCount || 0) as number;
                            totalLikes += (reel.likesCount || 0) as number;
                            totalComments += (reel.commentsCount || 0) as number;
                            totalShares += (reel.sharesCount || 0) as number;
                            hasValidData = true;
                        }
                    }
                }
            }
        } catch (error) {
            const errorMessage = getThrowableMessage(error) ?? "Unknown Instagram scrape error";
            if (shouldRequireRelink(errorMessage)) {
                missingPostDescription.instagram = buildRelinkRequiredDescription("Instagram", errorMessage);
                hasMissingPostDescription = true;
            } else {
                handleTransientScrapeError("Instagram", errorMessage, hasMissingPostDescription);
            }
        }
    }

    if (args.tiktokPostUrl) {
        try {
            const tiktokPost = await ctx.runAction(api.tiktok.getTiktokPost, {
                url: args.tiktokPostUrl,
            });

            if (tiktokPost) {
                const scrapeError = getScrapeErrorMessage(tiktokPost);
                if (scrapeError) {
                    if (shouldRequireRelink(scrapeError)) {
                        missingPostDescription.tiktok = buildRelinkRequiredDescription("TikTok", scrapeError);
                        hasMissingPostDescription = true;
                    } else {
                        handleTransientScrapeError("TikTok", scrapeError, hasMissingPostDescription);
                    }
                } else {
                    const tiktokMissing = collectMissingDescription({
                        trackingTag: args.trackingTag,
                        requiredHashtags: descriptionRequiredHashtags,
                        requiredMentions: descriptionRequiredMentions,
                        availableHashtags: normalizeTikTokHashtags((tiktokPost.hashtags || []) as Array<{ name?: string }>),
                        availableMentions: (tiktokPost.mentions || []) as string[],
                    });

                    if (tiktokMissing) {
                        missingPostDescription.tiktok = tiktokMissing;
                        hasMissingPostDescription = true;
                    } else {
                        validatedPlatformCount += 1;
                        totalViews += (tiktokPost.playCount || 0) as number;
                        totalLikes += (tiktokPost.diggCount || 0) as number;
                        totalComments += (tiktokPost.commentCount || 0) as number;
                        totalShares += (tiktokPost.shareCount || 0) as number;
                        hasValidData = true;
                    }
                }
            }
        } catch (error) {
            const errorMessage = getThrowableMessage(error) ?? "Unknown TikTok scrape error";
            if (shouldRequireRelink(errorMessage)) {
                missingPostDescription.tiktok = buildRelinkRequiredDescription("TikTok", errorMessage);
                hasMissingPostDescription = true;
            } else {
                handleTransientScrapeError("TikTok", errorMessage, hasMissingPostDescription);
            }
        }
    }

    return {
        applicationId: args.applicationId,
        userId: args.userId,
        campaignId: args.campaignId,
        campaignStatusId: args.campaignStatusId,
        submittedPlatformCount,
        validatedPlatformCount,
        hasValidData,
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        missingPostDescription: hasMissingPostDescription ? missingPostDescription : undefined,
    };
};

export const handleDailyScrapeCompletion = async (
    ctx: {
        db: {
            get: (id: any) => Promise<any>;
        };
        runMutation: (fn: any, args: any) => Promise<any>;
    },
    scrapeResult: DailyScrapeWorkResult,
) => {
    console.log("[daily-scrape] completion start", {
        applicationId: scrapeResult.applicationId,
        userId: scrapeResult.userId,
        campaignId: scrapeResult.campaignId,
        skipReason: scrapeResult.skipReason ?? null,
        submittedPlatformCount: scrapeResult.submittedPlatformCount,
        validatedPlatformCount: scrapeResult.validatedPlatformCount,
        hasValidData: scrapeResult.hasValidData,
        hasMissingPostDescription: Boolean(scrapeResult.missingPostDescription),
    });

    if (scrapeResult.skipReason) {
        console.log("[daily-scrape] completion skipped", {
            applicationId: scrapeResult.applicationId,
            userId: scrapeResult.userId,
            campaignId: scrapeResult.campaignId,
            reason: scrapeResult.skipReason,
        });
        return;
    }

    const application = await ctx.db.get(scrapeResult.applicationId);
    if (!application) {
        console.warn("[daily-scrape] completion aborted: application missing", {
            applicationId: scrapeResult.applicationId,
            userId: scrapeResult.userId,
            campaignId: scrapeResult.campaignId,
        });
        return;
    }

    const campaign = await ctx.db.get(scrapeResult.campaignId);
    if (!campaign) {
        console.warn("[daily-scrape] completion aborted: campaign missing", {
            applicationId: scrapeResult.applicationId,
            userId: scrapeResult.userId,
            campaignId: scrapeResult.campaignId,
        });
        return;
    }

    if (scrapeResult.missingPostDescription) {
        console.log("[daily-scrape] moving application to action_required", {
            applicationId: scrapeResult.applicationId,
            userId: scrapeResult.userId,
            campaignId: scrapeResult.campaignId,
        });
        await ctx.runMutation(internal.applications.setApplicationStatusFromCron, {
            applicationId: scrapeResult.applicationId,
            status: ApplicationStatus.ActionRequired,
            missingPostDescription: scrapeResult.missingPostDescription,
        });
        return;
    }

    const allSubmittedPlatformsValidated =
        scrapeResult.submittedPlatformCount > 0 &&
        scrapeResult.validatedPlatformCount === scrapeResult.submittedPlatformCount;

    if (
        (isVerifyingStatus(application.status) || application.status === ApplicationStatus.ActionRequired) &&
        allSubmittedPlatformsValidated
    ) {
        const earningTransition = await ctx.runMutation(internal.applications.setApplicationStatusFromCron, {
            applicationId: scrapeResult.applicationId,
            status: ApplicationStatus.Earning,
            missingPostDescription: undefined,
        });

        console.log("[daily-scrape] evaluated earning transition", {
            applicationId: scrapeResult.applicationId,
            userId: scrapeResult.userId,
            campaignId: scrapeResult.campaignId,
            previousStatus: application.status,
            didEnterEarning: Boolean(earningTransition?.didEnterEarning),
        });

        if (earningTransition?.didEnterEarning) {
            await notificationPool.enqueueMutation(ctx as any, internal.notifications.createAndSendNotification, {
                betterAuthUserId: scrapeResult.userId,
                title: NotificationCopy.postEarning.title,
                description: NotificationCopy.postEarning.description(campaign.name),
                data: {
                    type: NotificationType.PostEarning,
                    applicationId: scrapeResult.applicationId,
                },
            });
            console.log("[daily-scrape] queued post earning notification", {
                applicationId: scrapeResult.applicationId,
                userId: scrapeResult.userId,
                campaignId: scrapeResult.campaignId,
            });
        }
    } else if (
        application.status === ApplicationStatus.ActionRequired ||
        isVerifyingStatus(application.status)
    ) {
        console.log("[daily-scrape] waiting for full platform validation", {
            applicationId: scrapeResult.applicationId,
            userId: scrapeResult.userId,
            campaignId: scrapeResult.campaignId,
            currentStatus: application.status,
            submittedPlatformCount: scrapeResult.submittedPlatformCount,
            validatedPlatformCount: scrapeResult.validatedPlatformCount,
        });
        return;
    }

    if (!scrapeResult.hasValidData) {
        console.log("[daily-scrape] no valid scrape data to persist", {
            applicationId: scrapeResult.applicationId,
            userId: scrapeResult.userId,
            campaignId: scrapeResult.campaignId,
        });
        return;
    }

    const scrapeDeltas = await ctx.runMutation(internal.applications.updateApplicationEarning, {
        applicationId: scrapeResult.applicationId,
        campaignId: scrapeResult.campaignId,
        userCampaignStatusId: scrapeResult.campaignStatusId,
        views: scrapeResult.totalViews,
        likes: scrapeResult.totalLikes,
        comments: scrapeResult.totalComments,
        shares: scrapeResult.totalShares,
    });

    const viewsDelta = scrapeDeltas?.viewsDelta ?? 0;
    const likesDelta = scrapeDeltas?.likesDelta ?? 0;
    const commentsDelta = scrapeDeltas?.commentsDelta ?? 0;
    const sharesDelta = scrapeDeltas?.sharesDelta ?? 0;
    const earningsDelta = scrapeDeltas?.earningsDelta ?? 0;

    console.log("[daily-scrape] computed deltas", {
        applicationId: scrapeResult.applicationId,
        userId: scrapeResult.userId,
        campaignId: scrapeResult.campaignId,
        viewsDelta,
        likesDelta,
        commentsDelta,
        sharesDelta,
        earningsDelta,
    });

    if (earningsDelta > 0) {
        await ctx.runMutation(internal.payouts.upsertCampaignPayout, {
            userId: scrapeResult.userId,
            applicationId: scrapeResult.applicationId,
            campaignId: scrapeResult.campaignId,
            amountDelta: earningsDelta,
            companyName: campaign.business_name,
            campaignName: campaign.name,
        });
        console.log("[daily-scrape] upserted payout delta", {
            applicationId: scrapeResult.applicationId,
            userId: scrapeResult.userId,
            campaignId: scrapeResult.campaignId,
            earningsDelta,
        });
    }

    await ctx.runMutation(api.analytics.saveDailyAppStats, {
        applicationId: scrapeResult.applicationId,
        campaignId: scrapeResult.campaignId,
        views: viewsDelta,
        likes: likesDelta,
        comments: commentsDelta,
        shares: sharesDelta,
        earnings: earningsDelta,
    });

    await ctx.runMutation(api.analytics.saveDailyCampaignStats, {
        campaignId: scrapeResult.campaignId,
        views: viewsDelta,
        likes: likesDelta,
        comments: commentsDelta,
        shares: sharesDelta,
        earnings: earningsDelta,
    });

    await ctx.runMutation(api.analytics.saveDailyBusinessStats, {
        businessId: campaign.business_id,
        views: viewsDelta,
        likes: likesDelta,
        comments: commentsDelta,
        shares: sharesDelta,
        amount_spent: earningsDelta,
    });

    await ctx.runMutation(api.analytics.saveDailyCreatorStats, {
        userId: scrapeResult.userId,
        views: viewsDelta,
        likes: likesDelta,
        comments: commentsDelta,
        shares: sharesDelta,
        earnings: earningsDelta,
    });

    await posthog.capture(ctx as any, {
        distinctId: scrapeResult.userId,
        event: "daily_scrape_calculated",
        properties: {
            applicationId: scrapeResult.applicationId,
            viewsDelta,
            likesDelta,
            commentsDelta,
            sharesDelta,
            earningsDelta,
        },
    });

    console.log("[daily-scrape] completion finished", {
        applicationId: scrapeResult.applicationId,
        userId: scrapeResult.userId,
        campaignId: scrapeResult.campaignId,
        viewsDelta,
        likesDelta,
        commentsDelta,
        sharesDelta,
        earningsDelta,
    });
};
