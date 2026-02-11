import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ============================================================
// BANK ACCOUNT QUERIES
// ============================================================

/**
 * Get all bank accounts for the current authenticated user
 */
export const getUserBankAccounts = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
            .unique();

        if (!user) return [];

        return await ctx.db
            .query("bank_accounts")
            .withIndex("by_user", (q) => q.eq("user_id", user._id))
            .order("desc")
            .collect();
    },
});

/**
 * Get only verified (active) bank accounts for the current authenticated user
 */
export const getActiveBankAccounts = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
            .unique();

        if (!user) return [];

        const allAccounts = await ctx.db
            .query("bank_accounts")
            .withIndex("by_user", (q) => q.eq("user_id", user._id))
            .collect();

        return allAccounts.filter((account) => account.status === "verified");
    },
});

// ============================================================
// BANK ACCOUNT MUTATIONS
// ============================================================

/**
 * Create a new bank account for the current authenticated user
 */
export const createBankAccount = mutation({
    args: {
        bankName: v.string(),
        accountNumber: v.string(),
        proofDocumentUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");

        const now = Date.now();

        const bankAccountId = await ctx.db.insert("bank_accounts", {
            user_id: user._id,
            bank_name: args.bankName,
            account_number: args.accountNumber,
            status: "pending_review",
            proof_document_url: args.proofDocumentUrl,
            created_at: now,
            updated_at: now,
        });

        return bankAccountId;
    },
});
