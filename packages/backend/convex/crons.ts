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

const TELEGRAM_SUMMARY_TIMEZONE = "Asia/Kuala_Lumpur";
const PENDING_BANK_ACCOUNT_SUMMARY_PREVIEW_LIMIT = 10;

const formatPendingBankAccountsSummary = (
    accounts: Array<{
        _id: string;
        bank_name: string;
        account_holder_name: string;
        account_number: string;
        source_type: string;
        created_at?: number;
    }>,
) => {
    const summaryDate = new Intl.DateTimeFormat("en-MY", {
        timeZone: TELEGRAM_SUMMARY_TIMEZONE,
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }).format(new Date());

    if (accounts.length === 0) {
        return [
            "Daily bank account pending review summary",
            `As of ${summaryDate} (${TELEGRAM_SUMMARY_TIMEZONE})`,
            "Pending bank accounts: 0",
            "No bank accounts are pending review right now.",
        ].join("\n");
    }

    const preview = accounts.slice(0, PENDING_BANK_ACCOUNT_SUMMARY_PREVIEW_LIMIT);
    const lines = preview.map((account, index) => {
        const source = account.source_type === "business" ? "business" : "creator";
        const submittedAt = account.created_at
            ? new Intl.DateTimeFormat("en-MY", {
                timeZone: TELEGRAM_SUMMARY_TIMEZONE,
                year: "numeric",
                month: "short",
                day: "2-digit",
            }).format(new Date(account.created_at))
            : "unknown";

        return `${index + 1}. ${source} | ${account.bank_name} | ${account.account_holder_name} | ****${account.account_number.slice(-4)} | submitted ${submittedAt} | ${account._id}`;
    });

    const remaining = accounts.length - preview.length;

    return [
        "Daily bank account pending review summary",
        `As of ${summaryDate} (${TELEGRAM_SUMMARY_TIMEZONE})`,
        `Pending bank accounts: ${accounts.length}`,
        ...lines,
        ...(remaining > 0 ? [`...and ${remaining} more pending bank account(s).`] : []),
    ].join("\n");
};

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
                        console.log("Scraping IG for app", app._id);
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
                        console.log("Scraping TikTok for app", app._id);
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
                    await ctx.runMutation(internal.applications.setApplicationStatusFromCron, {
                        applicationId: app._id,
                        status: ApplicationStatus.ActionRequired,
                        missingPostDescription,
                    });

                    console.log(`Application ${app._id} moved to action_required because the post needs attention`);
                    totalApplicationsProcessed++;
                    continue;
                }

                const allSubmittedPlatformsValidated = submittedPlatformCount > 0 && validatedPlatformCount === submittedPlatformCount;

                if (
                    (isVerifyingStatus(app.status) || app.status === ApplicationStatus.ActionRequired)
                    && allSubmittedPlatformsValidated
                ) {
                    const earningTransition = await ctx.runMutation(internal.applications.setApplicationStatusFromCron, {
                        applicationId: app._id,
                        status: ApplicationStatus.Earning,
                        missingPostDescription: undefined,
                    });

                    if (earningTransition.didEnterEarning) {
                        await ctx.runMutation(internal.notifications.createAndSendNotification, {
                            betterAuthUserId: app.user_id,
                            title: NotificationCopy.postEarning.title,
                            description: NotificationCopy.postEarning.description(campaign.name),
                            data: {
                                type: NotificationType.PostEarning,
                                applicationId: app._id,
                            },
                        });
                    }
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

                    if (earningsDelta > 0) {
                        await ctx.runMutation(internal.payouts.upsertCampaignPayout, {
                            userId: app.user_id,
                            applicationId: app._id,
                            campaignId: app.campaign_id,
                            amountDelta: earningsDelta,
                            companyName: campaign.business_name,
                            campaignName: campaign.name,
                        });
                    }

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

export const sendCreatorApplicationUpdateSummary = internalAction({
    args: {},
    handler: async (ctx) => {
        console.log("Starting creator application update summary cron job");

        let continueCursor: string | null = null;
        let isDone = false;
        let creatorsChecked = 0;
        let notificationsSent = 0;

        while (!isDone) {
            const creatorPageResult = await ctx.runQuery(internal.creators.getCreatorsForApplicationUpdateSummary, {
                paginationOpts: { cursor: continueCursor, numItems: 100 },
            });
            const creatorPage = creatorPageResult as {
                page: Array<{ user_id: string }>;
                continueCursor: string;
                isDone: boolean;
            };

            continueCursor = creatorPage.continueCursor;
            isDone = creatorPage.isDone;

            for (const creator of creatorPage.page) {
                creatorsChecked++;

                const summaryResult = await ctx.runQuery(internal.applications.getApplicationUpdateSummaryForUser, {
                    userId: creator.user_id,
                });

                if (summaryResult.count === 0) {
                    continue;
                }

                await ctx.runMutation(internal.notifications.sendCreatorChangesSummary, {
                    betterAuthUserId: creator.user_id,
                    title: NotificationCopy.applicationUpdatesSummary.title,
                    description: NotificationCopy.applicationUpdatesSummary.description(summaryResult.count),
                    data: {
                        type: NotificationType.ApplicationUpdatesSummary,
                    },
                });
                notificationsSent++;
            }
        }

        console.log(
            `Finished creator application update summary cron job. Creators checked: ${creatorsChecked}, notifications sent: ${notificationsSent}`,
        );
    },
});

export const sendPendingApprovalsReminder = internalAction({
    args: {},
    handler: async (ctx) => {
        console.log("Starting pending approvals reminder cron job");

        const businesses = await ctx.runQuery((internal as any).businesses.getBusinessesWithPendingApprovals, {});
        const siteUrl = (process.env.SITE_URL ?? "https://lumina-app.my").replace(/\/$/, "");
        const redirectUrl = `${siteUrl}/approvals`;
        let emailsSent = 0;

        for (const business of businesses) {
            if (!business.email) {
                console.warn(
                    `Skipping pending approvals email for business ${business.businessName} (${business.businessId}) because no email is configured`,
                );
                continue;
            }

            await ctx.runAction((internal as any).emails.sendPendingApprovalsEmail, {
                email: business.email,
                count: business.count,
                redirectUrl,
            });
            emailsSent += 1;
        }

        console.log(
            `Finished pending approvals reminder cron job. Businesses checked: ${businesses.length}, emails sent: ${emailsSent}`,
        );
    },
});

export const sendPendingBankAccountsTelegramSummary = internalAction({
    args: {},
    handler: async (ctx) => {
        console.log("Starting pending bank accounts Telegram summary cron job");

        const accounts = await ctx.runQuery((internal as any).admin.getPendingBankAccountsForCron, {});
        const text = formatPendingBankAccountsSummary(accounts);

        await ctx.runAction((internal as any).telegram.sendBankAccountSubmissionAlert, {
            text,
        });

        console.log(
            `Finished pending bank accounts Telegram summary cron job. Pending accounts: ${accounts.length}`,
        );
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

crons.cron(
    "creator application update summary",
    "0 23 * * *", // 7:00 AM SGT/MYT (23:00 UTC)
    (internal as any).crons.sendCreatorApplicationUpdateSummary,
);

crons.cron(
    "pending approvals reminder",
    "30 0 * * *", // 8:30 AM SGT/MYT (00:30 UTC)
    (internal as any).crons.sendPendingApprovalsReminder,
);

crons.cron(
    "pending bank accounts telegram summary",
    "0 1 * * *", // 9:00 AM SGT/MYT (01:00 UTC)
    (internal as any).crons.sendPendingBankAccountsTelegramSummary,
);

export default crons;
