import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { TableAggregate } from "@convex-dev/aggregate";
import type { DataModel } from "./_generated/dataModel.js";
import { components } from "./_generated/api.js";

import { Triggers } from "convex-helpers/server/triggers";
import {
    customCtx,
    customMutation,
} from "convex-helpers/server/customFunctions";
// ============================================================
// QUERIES
// ============================================================
const aggregateCampaignAnalytics = new TableAggregate<{
    Key: [string, string, string];
    DataModel: DataModel;
    TableName: "campaign_analytics_daily";
}>(components.aggregateCampaignAnalytics, {
    // We sort by name first, then by score, so that we can get the highest score for each user
    // we could alternatively use a namespace for this
    sortKey: (doc) => [
        doc.business_id,
        doc.campaign_id,
        doc.date,
    ],
});

const aggregateBusinessAnalytics = new TableAggregate<{
    Key: [string, string];
    DataModel: DataModel;
    TableName: "business_analytics_daily";
}>(components.aggregateBusinessAnalytics, {
    // We sort by name first, then by score, so that we can get the highest score for each user
    // we could alternatively use a namespace for this
    sortKey: (doc) => [
        doc.business_id,
        doc.date,
    ],
});

const aggregateApplicationAnalytics = new TableAggregate<{
    Key: [string, string];
    DataModel: DataModel;
    TableName: "app_analytics_daily";
}>(components.aggregateApplicationAnalytics, {
    // We sort by name first, then by score, so that we can get the highest score for each user
    // we could alternatively use a namespace for this
    sortKey: (doc) => [
        doc.user_id,
        doc.date,
    ],
});

const aggregateCreatorAnalytics = new TableAggregate<{
    Key: [string, string];
    DataModel: DataModel;
    TableName: "creator_analytics_daily";
}>(components.aggregateCreatorAnalytics, {
    sortKey: (doc) => [
        doc.user_id,
        doc.date,
    ],
});

const triggers = new Triggers<DataModel>();
triggers.register("campaign_analytics_daily", aggregateCampaignAnalytics.trigger());
triggers.register("business_analytics_daily", aggregateBusinessAnalytics.trigger());
triggers.register("app_analytics_daily", aggregateApplicationAnalytics.trigger());
triggers.register("creator_analytics_daily", aggregateCreatorAnalytics.trigger());

const mutationWithTriggers = customMutation(
    mutation,
    customCtx(triggers.wrapDB),
);

const calculateEarningFromViews = (
    views: number,
    thresholds: Array<{ views: number; payout: number }>,
    maximumPayout: number
) => {
    const sorted = [...thresholds].sort((a, b) => b.views - a.views);
    let remainingViews = views;
    let totalEarning = 0;

    for (const threshold of sorted) {
        if (remainingViews >= threshold.views) {
            const count = Math.floor(remainingViews / threshold.views);
            totalEarning += count * threshold.payout;
            remainingViews -= count * threshold.views;
        }
    }

    return Math.min(totalEarning, maximumPayout);
};

const formatDateKey = (date: Date) => date.toISOString().split("T")[0] as string;

const getLast30DayWindow = () => {
    const end = new Date();
    end.setUTCHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 29);
    return {
        start,
        end,
        startDate: formatDateKey(start),
        endDate: formatDateKey(end),
    };
};

export const getAppTotalStats = query({
    args: {
        applicationId: v.id("applications"),
        startDate: v.optional(v.string()),
        endDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const dailyStats = await ctx.db
            .query("app_analytics_daily")
            .withIndex("by_application_date", (q) =>
                q.eq("application_id", args.applicationId)
                    .gte("date", args.startDate ?? "0000-00-00")
                    .lte("date", args.endDate ?? "9999-12-31")
            )
            .collect();

        const views = dailyStats.reduce((sum, day) => sum + day.views, 0);
        const likes = dailyStats.reduce((sum, day) => sum + day.likes, 0);
        const comments = dailyStats.reduce((sum, day) => sum + day.comments, 0);
        const shares = dailyStats.reduce((sum, day) => sum + day.shares, 0);
        const earnings = dailyStats.reduce((sum, day) => sum + (day.earnings ?? 0), 0);

        return { views, likes, comments, shares, earnings };
    }
});

