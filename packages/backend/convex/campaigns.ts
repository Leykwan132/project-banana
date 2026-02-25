import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { ConvexError } from "convex/values";
import { ERROR_CODES } from "./errors";
import { generateDownloadUrl, generateUploadUrl } from "./s3";
import { CampaignStatus } from "./constants";
// ============================================================
// QUERIES
// ============================================================

export const getCampaign = query({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) return null;

        const pendingApprovals = (await ctx.db
            .query("applications")
            .withIndex("by_campaign", (q) => q.eq("campaign_id", args.campaignId))
            .filter((q) => q.eq(q.field("status"), "reviewing"))
            .collect()).length;

        return {
            ...campaign,
            pendingApprovals,
        };
    },
});

export const getCampaignsByBusiness = query({
    args: {
        businessId: v.id("businesses"),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("campaigns")
            .withIndex("by_business", (q) => q.eq("business_id", args.businessId))
            .order("desc")
            .paginate(args.paginationOpts);
    },
});

export const getActiveCampaigns = query({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, args) => {
        const result = await ctx.db
            .query("campaigns")
            .withIndex("by_status", (q) => q.eq("status", "active"))
            .order("desc")
            .paginate(args.paginationOpts);

        return {
            isDone: result.isDone,
            continueCursor: result.continueCursor,
            page: result.page.map((campaign) => ({
                campaignId: campaign._id,
                name: campaign.name,
                cover_photo_url: campaign.cover_photo_url,
                cover_photo_s3_key: campaign.cover_photo_s3_key,
                logo_url: campaign.logo_url,
                logo_s3_key: campaign.logo_s3_key,
                payout_threshold: campaign.payout_thresholds[0],
                maximum_payout: campaign.maximum_payout,
                submissions: campaign.submissions,
                category: campaign.category,
                business_name: campaign.business_name,
            })),
        };
    },
});

// ============================================================
// MUTATIONS
// ============================================================

export const getCampaignsByFilter = query({
    args: {
        businessId: v.id("businesses"),
        status: v.optional(v.string()), // "active", "paused", "completed", "draft", or "all"
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        let q = ctx.db
            .query("campaigns")
            .withIndex("by_business", (q) => q.eq("business_id", args.businessId));

        if (args.status && args.status !== "All") {
            q = q.filter((q) => q.eq(q.field("status"), args.status));
        }

        return await q.order("desc").paginate(args.paginationOpts);
    },
});

export const createCampaign = mutation({
    args: {
        businessId: v.id("businesses"),
        status: v.string(),
        name: v.string(),
        logo_url: v.optional(v.string()),
        logo_s3_key: v.optional(v.string()),
        cover_photo_url: v.optional(v.string()),
        cover_photo_s3_key: v.optional(v.string()),
        total_budget: v.number(),
        asset_links: v.optional(v.string()),
        maximum_payout: v.number(),
        business_name: v.string(),
        category: v.array(v.string()),
        // Complex objects
        payout_thresholds: v.array(v.object({
            views: v.number(),
            payout: v.number(),
        })),
        requirements: v.array(v.string()),
        scripts: v.optional(v.array(v.object({
            type: v.string(),
            description: v.string(),
        }))),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to mutation");
        }

        const business = await ctx.db.get(args.businessId);
        if (!business) {
            throw new Error("Business not found");
        }

        const now = Date.now();

        // Only deduct credits if the campaign is active (not draft)
        if (args.status === "active") {
            if (business.credit_balance < args.total_budget) {
                throw new ConvexError({
                    code: ERROR_CODES.INSUFFICIENT_CREDITS.code,
                    message: ERROR_CODES.INSUFFICIENT_CREDITS.message,
                    currentBalance: business.credit_balance,
                    required: args.total_budget
                });
            }

            // Deduct credits immediately? Or reserve them?
            // For now, let's deduct them to "hold" the budget.
            // In a real system, you might have 'reserved_balance' vs 'available_balance'.

            // Transaction for budget dedication
            await ctx.db.patch(business._id, {
                credit_balance: business.credit_balance - args.total_budget,
                updated_at: now,
            });

            await ctx.db.insert("credits", {
                business_id: business._id,
                amount: -args.total_budget,
                status: "completed",
                type: "campaign_spend", // reserving budget
                created_at: now,
                reference: `campaign_launch:${args.name}`,
            });
        }

        const campaignId = await ctx.db.insert("campaigns", {
            business_id: args.businessId,
            name: args.name,
            logo_url: args.logo_url,
            logo_s3_key: args.logo_s3_key,
            cover_photo_url: args.cover_photo_url,
            cover_photo_s3_key: args.cover_photo_s3_key,
            total_budget: args.total_budget,
            budget_claimed: 0, // Starts at 0
            status: args.status, // "active" or "draft"
            asset_links: args.asset_links,
            maximum_payout: args.maximum_payout,
            payout_thresholds: args.payout_thresholds,
            requirements: args.requirements,
            scripts: args.scripts,
            submissions: 0,
            created_at: now,
            updated_at: now,
            business_name: args.business_name,
            category: args.category,
        });

        return campaignId;
    },
});

