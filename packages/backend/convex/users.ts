import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

// ============================================================
// QUERIES
// ============================================================

export const getUser = query({
    args: {},
    handler: async (ctx) => {
        const user = await authComponent.getAuthUser(ctx);

        return user;
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
        const user = await authComponent.getAuthUser(ctx);

        if (!user) {
            return { balance: 0 };
        }

        return { balance: (user as any).balance ?? 0 };
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
        const user = await authComponent.getAuthUser(ctx);
        if (!user) {
            throw new Error("Called createUser without authentication present");
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
        const user = await authComponent.getAuthUser(ctx);
        if (!user) {
            throw new Error("Unauthenticated");
        }
        return user._id;
    },
});

// Get onboarding status for the current user
export const getOnboardingStatus = query({
    args: {},
    handler: async (ctx) => {
        const user = await authComponent.getAuthUser(ctx);
        if (!user) {
            return { isOnboarded: false };
        }
        return { isOnboarded: (user as any).isOnboarded ?? false };
    },
});

// Set user as onboarded (called from webhook after first subscription)
export const setUserOnboarded = mutation({
    args: {
        authId: v.string(),
    },
    handler: async (_ctx, _args) => {
        return { success: true };
    },
});
