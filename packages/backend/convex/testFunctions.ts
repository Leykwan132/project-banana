import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

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

export const testTrackEvent = mutation({
    args: {},
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) throw new Error("Unauthenticated call");

        await ctx.scheduler.runAfter(0, internal.analytics.trackEvent, {
            distinctId: user.subject,
            event: "test_event",
            properties: {
                test_property: "test_value"
            }
        });

        return "Event scheduled!";
    }
});