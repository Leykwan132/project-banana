import { internalMutation, mutation, query } from "./_generated/server";
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
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId);
    },
});

export const getUserByAuthId = query({
    args: { authId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_better_auth_user_id", (q) => q.eq("better_auth_user_id", args.authId))
            .unique();
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

export const ensureNotificationUser = internalMutation({
    args: {
        betterAuthUserId: v.string(),
        email: v.optional(v.string()),
        emailVerified: v.optional(v.boolean()),
        image: v.optional(v.string()),
        isAnonymous: v.optional(v.boolean()),
        name: v.optional(v.string()),
        phoneNumber: v.optional(v.string()),
        phoneNumberVerified: v.optional(v.boolean()),
        twoFactorEnabled: v.optional(v.boolean()),
        username: v.optional(v.string()),
        displayUsername: v.optional(v.string()),
        createdAt: v.optional(v.number()),
        updatedAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("users")
            .withIndex("by_better_auth_user_id", (q) => q.eq("better_auth_user_id", args.betterAuthUserId))
            .unique();

        const mirroredFields = {
            email: args.email,
            email_verified: args.emailVerified,
            image: args.image,
            is_anonymous: args.isAnonymous,
            name: args.name,
            phone_number: args.phoneNumber,
            phone_number_verified: args.phoneNumberVerified,
            two_factor_enabled: args.twoFactorEnabled,
            username: args.username,
            display_username: args.displayUsername,
            created_at: args.createdAt,
            updated_at: args.updatedAt,
        };

        if (existing) {
            await ctx.db.patch(existing._id, mirroredFields);
            return existing._id;
        }

        return await ctx.db.insert("users", {
            better_auth_user_id: args.betterAuthUserId,
            ...mirroredFields,
        });
    },
});

export const deleteNotificationUser = internalMutation({
    args: {
        betterAuthUserId: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("users")
            .withIndex("by_better_auth_user_id", (q) => q.eq("better_auth_user_id", args.betterAuthUserId))
            .unique();

        if (!existing) {
            return null;
        }

        await ctx.db.delete(existing._id);
        return existing._id;
    },
});
