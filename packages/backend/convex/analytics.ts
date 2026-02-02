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

const triggers = new Triggers<DataModel>();
triggers.register("campaign_analytics_daily", aggregateCampaignAnalytics.trigger());
triggers.register("business_analytics_daily", aggregateBusinessAnalytics.trigger());
triggers.register("app_analytics_daily", aggregateApplicationAnalytics.trigger());

const mutationWithTriggers = customMutation(
    mutation,
    customCtx(triggers.wrapDB),
);

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
