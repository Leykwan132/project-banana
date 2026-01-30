import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

// ============================================================
// QUERIES
// ============================================================

export const getCampaign = query({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.campaignId);
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
        return await ctx.db
            .query("campaigns")
            .withIndex("by_status", (q) => q.eq("status", "active"))
            .order("desc")
            .paginate(args.paginationOpts);
    },
});

// ============================================================
// MUTATIONS
// ============================================================

export const createCampaign = mutation({
    args: {
        businessId: v.id("businesses"),
        status: v.string(),
        name: v.string(),
        cover_photo_url: v.optional(v.string()),
        total_budget: v.number(),
        asset_links: v.optional(v.string()),
        maximum_payout: v.number(),

        // Complex objects
        payout_thresholds: v.array(v.object({
            views: v.number(),
            payout: v.number(),
        })),
        requirements: v.array(v.object({
            description: v.string(),
        })),
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
                throw new Error("Insufficient credit balance to launch campaign");
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
            cover_photo_url: args.cover_photo_url,
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
                throw new Error("Insufficient credit balance to launch campaign");
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

        await ctx.db.patch(args.campaignId, {
            status: args.status,
            updated_at: Date.now(),
        });
    }
});
