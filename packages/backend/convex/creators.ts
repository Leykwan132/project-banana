import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { ErrorType } from "./errors";
import { internal } from "./_generated/api";
import { posthog } from "./posthog";

export const getCreatorById = query({
    args: { creatorId: v.id("creators") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.creatorId);
    },
});

export const getCreatorByUserId = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("creators")
            .withIndex("by_user", (q: any) => q.eq("user_id", args.userId))
            .unique();
    },
});

export const getCreator = query({
    args: {},
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            throw new ConvexError(ErrorType.NOT_AUTHENTICATED);
        }

        console.log("user", user)
        const creator = await ctx.db
            .query("creators")
            .withIndex("by_user", (q: any) => q.eq("user_id", user.subject))
            .unique();

        console.log("creator", creator)
        if (!creator) {
            throw new ConvexError(ErrorType.CREATOR_NOT_FOUND);
        }

        return creator;
    },
});

export const checkUsernameAvailability = query({
    args: { username: v.string() },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("creators")
            .withIndex("by_username", (q: any) => q.eq("username", args.username.toLowerCase()))
            .unique();
        return { available: !existing };
    },
});

export const completeOnboarding = mutation({
    args: {
        username: v.string(),
        signupGoal: v.array(v.string()),
        referralSource: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            throw new ConvexError(ErrorType.NOT_AUTHENTICATED);
        }

        // Check if creator already exists
        const existingCreator = await ctx.db
            .query("creators")
            .withIndex("by_user", (q: any) => q.eq("user_id", user.subject))
            .unique();

        if (existingCreator) {
            return existingCreator._id;
        }

        // Check username uniqueness
        const usernameLower = args.username.toLowerCase();
        const existingUsername = await ctx.db
            .query("creators")
            .withIndex("by_username", (q: any) => q.eq("username", usernameLower))
            .unique();

        if (existingUsername) {
            throw new ConvexError(ErrorType.USERNAME_TAKEN);
        }

        const creatorId = await ctx.db.insert("creators", {
            user_id: user.subject,
            name: user.name ?? args.username,
            username: usernameLower,
            signup_goal: args.signupGoal,
            referral_source: args.referralSource,
            is_deleted: false,
            total_views: 0,
            total_earnings: 0,
            balance: 0,
        });

        // Fire welcome email & Loops contact (fire and forget)
        if (user.email) {
            await ctx.scheduler.runAfter(0, internal.emails.internalAddContact, {
                email: user.email,
                firstName: user.name ?? args.username,
            });
            await ctx.scheduler.runAfter(0, internal.emails.sendWelcomeEmail, {
                email: user.email,
                firstName: user.name ?? args.username,
            });
        }

        // Track Onboarding
        await posthog.capture(ctx, {
            distinctId: creatorId,
            event: "onboarding_completed",
            properties: {
                username: usernameLower,
                signup_goal: args.signupGoal,
                referral_source: args.referralSource,
            }
        });

        return creatorId;
    },
});