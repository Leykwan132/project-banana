import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ============================================================
// QUERIES
// ============================================================

export const getUser = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return null;
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
            .unique();

        return user;
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
            .withIndex("by_authId", (q) => q.eq("authId", args.authId))
            .unique();
    },
});

export const getUserBalance = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return { balance: 0 };
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
            .unique();

        if (!user) {
            return { balance: 0 };
        }

        return { balance: user.balance ?? 0 };
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
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Called createUser without authentication present");
        }

        // Check if user already exists
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
            .unique();

        if (existingUser) {
            return existingUser._id;
        }

        const now = Date.now();
        const userId = await ctx.db.insert("users", {
            name: args.name,
            profile_pic_url: args.profile_pic_url,
            total_views: 0,
            total_earnings: 0,
            joined_at: now,
            bank_account: args.bank_account,
            bank_name: args.bank_name,
            authId: identity.subject,
            created_at: now,
            updated_at: now,
        });

        return userId;
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
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthenticated");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
            .unique();

        if (!user) {
            throw new Error("User not found");
        }

        // If changing name, check uniqueness (no uniqueness check for name)
        if (args.name !== undefined && args.name !== user.name) {
            // No uniqueness check for name
        }

        await ctx.db.patch(user._id, {
            ...args,
            updated_at: Date.now(),
        });

        return user._id;
    },
});

// Get onboarding status for the current user
export const getOnboardingStatus = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return { isOnboarded: false };
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
            .unique();

        if (!user) {
            return { isOnboarded: false };
        }

        return { isOnboarded: user.isOnboarded ?? false };
    },
});

// Set user as onboarded (called from webhook after first subscription)
export const setUserOnboarded = mutation({
    args: {
        authId: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_authId", (q) => q.eq("authId", args.authId))
            .unique();

        if (!user) {
            console.error(`User not found for authId: ${args.authId}`);
            return { success: false, error: "User not found" };
        }

        // Only set if not already onboarded
        if (!user.isOnboarded) {
            await ctx.db.patch(user._id, {
                isOnboarded: true,
                updated_at: Date.now(),
            });
        }

        return { success: true };
    },
});