// getAppTotalStats has no auth logic to change (public or uses args)

export const getApplicationDailyStatsLast30Days = query({
    args: {
        applicationId: v.id("applications"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) return [];

        const application = await ctx.db.get(args.applicationId);
        if (!application || application.user_id !== user.subject) return [];

        const campaign = await ctx.db.get(application.campaign_id);
        if (!campaign) return [];

        const { start, startDate, endDate } = getLast30DayWindow();

        const rowsByDate = new Map<string, {
            date: string;
            views: number;
            likes: number;
            comments: number;
            shares: number;
        }>();

        let cursor: string | undefined = undefined;
        let isDone = false;
        while (!isDone) {
            const page = await aggregateApplicationAnalytics.paginate(ctx, {
                bounds: {
                    lower: {
                        key: [user.subject, startDate],
                        inclusive: true,
                    },
                    upper: {
                        key: [user.subject, endDate],
                        inclusive: true,
                    },
                },
                cursor,
                pageSize: 200,
            });

            const fetchedRows = await Promise.all(page.page.map((doc) => ctx.db.get(doc.id)));
            for (const row of fetchedRows) {
                if (!row || row.application_id !== args.applicationId) continue;
                rowsByDate.set(row.date, row);
            }

            cursor = page.cursor;
            isDone = page.isDone;
        }

        let runningViews = 0;
        let runningLikes = 0;
        let runningComments = 0;
        let runningShares = 0;

        const result: Array<{
            date: string;
            timestamp: number;
            views: number;
            likes: number;
            comments: number;
            shares: number;
            earnings: number;
        }> = [];

        for (let i = 0; i < 30; i++) {
            const current = new Date(start);
            current.setUTCDate(start.getUTCDate() + i);
            const key = formatDateKey(current);
            const row = rowsByDate.get(key);

            if (row) {
                runningViews = row.views;
                runningLikes = row.likes;
                runningComments = row.comments;
                runningShares = row.shares;
            }

            result.push({
                date: key,
                timestamp: current.getTime(),
                views: runningViews,
                likes: runningLikes,
                comments: runningComments,
                shares: runningShares,
                earnings: calculateEarningFromViews(
                    runningViews,
                    campaign.payout_thresholds,
                    campaign.maximum_payout
                ),
            });
        }

        return result;
    },
});

export const getUserEarningsOverviewLast30Days = query({
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) return { totalEarnings: 0, daily: [] as Array<{ date: string; timestamp: number; earnings: number }> };

        const creator = await ctx.db
            .query("creators")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .unique();

        const totalEarnings = creator?.total_earnings ?? 0;
        const { start, startDate, endDate } = getLast30DayWindow();

        const creatorPrefixBounds = {
            prefix: [user.subject] as [string],
        };

        const rowCount = await aggregateCreatorAnalytics.count(ctx, {
            bounds: creatorPrefixBounds,
        });

        const rowsByDate = new Map<string, { earnings: number }>();
        if (rowCount > 0) {
            const firstOffset = Math.max(0, rowCount - 30);
            const firstInPage = await aggregateCreatorAnalytics.at(ctx, firstOffset, {
                bounds: creatorPrefixBounds,
            });

            const page = await aggregateCreatorAnalytics.paginate(ctx, {
                bounds: {
                    lower: {
                        key: firstInPage.key,
                        id: firstInPage.id,
                        inclusive: true,
                    },
                    upper: {
                        key: [user.subject, endDate],
                        inclusive: true,
                    },
                },
                pageSize: 30,
            });

            const fetchedRows = await Promise.all(page.page.map((doc) => ctx.db.get(doc.id)));
            for (const row of fetchedRows) {
                if (!row) continue;
                if (row.date < startDate || row.date > endDate) continue;
                rowsByDate.set(row.date, { earnings: row.earnings ?? 0 });
            }
        }

        const daily = Array.from({ length: 30 }, (_, i) => {
            const current = new Date(start);
            current.setUTCDate(start.getUTCDate() + i);
            const date = formatDateKey(current);
            return {
                date,
                timestamp: current.getTime(),
                earnings: rowsByDate.get(date)?.earnings ?? 0,
            };
        });

        return { totalEarnings, daily };
    },
});

