import { query } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { AuthKit, type AuthFunctions } from "@convex-dev/workos-authkit";
import type { DataModel } from "./_generated/dataModel";

const authFunctions: AuthFunctions = internal.auth;

export const authKit = new AuthKit<DataModel>(components.workOSAuthKit, {
    authFunctions,
    additionalEventTypes: ["session.created", "user.created"],
});

export const { authKitEvent } = authKit.events({
    "user.created": async (ctx, event) => {
        console.log('onCreateUser', event);
        await ctx.db.insert("users", {
            authId: event.data.id,
            email: event.data.email,
            name: `${event.data.firstName} ${event.data.lastName}`,
            profile_pic_url: event.data.profilePictureUrl ?? undefined, // Handle null
            total_views: 0,
            total_earnings: 0,
            joined_at: Date.now(),
            created_at: Date.now(),
            updated_at: Date.now(),
        });
    },

    // Handle any event type
    "session.created": async (ctx, event) => {
        console.log("onCreateSession", event);
    },
    "user.updated": async (ctx, event) => {
        console.log("onUpdateUser", event);
    },
    "user.deleted": async (ctx, event) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_authId", (q) => q.eq("authId", event.data.id))
            .unique();

        if (user) {
            await ctx.db.patch(user._id, { isDeleted: true });
        }
    },
});

export const { authKitAction } = authKit.actions({
    userRegistration: async (_ctx, _action, response) => {
        return response.allow();
    },
    authentication: async (_ctx, _action, response) => {
        return response.allow();
    },
});

export const getCurrentUser = query({
    args: {},
    handler: async (ctx, _args) => {
        const user = await authKit.getAuthUser(ctx);
        return user;
    },
});