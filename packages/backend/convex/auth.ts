import { action, query } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { AuthKit, type AuthFunctions } from "@convex-dev/workos-authkit";
import type { DataModel } from "./_generated/dataModel";
import { WorkOS } from "@workos-inc/node";
import { v } from "convex/values";
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { expo } from '@better-auth/expo'
import authConfig from "./auth.config";

const authFunctions: AuthFunctions = internal.auth;
const siteUrl = process.env.SITE_URL!;

export const authKit = new AuthKit<DataModel>(components.workOSAuthKit, {
    authFunctions,
    additionalEventTypes: ["session.created", "user.created"],
});

export const { authKitEvent } = authKit.events({
    "user.created": async (_ctx, event) => {
        // Better Auth component persists users in the `user` table.
        // Keep this for side effects/logging only.
        console.log('onCreateUser', event);
    },

    // Handle any event type
    "session.created": async (ctx, event) => {
        console.log("onCreateSession", event);
    },
    "user.updated": async (ctx, event) => {
        console.log("onUpdateUser", event);
    },
    "user.deleted": async (ctx, event) => {
        // Better Auth owns the user record lifecycle.
        // Keep this hook for side effects if needed.
        console.log("onDeleteUser", event.data.id);
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
        try {
            return await authKit.getAuthUser(ctx);
        } catch (error) {
            if (isUnauthenticatedError(error)) {
                return null;
            }
            throw error;
        }
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
const isUnauthenticatedError = (error: unknown) => {
    const message = String((error as any)?.message ?? error).toLowerCase();
    if (message.includes("unauthenticated")) return true;

    const code = String((error as any)?.code ?? "").toLowerCase();
    if (code.includes("unauthenticated")) return true;

    const data = String((error as any)?.data ?? "").toLowerCase();
    if (data.includes("unauthenticated")) return true;

    const cause = String((error as any)?.cause ?? "").toLowerCase();
    if (cause.includes("unauthenticated")) return true;

    return false;
};


export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
    return {
        trustedOrigins: [
            "myapp://",
            "projectbananarn://",
            // Development mode - Expo's exp:// scheme with local IP ranges
            "exp://",                      // Trust all Expo URLs (prefix matching)
            "exp://**",                    // Trust all Expo URLs (wildcard matching)
            "exp://[IP_ADDRESS]/**",      // Trust 192.168.x.x IP range with any port and path
            "exp://192.168.100.250:8081",
            siteUrl,
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
            crossDomain({ siteUrl }),
            convex({ authConfig }),
        ],
        databaseHooks: {
            user: {
                create: {
                    after: async (user) => {
                        await (ctx as any).runMutation(internal.creators.createCreatorByUserId, {
                            userId: user.id,
                        });
                        console.log("Creator created with ID", user.id);
                    },
                },
            }
        },
    } satisfies BetterAuthOptions
}

export const createAuth = (ctx: GenericCtx<DataModel>) => {
    return betterAuth(createAuthOptions(ctx))
}
