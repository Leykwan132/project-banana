import { action, query } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { AuthKit, type AuthFunctions } from "@convex-dev/workos-authkit";
import type { DataModel } from "./_generated/dataModel";
import { WorkOS } from "@workos-inc/node";
import { v } from "convex/values";
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { expo } from '@better-auth/expo'
import authConfig from "./auth.config";

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

export const getAuthorisationUrl = action({
    args: {
        provider: v.string(),
        redirectUri: v.string(),
    },
    async handler(_ctx, args) {
        const workos = new WorkOS(process.env.WORKOS_API_KEY);
        const url = workos.userManagement.getAuthorizationUrl({
            clientId: process.env.WORKOS_CLIENT_ID,
            provider: args.provider,
            redirectUri: args.redirectUri,
        });

        return url;
    },
});

export const authenticateWithCode = action({
    args: {
        code: v.string(),
    },
    async handler(_ctx, { code }) {
        const workos = new WorkOS(process.env.WORKOS_API_KEY);
        const response = await workos.userManagement.authenticateWithCode({
            clientId: process.env.WORKOS_CLIENT_ID,
            code,
        });

        return response;
    },
});

export const authComponent = createClient<DataModel>(components.betterAuth);
export const createAuth = (ctx: GenericCtx<DataModel>) => {
    return betterAuth({
        trustedOrigins: [
            "myapp://",
            "projectbananarn://",
            // Development mode - Expo's exp:// scheme with local IP ranges
            "exp://",                      // Trust all Expo URLs (prefix matching)
            "exp://**",                    // Trust all Expo URLs (wildcard matching)
            "exp://[IP_ADDRESS]/**",      // Trust 192.168.x.x IP range with any port and path
            "exp://192.168.100.250:8081"
        ],
        socialProviders: {
            google: {
                clientId: process.env.GOOGLE_CLIENT_ID!,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            }
        },
        database: authComponent.adapter(ctx),
        // Configure simple, non-verified email/password to get started
        emailAndPassword: {
            enabled: true,
            requireEmailVerification: false,
        },
        plugins: [
            // The Expo and Convex plugins are required
            expo(),
            convex({ authConfig }),
        ],
    })
}