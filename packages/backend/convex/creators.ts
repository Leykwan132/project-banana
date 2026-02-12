import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";


export const getCreatorById = query({
    args: { creatorId: v.id("creators") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.creatorId);
    },
});

export const getCreatorByUserId = async (ctx: any, userId: string) => {
    return await ctx.db
        .query("creators")
        .withIndex("by_user", (q: any) => q.eq("user_id", userId))
        .unique();
};


// Helper for direct DB access
export const createCreator = async (ctx: any, userId: string) => {
    return await ctx.db.insert("creators", {
        user_id: userId,
        is_deleted: false,
        is_onboarded: false,
        total_views: 0,
        total_earnings: 0,
        balance: 0,
    });
};

export const createCreatorByUserId = internalMutation({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        return await createCreator(ctx, args.userId);
    },
});