export const getCreatorDailyStatsLast30Days = query({
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) return [];

        const { start, startDate, endDate } = getLast30DayWindow();
        const creatorPrefixBounds = {
            prefix: [user.subject] as [string],
        };

        const rowCount = await aggregateCreatorAnalytics.count(ctx, {
            bounds: creatorPrefixBounds,
        });

        const rowsByDate = new Map<
            string,
            {
                views: number;
                likes: number;
                comments: number;
                shares: number;
                earnings: number;
            }
        >();

        if (rowCount > 0) {
            const firstOffset = Math.max(0, rowCount - 30);
            const firstInPage = await aggregateCreatorAnalytics.at(ctx, firstOffset, {
                bounds: creatorPrefixBounds,
            });

            const page = await aggregateCreatorAnalytics.paginate(ctx, {
                bounds: {
                    lower: {
                        key: firstInPage.key,
                        id: firstInPage.id,
                        inclusive: true,
                    },
                    upper: {
                        key: [user.subject, endDate],
                        inclusive: true,
                    },
                },
                pageSize: 30,
            });

            const fetchedRows = await Promise.all(page.page.map((doc) => ctx.db.get(doc.id)));
            for (const row of fetchedRows) {
                if (!row) continue;
                if (row.date < startDate || row.date > endDate) continue;
                rowsByDate.set(row.date, {
                    views: row.views,
                    likes: row.likes,
                    comments: row.comments,
                    shares: row.shares,
                    earnings: row.earnings,
                });
            }
        }

        return Array.from({ length: 30 }, (_, i) => {
            const current = new Date(start);
            current.setUTCDate(start.getUTCDate() + i);
            const date = formatDateKey(current);
            const row = rowsByDate.get(date);
            return {
                date,
                timestamp: current.getTime(),
                views: row?.views ?? 0,
                likes: row?.likes ?? 0,
                comments: row?.comments ?? 0,
                shares: row?.shares ?? 0,
                earnings: row?.earnings ?? 0,
            };
        });
    },
});

export const getCampaignTotalStats = query({
    args: {
        campaignId: v.id("campaigns"),
        startDate: v.optional(v.string()),
        endDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const dailyStats = await ctx.db
            .query("campaign_analytics_daily")
            .withIndex("by_campaign_date", (q) =>
                q.eq("campaign_id", args.campaignId)
                    .gte("date", args.startDate ?? "0000-00-00")
                    .lte("date", args.endDate ?? "9999-12-31")
            )
            .collect();

        const views = dailyStats.reduce((sum, day) => sum + day.views, 0);
        const likes = dailyStats.reduce((sum, day) => sum + day.likes, 0);
        const comments = dailyStats.reduce((sum, day) => sum + day.comments, 0);
        const shares = dailyStats.reduce((sum, day) => sum + day.shares, 0);
        const earnings = dailyStats.reduce((sum, day) => sum + (day.earnings ?? 0), 0);
        return { views, likes, comments, shares, earnings };
    }
});

