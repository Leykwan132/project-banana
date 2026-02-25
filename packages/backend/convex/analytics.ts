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

        return { views, likes, comments, shares };
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

        const end = new Date();
        end.setUTCHours(0, 0, 0, 0);
        const start = new Date(end);
        start.setUTCDate(start.getUTCDate() - 29);

        const formatDateKey = (date: Date) => date.toISOString().split("T")[0] as string;

        const startDate = formatDateKey(start);
        const endDate = formatDateKey(end);

        const rows = await ctx.db
            .query("app_analytics_daily")
            .withIndex("by_application_date", (q) =>
                q.eq("application_id", args.applicationId)
                    .gte("date", startDate)
                    .lte("date", endDate)
            )
            .collect();

        const rowByDate = new Map(rows.map((row) => [row.date, row]));

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
            const row = rowByDate.get(key);

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

        const applications = await ctx.db
            .query("applications")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .collect();

        const totalEarnings = applications.reduce(
            (sum, app) => sum + (app.earnings ?? 0),
            0
        );

        const end = new Date();
        end.setUTCHours(0, 0, 0, 0);
        const start = new Date(end);
        start.setUTCDate(start.getUTCDate() - 29);

        const formatDateKey = (date: Date) => date.toISOString().split("T")[0] as string;
        const startDate = formatDateKey(start);
        const endDate = formatDateKey(end);

        const rows = await ctx.db
            .query("app_analytics_daily")
            .withIndex("by_user_date", (q) =>
                q.eq("user_id", user.subject)
                    .gte("date", startDate)
                    .lte("date", endDate)
            )
            .collect();

        const appDateViews = new Map<string, Map<string, number>>();
        for (const row of rows) {
            if (!appDateViews.has(row.application_id)) {
                appDateViews.set(row.application_id, new Map());
            }
            appDateViews.get(row.application_id)!.set(row.date, row.views);
        }

        const campaignCache = new Map<string, { payout_thresholds: Array<{ views: number; payout: number }>; maximum_payout: number } | null>();
        const dailyEarnings = Array.from({ length: 30 }, () => 0);

        for (const app of applications) {
            let campaign = campaignCache.get(app.campaign_id);
            if (campaign === undefined) {
                campaign = await ctx.db.get(app.campaign_id);
                campaignCache.set(app.campaign_id, campaign);
            }
            if (!campaign) continue;

            const viewsByDate = appDateViews.get(app._id) ?? new Map<string, number>();

            let runningViews = 0;
            let previousCumulativeEarning = 0;

            for (let i = 0; i < 30; i++) {
                const current = new Date(start);
                current.setUTCDate(start.getUTCDate() + i);
                const key = formatDateKey(current);
                const dayViews = viewsByDate.get(key);

                if (dayViews !== undefined) {
                    runningViews = dayViews;
                }

                const cumulativeEarning = calculateEarningFromViews(
                    runningViews,
                    campaign.payout_thresholds,
                    campaign.maximum_payout
                );

                const dailyIncrement = Math.max(0, cumulativeEarning - previousCumulativeEarning);
                dailyEarnings[i] += dailyIncrement;
                previousCumulativeEarning = cumulativeEarning;
            }
        }

        const daily = dailyEarnings.map((earnings, i) => {
            const current = new Date(start);
            current.setUTCDate(start.getUTCDate() + i);
            return {
                date: formatDateKey(current),
                timestamp: current.getTime(),
                earnings,
            };
        });

        return { totalEarnings, daily };
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

        return { views, likes, comments, shares };
    }
});

export const getBusinessTotalStats = query({
    args: {
        businessId: v.id("businesses"),
        startDate: v.optional(v.string()),
        endDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
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

        return { views, likes, comments, shares };
    }
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
            // Update existing record
            await ctx.db.patch(existing._id, {
                views: args.views,
                likes: args.likes,
                comments: args.comments,
                shares: args.shares,
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
                created_at: now,
                updated_at: now,
            });
        }
    },
});

export const saveDailyCreatorStats = mutationWithTriggers({
    args: {
        userId: v.string(),
        views: v.number(),
        likes: v.number(),
        comments: v.number(),
        shares: v.number(),
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
                created_at: now,
                updated_at: now,
            });
        }
    },
});
