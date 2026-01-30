import { v } from "convex/values";
import { query } from "./_generated/server";

export const listNumbers = query({
    args: {
        count: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        return {
            viewer: user?.name ?? null,
            numbers: 12,
        };
    },
});