export const getBusinessTotalStats = query({
    args: {
        businessId: v.id("businesses"),
        startDate: v.optional(v.string()),
        endDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) return { views: 0, likes: 0, comments: 0, shares: 0, earnings: 0 };

        const business = await ctx.db.get(args.businessId);
        if (!business || business.user_id !== user.subject) {
            return { views: 0, likes: 0, comments: 0, shares: 0, earnings: 0 };
        }

        const dailyStats = await ctx.db
            .query("business_analytics_daily")
            .withIndex("by_business_date", (q) =>
                q.eq("business_id", args.businessId)
                    .gte("date", args.startDate ?? "0000-00-00")
                    .lte("date", args.endDate ?? "9999-12-31")
            )
            .collect();

        const views = dailyStats.reduce((sum, day) => sum + day.views, 0);
        const likes = dailyStats.reduce((sum, day) => sum + day.likes, 0);
        const comments = dailyStats.reduce((sum, day) => sum + day.comments, 0);
        const shares = dailyStats.reduce((sum, day) => sum + day.shares, 0);
        const amount_spent = dailyStats.reduce((sum, day) => sum + (day.amount_spent ?? 0), 0);

        return { views, likes, comments, shares, amount_spent };
    }
});

export const getBusinessDailyStatsLast30Days = query({
    args: {
        businessId: v.id("businesses"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) return [];

        const business = await ctx.db.get(args.businessId);
        if (!business || business.user_id !== user.subject) return [];

        const end = new Date();
        end.setUTCHours(0, 0, 0, 0);
        const start = new Date(end);
        start.setUTCDate(start.getUTCDate() - 29);

        const formatDateKey = (date: Date) => date.toISOString().split("T")[0] as string;
        const startDate = formatDateKey(start);
        const endDate = formatDateKey(end);

        const businessPrefixBounds = {
            prefix: [args.businessId] as [string],
        };

        const rowCount = await aggregateBusinessAnalytics.count(ctx, {
            bounds: businessPrefixBounds,
        });

        let rows: Array<{
            date: string;
            views: number;
            likes: number;
            comments: number;
            shares: number;
            amount_spent: number;
        }> = [];

        if (rowCount > 0) {
            const firstOffset = Math.max(0, rowCount - 30);
            const firstInPage = await aggregateBusinessAnalytics.at(ctx, firstOffset, {
                bounds: businessPrefixBounds,
            });

            const page = await aggregateBusinessAnalytics.paginate(ctx, {
                bounds: {
                    lower: {
                        key: firstInPage.key,
                        id: firstInPage.id,
                        inclusive: true,
                    },
                    upper: {
                        key: [args.businessId, endDate],
                        inclusive: true,
                    },
                },
                pageSize: 30,
            });

            const fetchedRows = await Promise.all(
                page.page.map((doc) => ctx.db.get(doc.id)),
            );

            rows = fetchedRows.filter((row): row is NonNullable<typeof row> => row !== null);
        }

        const rowByDate = new Map(
            rows
                .filter((row) => row.date >= startDate && row.date <= endDate)
                .map((row) => [row.date, row]),
        );

        const result: Array<{
            date: string;
            timestamp: number;
            views: number;
            likes: number;
            comments: number;
            shares: number;
            amount_spent: number;
        }> = [];

        for (let i = 0; i < 30; i++) {
            const current = new Date(start);
            current.setUTCDate(start.getUTCDate() + i);
            const key = formatDateKey(current);
            const row = rowByDate.get(key);

            result.push({
                date: key,
                timestamp: current.getTime(),
                views: row?.views ?? 0,
                likes: row?.likes ?? 0,
                comments: row?.comments ?? 0,
                shares: row?.shares ?? 0,
                amount_spent: row?.amount_spent ?? 0,
            });
        }

        return result;
    },
});

