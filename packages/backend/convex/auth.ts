import { query } from "./_generated/server";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { createClient, type GenericCtx, type AuthFunctions } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { expo } from '@better-auth/expo'
import authConfig from "./auth.config";

// @ts-ignore
const authFunctions: AuthFunctions = internal.auth;
const siteUrl = process.env.SITE_URL!;

export const authComponent: any = createClient<DataModel>(components.betterAuth, {
    authFunctions,
    triggers: {
        user: {
            onCreate: async (ctx, user) => {
                await ctx.runMutation(internal.users.ensureNotificationUser, {
                    betterAuthUserId: user._id,
                    email: user.email ?? undefined,
                    emailVerified: user.emailVerified ?? undefined,
                    image: user.image ?? undefined,
                    isAnonymous: user.isAnonymous ?? undefined,
                    name: user.name ?? undefined,
                    phoneNumber: user.phoneNumber ?? undefined,
                    phoneNumberVerified: user.phoneNumberVerified ?? undefined,
                    twoFactorEnabled: user.twoFactorEnabled ?? undefined,
                    username: user.username ?? undefined,
                    displayUsername: user.displayUsername ?? undefined,
                    createdAt: user.createdAt ?? undefined,
                    updatedAt: user.updatedAt ?? undefined,
                });
            },
            onUpdate: async (ctx, _oldUser, newUser) => {
                await ctx.runMutation(internal.users.ensureNotificationUser, {
                    betterAuthUserId: newUser._id,
                    email: newUser.email ?? undefined,
                    emailVerified: newUser.emailVerified ?? undefined,
                    image: newUser.image ?? undefined,
                    isAnonymous: newUser.isAnonymous ?? undefined,
                    name: newUser.name ?? undefined,
                    phoneNumber: newUser.phoneNumber ?? undefined,
                    phoneNumberVerified: newUser.phoneNumberVerified ?? undefined,
                    twoFactorEnabled: newUser.twoFactorEnabled ?? undefined,
                    username: newUser.username ?? undefined,
                    displayUsername: newUser.displayUsername ?? undefined,
                    createdAt: newUser.createdAt ?? undefined,
                    updatedAt: newUser.updatedAt ?? undefined,
                });
            },
            onDelete: async (ctx, user) => {
                await ctx.runMutation(internal.users.deleteNotificationUser, {
                    betterAuthUserId: user._id,
                });
            },
        },
    },
});



export const getCurrentUser = query({
    args: {},
    handler: async (ctx) => {
        return authComponent.getAuthUser(ctx);
    },
});


export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
    return {
        trustedOrigins: [
            "myapp://",
            "projectbanana://",
            // Development mode - Expo's exp:// scheme with local IP ranges
            "exp://",                      // Trust all Expo URLs (prefix matching)
            "exp://**",                    // Trust all Expo URLs (wildcard matching)
            "exp://[IP_ADDRESS]/**",      // Trust 192.168.x.x IP range with any port and path
            "exp://192.168.100.250:8081",
            "https://appleid.apple.com",
            siteUrl,
        ],
        socialProviders: {
            google: {
                clientId: process.env.GOOGLE_CLIENT_ID!,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            },
            apple: {
                clientId: "",
                clientSecret: "",
                // Optional
                appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER as string,
            },
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
    } satisfies BetterAuthOptions
}

export const createAuth = (ctx: GenericCtx<DataModel>) => {
    return betterAuth(createAuthOptions(ctx))
}
