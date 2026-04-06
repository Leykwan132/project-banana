import { cronJobs } from "convex/server";
import { v } from "convex/values";
import { vOnCompleteArgs } from "@convex-dev/workpool";
import { internalAction } from "./_generated/server";
import { api, internal, components } from "./_generated/api";
import { internalMutation } from "./_generated/server.js";
import { NotificationCopy, NotificationType } from "./notificationConstants";
import {
    handleDailyScrapeCompletion,
    runDailyScrapeApplicationJob,
} from "./dailyScrape";
import { emailPool, notificationPool, scrapePool } from "./workpools";

const crons = cronJobs();

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
    pendingSubmissionCount: number,
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
            `New submissions pending review: ${pendingSubmissionCount}`,
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
        `New submissions pending review: ${pendingSubmissionCount}`,
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
        let totalApplicationsEnqueued = 0;

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
            if (page.length > 0) {
                await scrapePool.enqueueActionBatch(
                    ctx,
                    internal.crons.runDailyScrapeApplication,
                    page.map((app) => ({
                        applicationId: app._id,
                        userId: app.user_id,
                        campaignId: app.campaign_id,
                        campaignStatusId: app.campaignStatusId,
                        igPostUrl: app.ig_post_url,
                        tiktokPostUrl: app.tiktok_post_url,
                        trackingTag: app.tracking_tag,
                    })),
                    {
                        onComplete: internal.crons.applyDailyScrapeWorkResult,
                    },
                );
                totalApplicationsEnqueued += page.length;
            }

            console.log(`Finished batch processing. isDone: ${isDone}`);
        }

        console.log(`Finished daily scrape cron job. Total applications enqueued: ${totalApplicationsEnqueued}`);
    },
});