export const getCampaignDailyStatsLast30Days = query({
    args: {
        campaignId: v.id("campaigns"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) return [];

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) return [];

        const business = await ctx.db.get(campaign.business_id);
        if (!business || business.user_id !== user.subject) return [];

        const { start, startDate, endDate } = getLast30DayWindow();
        const campaignPrefixBounds = {
            prefix: [campaign.business_id, args.campaignId] as [string, string],
        };

        const rowCount = await aggregateCampaignAnalytics.count(ctx, {
            bounds: campaignPrefixBounds,
        });

        const rowsByDate = new Map<
            string,
            {
                views: number;
                likes: number;
                comments: number;
                shares: number;
                earnings: number;
            }
        >();

        if (rowCount > 0) {
            const firstOffset = Math.max(0, rowCount - 30);
            const firstInPage = await aggregateCampaignAnalytics.at(ctx, firstOffset, {
                bounds: campaignPrefixBounds,
            });

            const page = await aggregateCampaignAnalytics.paginate(ctx, {
                bounds: {
                    lower: {
                        key: firstInPage.key,
                        id: firstInPage.id,
                        inclusive: true,
                    },
                    upper: {
                        key: [campaign.business_id, args.campaignId, endDate],
                        inclusive: true,
                    },
                },
                pageSize: 30,
            });

            const fetchedRows = await Promise.all(page.page.map((doc) => ctx.db.get(doc.id)));
            for (const row of fetchedRows) {
                if (!row) continue;
                if (row.date < startDate || row.date > endDate) continue;
                rowsByDate.set(row.date, {
                    views: row.views,
                    likes: row.likes,
                    comments: row.comments,
                    shares: row.shares,
                    earnings: row.earnings,
                });
            }
        }

        return Array.from({ length: 30 }, (_, i) => {
            const current = new Date(start);
            current.setUTCDate(start.getUTCDate() + i);
            const date = formatDateKey(current);
            const row = rowsByDate.get(date);
            return {
                date,
                timestamp: current.getTime(),
                views: row?.views ?? 0,
                likes: row?.likes ?? 0,
                comments: row?.comments ?? 0,
                shares: row?.shares ?? 0,
                earnings: row?.earnings ?? 0,
            };
        });
    },
});



// ============================================================
// MUTATIONS 
// ============================================================

export const saveDailyAppStats = mutationWithTriggers({
    args: {
        applicationId: v.id("applications"),
        campaignId: v.id("campaigns"),
        views: v.number(),
        likes: v.number(),
        comments: v.number(),
        shares: v.number(),
        earnings: v.number(),
    },
    handler: async (ctx, args) => {
        const today = new Date().toISOString().split("T")[0] as string;
        const now = Date.now();

        const application = await ctx.db.get(args.applicationId);
        if (!application) throw new Error("Application not found");

        // Check if record exists for today
        const existing = await ctx.db
            .query("app_analytics_daily")
            .withIndex("by_application_date", (q) =>
                q.eq("application_id", args.applicationId).eq("date", today)
            )
            .unique();

        if (existing) {
            // Update existing record — add delta to accumulate across multiple apps / scrape runs
            await ctx.db.patch(existing._id, {
                views: existing.views + args.views,
                likes: existing.likes + args.likes,
                comments: existing.comments + args.comments,
                shares: existing.shares + args.shares,
                earnings: (existing.earnings ?? 0) + args.earnings,
                updated_at: now,
            });
        } else {
            // Insert new record
            await ctx.db.insert("app_analytics_daily", {
                user_id: application.user_id,
                application_id: args.applicationId,
                campaign_id: args.campaignId,
                date: today,
                views: args.views,
                likes: args.likes,
                comments: args.comments,
                shares: args.shares,
                earnings: args.earnings,
                created_at: now,
                updated_at: now,
            });
        }
    },
});

export const saveDailyCampaignStats = mutationWithTriggers({
    args: {
        campaignId: v.id("campaigns"),
        views: v.number(),
        likes: v.number(),
        comments: v.number(),
        shares: v.number(),
        earnings: v.number(),
    },
    handler: async (ctx, args) => {
        const today = new Date().toISOString().split("T")[0] as string;
        const now = Date.now();

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");

        // Check if record exists for today
        const existing = await ctx.db
            .query("campaign_analytics_daily")
            .withIndex("by_campaign_date", (q) =>
                q.eq("campaign_id", args.campaignId).eq("date", today)
            )
            .unique();

        if (existing) {
            // Update existing record (ADD to existing values for campaign-level aggregation)
            await ctx.db.patch(existing._id, {
                views: existing.views + args.views,
                likes: existing.likes + args.likes,
                comments: existing.comments + args.comments,
                shares: existing.shares + args.shares,
                earnings: existing.earnings + args.earnings,
                updated_at: now,
            });
        } else {
            // Insert new record
            await ctx.db.insert("campaign_analytics_daily", {
                campaign_id: args.campaignId,
                business_id: campaign.business_id,
                date: today,
                views: args.views,
                likes: args.likes,
                comments: args.comments,
                shares: args.shares,
                earnings: args.earnings,
                created_at: now,
                updated_at: now,
            });
        }
    },
});

