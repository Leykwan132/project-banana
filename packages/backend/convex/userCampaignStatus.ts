import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

// ============================================================
// QUERIES
// ============================================================

/**
 * Get all campaign statuses for a specific user
 */
export const getUserCampaignStatuses = query({
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) return [];

        const statuses = await ctx.db
            .query("user_campaign_status")
            .withIndex("by_user", (q) => q.eq("user_id", String(user._id)))
            .collect();

        return await Promise.all(
            statuses.map(async (status) => {
                const campaign = await ctx.db.get(status.campaign_id);
                const business = campaign ? await ctx.db.get(campaign.business_id) : null;

                return {
                    ...status,
                    campaign_name: campaign?.name ?? "Campaign",
                    company_name: campaign?.business_name ?? business?.name ?? "Company",
                    campaign_image_url: campaign?.cover_photo_url ?? business?.logo_url,
                };
            })
        );
    },
});

/**
 * Get campaign status for a specific user and campaign
 */
export const getUserCampaignStatus = query({
    args: {
        campaignId: v.id("campaigns"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) return null;

        return await ctx.db
            .query("user_campaign_status")
            .withIndex("by_user", (q) => q.eq("user_id", String(user._id)))
            .filter((q) => q.eq(q.field("campaign_id"), args.campaignId))
            .unique();
    },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Create a new user campaign status when user joins a campaign
 */
export const createUserCampaignStatus = mutation({
    args: {
        campaignId: v.id("campaigns"),
        maximumPayout: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) throw new Error("User not found");

        // Check if status already exists
        const existing = await ctx.db
            .query("user_campaign_status")
            .withIndex("by_user", (q) => q.eq("user_id", String(user._id)))
            .filter((q) => q.eq(q.field("campaign_id"), args.campaignId))
            .unique();

        if (existing) {
            throw new Error("User campaign status already exists");
        }

        const now = Date.now();
        const statusId = await ctx.db.insert("user_campaign_status", {
            user_id: String(user._id),
            campaign_id: args.campaignId,
            maximum_payout: args.maximumPayout,
            total_earnings: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            views: 0,
            status: "pending_review",
            created_at: now,
            updated_at: now,
        });

        return statusId;
    },
});

/**
 * Update user campaign status
 */
export const updateUserCampaignStatus = mutation({
    args: {
        statusId: v.id("user_campaign_status"),
        status: v.optional(v.string()),
        totalEarnings: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) throw new Error("Unauthenticated");

        const existingStatus = await ctx.db.get(args.statusId);
        if (!existingStatus) throw new Error("Status not found");

        // Verify ownership
        if (existingStatus.user_id !== String(user._id)) {
            throw new Error("Unauthorized");
        }

        const updateData: any = {
            updated_at: Date.now(),
        };

        if (args.status !== undefined) {
            updateData.status = args.status;
        }

        if (args.totalEarnings !== undefined) {
            updateData.total_earnings = args.totalEarnings;

            // Auto-update status to maxed_out if earnings reach maximum
            if (args.totalEarnings >= existingStatus.maximum_payout) {
                updateData.status = "maxed_out";
            }
        }

        await ctx.db.patch(args.statusId, updateData);
    },
});