export const runDailyScrapeApplication = internalAction({
    args: {
        applicationId: v.id("applications"),
        userId: v.string(),
        campaignId: v.id("campaigns"),
        campaignStatusId: v.id("user_campaign_status"),
        igPostUrl: v.optional(v.string()),
        tiktokPostUrl: v.optional(v.string()),
        trackingTag: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const startedAt = Date.now();
        console.log("[daily-scrape] starting application job", {
            applicationId: args.applicationId,
            userId: args.userId,
            campaignId: args.campaignId,
            campaignStatusId: args.campaignStatusId,
            hasInstagram: Boolean(args.igPostUrl),
            hasTikTok: Boolean(args.tiktokPostUrl),
            trackingTag: args.trackingTag ?? null,
        });

        try {
            const result = await runDailyScrapeApplicationJob(ctx, args);
            console.log("[daily-scrape] completed application job", {
                applicationId: args.applicationId,
                userId: args.userId,
                campaignId: args.campaignId,
                skipReason: result.skipReason ?? null,
                submittedPlatformCount: result.submittedPlatformCount,
                validatedPlatformCount: result.validatedPlatformCount,
                hasValidData: result.hasValidData,
                hasMissingPostDescription: Boolean(result.missingPostDescription),
                durationMs: Date.now() - startedAt,
            });
            return result;
        } catch (error) {
            console.error("[daily-scrape] failed application job", {
                applicationId: args.applicationId,
                userId: args.userId,
                campaignId: args.campaignId,
                durationMs: Date.now() - startedAt,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    },
});

export const applyDailyScrapeWorkResult = internalMutation({
    args: vOnCompleteArgs(),
    handler: async (ctx, args) => {
        if (args.result.kind !== "success") {
            console.warn("[daily-scrape] work finished without success", {
                workId: args.workId,
                resultKind: args.result.kind,
                error: args.result.kind === "failed" ? args.result.error : null,
            });
            return null;
        }

        const scrapeResult = args.result.returnValue as any;
        console.log("[daily-scrape] applying work result", {
            workId: args.workId,
            applicationId: scrapeResult.applicationId,
            userId: scrapeResult.userId,
            campaignId: scrapeResult.campaignId,
            skipReason: scrapeResult.skipReason ?? null,
            submittedPlatformCount: scrapeResult.submittedPlatformCount,
            validatedPlatformCount: scrapeResult.validatedPlatformCount,
            hasValidData: scrapeResult.hasValidData,
            hasMissingPostDescription: Boolean(scrapeResult.missingPostDescription),
        });

        await handleDailyScrapeCompletion(ctx as any, scrapeResult);
        return null;
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
            const queuedNotifications: Array<{
                betterAuthUserId: string;
                title: string;
                description: string;
                data: {
                    type: string;
                };
            }> = [];

            for (const creator of creatorPage.page) {
                creatorsChecked++;

                const summaryResult = await ctx.runQuery(internal.applications.getApplicationUpdateSummaryForUser, {
                    userId: creator.user_id,
                });

                if (summaryResult.count === 0) {
                    continue;
                }

                queuedNotifications.push({
                    betterAuthUserId: creator.user_id,
                    title: NotificationCopy.applicationUpdatesSummary.title,
                    description: NotificationCopy.applicationUpdatesSummary.description(summaryResult.count),
                    data: {
                        type: NotificationType.ApplicationUpdatesSummary,
                    },
                });
            }

            if (queuedNotifications.length > 0) {
                await notificationPool.enqueueMutationBatch(
                    ctx,
                    internal.notifications.sendCreatorChangesSummary,
                    queuedNotifications,
                );
                notificationsSent += queuedNotifications.length;
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
        const emailJobs: Array<{
            email: string;
            count: number;
            redirectUrl: string;
        }> = [];

        for (const business of businesses) {
            if (!business.email) {
                console.warn(
                    `Skipping pending approvals email for business ${business.businessName} (${business.businessId}) because no email is configured`,
                );
                continue;
            }

            emailJobs.push({
                email: business.email,
                count: business.count,
                redirectUrl,
            });
        }

        if (emailJobs.length > 0) {
            await emailPool.enqueueActionBatch(
                ctx,
                internal.emails.sendPendingApprovalsEmail,
                emailJobs,
                { retry: false },
            );
        }

        console.log(
            `Finished pending approvals reminder cron job. Businesses checked: ${businesses.length}, emails queued: ${emailJobs.length}`,
        );
    },
});

export const sendPendingBankAccountsTelegramSummary = internalAction({
    args: {},
    handler: async (ctx) => {
        console.log("Starting pending bank accounts Telegram summary cron job");

        const accounts = await ctx.runQuery((internal as any).admin.getPendingBankAccountsForCron, {});
        const pendingSubmissionCount = await ctx.runQuery((internal as any).admin.getPendingSubmissionsCountForCron, {});
        const text = formatPendingBankAccountsSummary(accounts, pendingSubmissionCount);

        await ctx.runAction((internal as any).telegram.sendBankAccountSubmissionAlert, {
            text,
        });

        console.log(
            `Finished pending bank accounts Telegram summary cron job. Pending accounts: ${accounts.length}, pending submissions: ${pendingSubmissionCount}`,
        );
    },
});

export const settlePendingCancellationCampaigns = internalAction({
    args: {},
    handler: async (ctx) => {
        console.log("Starting pending cancellation campaign settlement cron job");

        const result = await ctx.runMutation(internal.campaigns.settlePendingCancellationCampaigns, {});

        console.log(`Finished pending cancellation campaign settlement cron job. Settled campaigns: ${result.processed}`);
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
    internal.crons.runDailyScrape,
);

crons.cron(
    "settle pending cancellation campaigns",
    "0 13 * * *", // 9:00 PM SGT/MYT (13:00 UTC)
    internal.crons.settlePendingCancellationCampaigns,
);

crons.cron(
    "creator application update summary",
    "0 23 * * *", // 7:00 AM SGT/MYT (23:00 UTC)
    internal.crons.sendCreatorApplicationUpdateSummary,
);

crons.cron(
    "pending approvals reminder",
    "30 0 * * *", // 8:30 AM SGT/MYT (00:30 UTC)
    internal.crons.sendPendingApprovalsReminder,
);

crons.cron(
    "pending bank accounts telegram summary",
    "0 1 * * *", // 9:00 AM SGT/MYT (01:00 UTC)
    internal.crons.sendPendingBankAccountsTelegramSummary,
);

export default crons;