export const saveDailyBusinessStats = mutationWithTriggers({
    args: {
        businessId: v.id("businesses"),
        views: v.number(),
        likes: v.number(),
        comments: v.number(),
        shares: v.number(),
        amount_spent: v.number(),
    },
    handler: async (ctx, args) => {
        const today = new Date().toISOString().split("T")[0] as string;
        const now = Date.now();

        // Check if record exists for today
        const existing = await ctx.db
            .query("business_analytics_daily")
            .withIndex("by_business_date", (q) =>
                q.eq("business_id", args.businessId).eq("date", today)
            )
            .unique();

        if (existing) {
            // Update existing record (ADD to existing values for business-level aggregation)
            await ctx.db.patch(existing._id, {
                views: existing.views + args.views,
                likes: existing.likes + args.likes,
                comments: existing.comments + args.comments,
                shares: existing.shares + args.shares,
                amount_spent: existing.amount_spent + args.amount_spent,
                updated_at: now,
            });
        } else {
            // Insert new record
            await ctx.db.insert("business_analytics_daily", {
                business_id: args.businessId,
                date: today,
                views: args.views,
                likes: args.likes,
                comments: args.comments,
                shares: args.shares,
                amount_spent: args.amount_spent,
                created_at: now,
                updated_at: now,
            });
        }
    },
});

// ============================================================
// INTERNAL: Update business high-level aggregate totals
// ============================================================

export const updateBusinessHighLevelStats = internalMutation({
    args: {
        businessId: v.id("businesses"),
    },
    handler: async (ctx, args) => {
        // Sum all daily rows for this business
        const allDailyRows = await ctx.db
            .query("business_analytics_daily")
            .withIndex("by_business_date", (q) => q.eq("business_id", args.businessId))
            .collect();

        const totalViews = allDailyRows.reduce((sum, row) => sum + row.views, 0);
        const totalLikes = allDailyRows.reduce((sum, row) => sum + row.likes, 0);
        const totalComments = allDailyRows.reduce((sum, row) => sum + row.comments, 0);
        const totalShares = allDailyRows.reduce((sum, row) => sum + row.shares, 0);

        await ctx.db.patch(args.businessId, {
            total_views: totalViews,
            total_likes: totalLikes,
            total_comments: totalComments,
            total_shares: totalShares,
            updated_at: Date.now(),
        });
    },
});

export const saveDailyCreatorStats = mutationWithTriggers({
    args: {
        userId: v.string(),
        views: v.number(),
        likes: v.number(),
        comments: v.number(),
        shares: v.number(),
        earnings: v.number(),
    },
    handler: async (ctx, args) => {
        const today = new Date().toISOString().split("T")[0] as string;
        const now = Date.now();

        // Check if record exists for today
        const existing = await ctx.db
            .query("creator_analytics_daily")
            .withIndex("by_user_date", (q) =>
                q.eq("user_id", args.userId).eq("date", today)
            )
            .unique();

        if (existing) {
            // Update existing record (ADD to existing values for creator-level aggregation)
            await ctx.db.patch(existing._id, {
                views: existing.views + args.views,
                likes: existing.likes + args.likes,
                comments: existing.comments + args.comments,
                shares: existing.shares + args.shares,
                earnings: existing.earnings + args.earnings,
                updated_at: now,
            });
        } else {
            // Insert new record
            await ctx.db.insert("creator_analytics_daily", {
                user_id: args.userId,
                date: today,
                views: args.views,
                likes: args.likes,
                comments: args.comments,
                shares: args.shares,
                earnings: args.earnings,
                created_at: now,
                updated_at: now,
            });
        }
    },
});
