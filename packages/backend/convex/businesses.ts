import { mutation, query, action, internalMutation } from "./_generated/server";
import { generateUploadUrl, generateDownloadUrl } from "./r2";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { posthog } from "./posthog";

// ============================================================
// QUERIES
// ============================================================

export const getBusiness = query({
    args: { businessId: v.id("businesses") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.businessId);
    },
});

export const getBusinessByName = query({
    args: { name: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("businesses")
            .withIndex("by_name", (q) => q.eq("name", args.name))
            .unique();
    },
});

export const getMyBusiness = query({
    args: {},
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) return null;

        return await ctx.db
            .query("businesses")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .unique();
    },
});

export const getBusinessByUserId = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("businesses")
            .withIndex("by_user", (q) => q.eq("user_id", args.userId))
            .unique();
    },
});

export const getOnboardingStatus = query({
    args: {},
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) return { isOnboarded: false };

        const business = await ctx.db
            .query("businesses")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .unique();

        return { isOnboarded: business?.is_onboarded ?? false };
    }
});

// ============================================================
// MUTATIONS
// ============================================================

/** Internal mutation that handles the DB write for createBusiness. */
export const createBusinessRecord = internalMutation({
    args: {
        userId: v.string(),
        name: v.string(),
        logo_url: v.optional(v.string()),
        logo_r2_key: v.optional(v.string()),
        industry: v.optional(v.string()),
        size: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<import("./_generated/dataModel").Id<"businesses">> => {
        // Check if name exists
        const existing = await ctx.db
            .query("businesses")
            .withIndex("by_name", (q) => q.eq("name", args.name))
            .unique();

        if (existing) {
            throw new Error("Business name already exists");
        }

        const now = Date.now();
        const businessId = await ctx.db.insert("businesses", {
            user_id: args.userId,
            name: args.name,
            logo_url: args.logo_url,
            logo_r2_key: args.logo_r2_key,
            industry: args.industry,
            size: args.size,
            credit_balance: 0,
            pending_approvals: 0,
            is_onboarded: false,
            updated_at: now,
            created_at: now,
        });

        await posthog.capture(ctx, {
            distinctId: businessId,
            event: "business_created",
            properties: {
                name: args.name,
                industry: args.industry,
                size: args.size,
            }
        });

        return businessId;
    },
});

export const createBusiness = action({
    args: {
        name: v.string(),
        logo_url: v.optional(v.string()),
        logo_r2_key: v.optional(v.string()),
        industry: v.optional(v.string()),
        size: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<import("./_generated/dataModel").Id<"businesses">> => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) throw new Error("Unauthenticated call to action");

        const businessId = await ctx.runMutation(internal.businesses.createBusinessRecord, {
            userId: user.subject,
            name: args.name,
            logo_url: args.logo_url,
            logo_r2_key: args.logo_r2_key,
            industry: args.industry,
            size: args.size,
        });

        // Send the welcome email asynchronously.
        const email = user.email;
        const firstName = user.givenName ?? user.name?.split(' ')[0] ?? args.name;
        if (email) {
            ctx.runAction(internal.emails.sendWelcomeEmailBusiness, {
                email,
                firstName,
            }).catch(console.error);
        }

        return businessId;
    },
});


export const updateBusiness = mutation({
    args: {
        businessId: v.id("businesses"),
        name: v.optional(v.string()),
        logo_url: v.optional(v.string()),
        logo_r2_key: v.optional(v.string()),
        industry: v.optional(v.string()),
        size: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) throw new Error("Unauthenticated call to mutation");

        const business = await ctx.db.get(args.businessId);
        if (!business) {
            throw new Error("Business not found");
        }

        if (business.user_id !== user.subject) {
            throw new Error("Unauthorized: You do not own this business");
        }

        if (args.name !== undefined && args.name !== business.name) {
            const existing = await ctx.db
                .query("businesses")
                .withIndex("by_name", (q) => q.eq("name", args.name!))
                .unique();

            if (existing) {
                throw new Error("Business name already exists");
            }
        }

        await ctx.db.patch(args.businessId, {
            name: args.name,
            logo_url: args.logo_url,
            logo_r2_key: args.logo_r2_key,
            industry: args.industry,
            size: args.size,
            updated_at: Date.now(),
        });

        return args.businessId;
    },
});

// Internal/Admin mutation to add credits
export const addCredits = internalMutation({
    args: {
        businessId: v.id("businesses"),
        amount: v.number(),
        reference: v.optional(v.string()), // e.g. Stripe payment ID
    },
    handler: async (ctx, args) => {
        const business = await ctx.db.get(args.businessId);
        if (!business) {
            throw new Error("Business not found");
        }

        const now = Date.now();
        const newBalance = business.credit_balance + args.amount;

        await ctx.db.patch(args.businessId, {
            credit_balance: newBalance,
            updated_at: now,
        });

        // Record transaction
        await ctx.db.insert("credits", {
            business_id: args.businessId,
            amount: args.amount,
            status: "completed",
            type: "top_up",
            reference: args.reference,
            created_at: now,
        });

        return newBalance;
    },
});

export const setBusinessOnboarded = internalMutation({
    args: {
        businessId: v.string(),
        isOnboarded: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const business = await ctx.db.get(args.businessId as Id<"businesses">);
        if (!business) {
            throw new Error("Business not found");
        }

        if (args.isOnboarded === undefined) {
            return { success: true };
        }

        await ctx.db.patch(business._id, {
            is_onboarded: args.isOnboarded,
            updated_at: Date.now(),
        });

        if (args.isOnboarded) {
            await posthog.capture(ctx, {
                distinctId: business._id,
                event: "business_onboarding_completed",
            });
        }

        return { success: true };
    },
});

// ============================================================
// ACTIONS
// ============================================================

export const generateLogoUploadUrl = action({
    args: {
        contentType: v.string(), // e.g. "image/png"
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to action");
        }
        const key = crypto.randomUUID();
        // Assume logos are stored in a 'logos/' prefix
        const r2Key = `logos/${key}`;
        const uploadUrl = await generateUploadUrl(r2Key, args.contentType);
        return { uploadUrl, r2Key };
    },
});

export const generateLogoAccessUrl = action({
    args: {
        businessId: v.id("businesses"),
    },
    handler: async (ctx, args) => {
        // Business logos are generally public info, but we can check auth if needed.
        // For now, let's allow it without strict auth check, or simple check.
        // But to be safe, let's check if the business exists.
        const business = await ctx.runQuery(api.businesses.getBusiness, { businessId: args.businessId });

        if (!business || !business.logo_r2_key) {
            return null;
        }

        const url = await generateDownloadUrl(business.logo_r2_key);
        return url;
    },
});
