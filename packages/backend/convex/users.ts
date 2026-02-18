import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

// ============================================================
// QUERIES
// ============================================================

export const getUser = query({
    args: {},
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) return null;

        const creator: any = await ctx.runQuery(api.creators.getCreatorByUserId, { userId: user.subject });

        const userCampaignStatuses = await ctx.db
            .query("user_campaign_status")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .collect();

        const campaignsCount = userCampaignStatuses.length;
        const totalEarnings = userCampaignStatuses.reduce((acc, curr) => acc + (curr.total_earnings || 0), 0);

        return {
            ...user,
            isDeleted: creator?.is_deleted ?? false,
            isOnboarded: creator?.is_onboarded ?? false,
            profile_pic_url: creator?.profile_pic_url ?? null,
            total_views: creator?.total_views ?? 0,
            total_earnings: totalEarnings, // Use calculated earnings
            campaigns_count: campaignsCount,
            balance: creator?.balance ?? 0,
            bank_account: creator?.bank_account ?? null,
            bank_name: creator?.bank_name ?? null,
        };
    },
});

export const getUserById = query({
    args: { userId: v.string() },
    handler: async (_ctx, _args) => {
        return null;
    },
});

export const getUserByAuthId = query({
    args: { authId: v.string() },
    handler: async (_ctx, args) => {
        // Fallback shape used by webhook code paths that still expect an `_id`.
        return { _id: args.authId as any, userId: args.authId } as any;
    },
});

export const getUserBalance = query({
    args: {},
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            return { balance: 0 };
        }

        const creator: any = await ctx.runQuery(api.creators.getCreatorByUserId, { userId: user.subject });
        return { balance: creator?.balance ?? 0 };
    },
});





// ============================================================
// MUTATIONS
// ============================================================

export const createUser = mutation({
    args: {
        name: v.string(),
        profile_pic_url: v.optional(v.string()), // Optional?
        bank_account: v.optional(v.string()),
        bank_name: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            throw new Error("Called createUser without authentication present");
        }

        const creator: any = await ctx.runQuery(api.creators.getCreatorByUserId, { userId: user.subject });
        if (!creator) throw new Error("Creator record not found");

        const updateData: Record<string, string | number | boolean | undefined> = {};
        if (args.profile_pic_url !== undefined) updateData.profile_pic_url = args.profile_pic_url;
        if (args.bank_account !== undefined) updateData.bank_account = args.bank_account;
        if (args.bank_name !== undefined) updateData.bank_name = args.bank_name;

        if (Object.keys(updateData).length > 0) {
            await ctx.db.patch(creator._id, {
                ...updateData,
                updated_at: Date.now(),
            });
        }

        return user._id;
    },
});

export const updateUser = mutation({
    args: {
        name: v.optional(v.string()),
        profile_pic_url: v.optional(v.string()),
        bank_account: v.optional(v.string()),
        bank_name: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            throw new Error("Unauthenticated");
        }

        const creator: any = await ctx.runQuery(api.creators.getCreatorByUserId, { userId: user.subject });
        if (!creator) throw new Error("Creator record not found");

        const updateData: Record<string, string | number | boolean | undefined> = {};

        if (args.profile_pic_url !== undefined) updateData.profile_pic_url = args.profile_pic_url;
        if (args.bank_account !== undefined) updateData.bank_account = args.bank_account;
        if (args.bank_name !== undefined) updateData.bank_name = args.bank_name;

        if (Object.keys(updateData).length > 0) {
            await ctx.db.patch(creator._id, {
                ...updateData,
                updated_at: Date.now(),
            });
        }

        return user._id;
    },
});

// Get onboarding status for the current user
export const getOnboardingStatus = query({
    args: {},
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            return { isOnboarded: false };
        }

        const creator: any = await ctx.runQuery(api.creators.getCreatorByUserId, { userId: user.subject });
        return { isOnboarded: creator?.is_onboarded ?? false };
    },
});

// Set user as onboarded (called from webhook after first subscription)
export const setUserOnboarded = mutation({
    args: {
        authId: v.string(),
        isOnboarded: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const creator: any = await ctx.runQuery(api.creators.getCreatorByUserId, { userId: args.authId });
        if (!creator) throw new Error("Creator record not found");

        if (args.isOnboarded === undefined) {
            return { success: true };
        }

        await ctx.db.patch(creator._id, {
            is_onboarded: args.isOnboarded,
            updated_at: Date.now(),
        });

        return { success: true };
    },
});