export const updateCampaignStatus = mutation({
    args: {
        campaignId: v.id("campaigns"),
        status: v.string(), // "paused", "completed", "active"
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to mutation");
        }

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");

        // Logic for activating a draft campaign
        if (campaign.status === "draft" && args.status === "active") {
            const business = await ctx.db.get(campaign.business_id);
            if (!business) throw new Error("Business not found");

            if (business.credit_balance < campaign.total_budget) {
                throw new ConvexError({
                    code: ERROR_CODES.INSUFFICIENT_CREDITS.code,
                    message: ERROR_CODES.INSUFFICIENT_CREDITS.message,
                    currentBalance: business.credit_balance,
                    required: campaign.total_budget
                });
            }

            const now = Date.now();

            // Deduct credits
            await ctx.db.patch(business._id, {
                credit_balance: business.credit_balance - campaign.total_budget,
                updated_at: now,
            });

            await ctx.db.insert("credits", {
                business_id: business._id,
                amount: -campaign.total_budget,
                status: "completed",
                type: "campaign_spend",
                created_at: now,
                reference: `campaign_launch:${campaign.name}`,
            });
        }

        const now = Date.now();
        await ctx.db.patch(args.campaignId, {
            status: args.status,
            cancelled_at: args.status === CampaignStatus.Cancelled ? now : undefined,
            updated_at: now,
        });
    }
});

export const updateCampaign = mutation({
    args: {
        campaignId: v.id("campaigns"),
        name: v.string(),
        logo_url: v.optional(v.string()),
        logo_s3_key: v.optional(v.string()),
        use_company_logo: v.optional(v.boolean()),
        cover_photo_url: v.optional(v.string()),
        cover_photo_s3_key: v.optional(v.string()),
        total_budget: v.number(),
        asset_links: v.optional(v.string()),
        maximum_payout: v.number(),
        category: v.array(v.string()),
        payout_thresholds: v.array(v.object({
            views: v.number(),
            payout: v.number(),
        })),
        requirements: v.array(v.string()),
        scripts: v.optional(v.array(v.object({
            type: v.string(),
            description: v.string(),
        }))),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to mutation");
        }

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) {
            throw new Error("Campaign not found");
        }

        const business = await ctx.db.get(campaign.business_id);
        if (!business) {
            throw new Error("Business not found");
        }

        if (args.total_budget < campaign.budget_claimed) {
            throw new ConvexError({
                code: ERROR_CODES.INVALID_INPUT.code,
                message: `Total payouts cannot be lower than claimed amount (RM ${campaign.budget_claimed.toFixed(2)})`,
                claimedAmount: campaign.budget_claimed,
                requestedTotalBudget: args.total_budget,
            });
        }

        // Check if budget is being increased
        if (args.total_budget > campaign.total_budget) {
            const additionalBudget = args.total_budget - campaign.total_budget;

            if (business.credit_balance < additionalBudget) {
                throw new ConvexError({
                    code: ERROR_CODES.INSUFFICIENT_CREDITS.code,
                    message: ERROR_CODES.INSUFFICIENT_CREDITS.message,
                    currentBalance: business.credit_balance,
                    required: additionalBudget
                });
            }

            const now = Date.now();

            // Deduct credits for the budget increase
            await ctx.db.patch(business._id, {
                credit_balance: business.credit_balance - additionalBudget,
                updated_at: now,
            });

            await ctx.db.insert("credits", {
                business_id: business._id,
                amount: -additionalBudget,
                status: "completed",
                type: "campaign_spend",
                created_at: now,
                reference: `campaign_update:${args.name}`,
            });
        }

        // Logic for refunding credits if budget is decreased could go here
        // For now, we only handle increases as requested

        await ctx.db.patch(args.campaignId, {
            name: args.name,
            logo_url: args.logo_url,
            logo_s3_key: args.logo_s3_key,
            use_company_logo: args.use_company_logo,
            cover_photo_url: args.cover_photo_url,
            cover_photo_s3_key: args.cover_photo_s3_key,
            total_budget: args.total_budget,
            category: args.category,
            asset_links: args.asset_links,
            maximum_payout: args.maximum_payout,
            payout_thresholds: args.payout_thresholds,
            requirements: args.requirements,
            scripts: args.scripts,
            updated_at: Date.now(),
        });

        return args.campaignId;
    },
});

export const generateCampaignImageUploadUrl = action({
    args: {
        contentType: v.string(),
        imageType: v.union(v.literal("logo"), v.literal("cover")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to action");
        }

        const key = crypto.randomUUID();
        const prefix = args.imageType === "logo" ? "campaign-logos" : "campaign-covers";
        const s3Key = `${prefix}/${key}`;
        const uploadUrl = await generateUploadUrl(s3Key, args.contentType);

        return { uploadUrl, s3Key };
    },
});

export const generateCampaignImageAccessUrl = action({
    args: {
        s3Key: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to action");
        }

        const isAllowedPrefix =
            args.s3Key.startsWith("campaign-logos/") ||
            args.s3Key.startsWith("campaign-covers/");

        if (!isAllowedPrefix) {
            throw new Error("Invalid campaign image key");
        }

        return await generateDownloadUrl(args.s3Key);
    },
});
