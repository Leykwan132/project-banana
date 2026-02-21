import { internalMutation, internalQuery, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { ErrorType } from "./errors";


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


export const internalGetCreatorByUserId = internalQuery({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("creators")
            .withIndex("by_user", (q: any) => q.eq("user_id", args.userId))
            .unique();
    },
});


export const createCreatorByUserId = internalMutation({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db.insert("creators", {
            user_id: args.userId,
            is_deleted: false,
            is_onboarded: false,
            total_views: 0,
            total_earnings: 0,
            balance: 0,
        });
    },
});



export const getCreator = query({
    args: {},
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            throw new ConvexError(ErrorType.NOT_AUTHENTICATED);
        }

        const creator = await ctx.db
            .query("creators")
            .withIndex("by_user", (q: any) => q.eq("user_id", user.subject))
            .unique();

        if (!creator) {
            throw new Error("Creator not found");
        }

        return creator;
    },
});