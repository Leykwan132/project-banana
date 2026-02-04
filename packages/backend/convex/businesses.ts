import { mutation, query, action, internalMutation } from "./_generated/server";
import { generateUploadUrl, generateDownloadUrl } from "./s3";
import { api } from "./_generated/api";
import { v } from "convex/values";

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
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
            .unique();

        if (!user) return null;

        return await ctx.db
            .query("businesses")
            .withIndex("by_user", (q) => q.eq("user_id", user._id))
            .unique();
    },
});

export const getBusinessByUserId = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("businesses")
            .withIndex("by_user", (q) => q.eq("user_id", args.userId))
            .unique();
    },
});

// ============================================================
// MUTATIONS
// ============================================================

export const createBusiness = mutation({
    args: {
        name: v.string(),
        logo_url: v.optional(v.string()),
        logo_s3_key: v.optional(v.string()),
        industry: v.optional(v.string()),
        size: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to mutation");
        }

        // Check if name exists
        const existing = await ctx.db
            .query("businesses")
            .withIndex("by_name", (q) => q.eq("name", args.name))
            .unique();

        if (existing) {
            throw new Error("Business name already exists");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
            .unique();

        if (!user) {
            throw new Error("User not found");
        }

        const now = Date.now();
        const businessId = await ctx.db.insert("businesses", {
            user_id: user._id,
            name: args.name,
            logo_url: args.logo_url,
            logo_s3_key: args.logo_s3_key,
            industry: args.industry,
            size: args.size,
            credit_balance: 0,
            pending_approvals: 0,
            created_at: now,
            updated_at: now,
        });

        return businessId;
    },
});

export const updateBusiness = mutation({
    args: {
        businessId: v.id("businesses"),
        name: v.optional(v.string()),
        logo_url: v.optional(v.string()),
        logo_s3_key: v.optional(v.string()),
        industry: v.optional(v.string()),
        size: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to mutation");
        }

        const business = await ctx.db.get(args.businessId);
        if (!business) {
            throw new Error("Business not found");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
            .unique();

        if (!user) {
            throw new Error("User not found");
        }

        if (business.user_id !== user._id) {
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
            logo_s3_key: args.logo_s3_key,
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
        const s3Key = `logos/${key}`;
        const uploadUrl = await generateUploadUrl(s3Key, args.contentType);
        return { uploadUrl, s3Key };
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

        if (!business || !business.logo_s3_key) {
            return null;
        }

        const url = await generateDownloadUrl(business.logo_s3_key);
        return url;
    },
});
