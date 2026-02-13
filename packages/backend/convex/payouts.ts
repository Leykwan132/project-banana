import { action, mutation, query, internalMutation, internalQuery, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ============================================================
// PAYOUT QUERIES
// ============================================================

/**
 * Get all payouts for the current authenticated user
 */
export const getUserPayouts = query({
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) return [];

        return await ctx.db
            .query("payouts")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .order("desc")
            .collect();
    },
});

/**
 * Get payout by ID
 */
export const getPayout = query({
    args: { payoutId: v.id("payouts") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.payoutId);
    },
});

// ============================================================
// WITHDRAWAL QUERIES
// ============================================================

/**
 * Get all withdrawals for the current authenticated user
 */
export const getUserWithdrawals = query({
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) return [];

        return await ctx.db
            .query("withdrawals")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .order("desc")
            .collect();
    },
});

/**
 * Get withdrawal by ID
 */
export const getWithdrawal = query({
    args: { withdrawalId: v.id("withdrawals") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.withdrawalId);
    },
});

// ============================================================
// PAYOUT MUTATIONS
// ============================================================

/**
 * Create a new payout (usually called by admin/system)
 */
export const createPayout = mutation({
    args: {
        userId: v.id("user"),
        applicationId: v.optional(v.id("applications")),
        amount: v.number(),
    },
    handler: async (ctx, args) => {
        const now = Date.now();

        const payoutId = await ctx.db.insert("payouts", {
            user_id: args.userId,
            application_id: args.applicationId,
            amount: args.amount,
            status: "pending",
            created_at: now,
            updated_at: now,
        });

        return payoutId;
    },
});

/**
 * Update payout status
 */
export const updatePayoutStatus = mutation({
    args: {
        payoutId: v.id("payouts"),
        status: v.string(), // "pending" | "processing" | "completed" | "failed"
    },
    handler: async (ctx, args) => {
        const payout = await ctx.db.get(args.payoutId);
        if (!payout) throw new Error("Payout not found");

        await ctx.db.patch(args.payoutId, {
            status: args.status,
            updated_at: Date.now(),
        });
    },
});

// ============================================================
// WITHDRAWAL MUTATIONS
// ============================================================

/**
 * Request a withdrawal
 */
/**
 * Internal mutation to handle the actual withdrawal logic atomically
 */
/**
 * Internal query to check balance before processing withdrawal
 */
export const internalCheckSufficientBalance = internalQuery({
    args: {
        userId: v.string(),
        amount: v.number(),
    },
    handler: async (ctx, args) => {
        const creator = await ctx.db
            .query("creators")
            .withIndex("by_user", (q) => q.eq("user_id", args.userId))
            .unique();

        if (!creator) throw new Error("Creator not found");

        const currentBalance = creator?.balance ?? 0;
        if (currentBalance < args.amount) {
            throw new Error("Insufficient balance");
        }
    },
});

/**
 * Internal mutation to handle the actual withdrawal logic atomically
 */
export const internalProcessWithdrawal = internalMutation({
    args: {
        userId: v.string(),
        amount: v.number(),
        bankAccount: v.string(),
        bankName: v.string(),
    },
    handler: async (ctx, args) => {
        // Direct DB access is efficient here since we are in a mutation
        const creator = await ctx.db
            .query("creators")
            .withIndex("by_user", (q) => q.eq("user_id", args.userId))
            .unique();

        if (!creator) throw new Error("Creator not found");

        const currentBalance = creator?.balance ?? 0;
        if (currentBalance < args.amount) {
            throw new Error("Insufficient balance");
        }

        const now = Date.now();
        const withdrawalId = await ctx.db.insert("withdrawals", {
            user_id: args.userId,
            amount: args.amount,
            status: "processing",
            bank_account: args.bankAccount,
            bank_name: args.bankName,
            requested_at: now,
            created_at: now,
        });

        // Decrement user balance immediately
        await ctx.db.patch(creator._id, {
            balance: currentBalance - args.amount,
        });

        return withdrawalId;
    },
});

/**
 * Request a withdrawal (Action)
 */
export const requestWithdrawal = action({
    args: {
        amount: v.number(),
        bankAccount: v.string(),
        bankName: v.string(),
    },
    handler: async (ctx, args): Promise<Id<"withdrawals">> => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) throw new Error("User not found");


        // Check balance first
        await ctx.runQuery(internal.payouts.internalCheckSufficientBalance, {
            userId: user.subject,
            amount: args.amount,
        });

        // run the payout function http by billz

        // Execute the DB operations as a single transaction via internal mutation
        return await ctx.runMutation(internal.payouts.internalProcessWithdrawal, {
            userId: user.subject,
            amount: args.amount,
            bankAccount: args.bankAccount,
            bankName: args.bankName,
        });
    },
});

/**
 * Mock function to process payout (for testing purposes)
 */
export const mockProcessPayout = mutation({
    args: {
        withdrawalId: v.id("withdrawals"),
        status: v.string(), // "completed" | "failed"
    },
    handler: async (ctx, args) => {
        const withdrawal = await ctx.db.get(args.withdrawalId);
        if (!withdrawal) throw new Error("Withdrawal not found");

        if (withdrawal.status !== "processing") {
            throw new Error("Withdrawal is not in processing state");
        }

        const updates: any = {
            status: args.status,
            processed_at: Date.now(),
        };

        await ctx.db.patch(args.withdrawalId, updates);

        // If failed, refund the balance
        if (args.status === "failed") {
            const creator: any = await ctx.runQuery(api.creators.getCreatorByUserId, { userId: withdrawal.user_id });
            if (creator) {
                await ctx.db.patch(creator._id, {
                    balance: (creator.balance ?? 0) + withdrawal.amount,
                });
            }
        }
    },
});

/**
 * Update withdrawal status (admin/system function)
 */
export const updateWithdrawalStatus = mutation({
    args: {
        withdrawalId: v.id("withdrawals"),
        status: v.string(), // "pending" | "processing" | "completed" | "failed"
    },
    handler: async (ctx, args) => {
        const withdrawal = await ctx.db.get(args.withdrawalId);
        if (!withdrawal) throw new Error("Withdrawal not found");

        const updateData: any = {
            status: args.status,
        };

        // Set processed_at when status is completed or failed
        if (args.status === "completed" || args.status === "failed") {
            updateData.processed_at = Date.now();
        }

        await ctx.db.patch(args.withdrawalId, updateData);

        // If failed, a balance refund should be handled by creator-ledger state.
    },
});

/**
 * Cancel a pending withdrawal
 */
export const cancelWithdrawal = mutation({
    args: {
        withdrawalId: v.id("withdrawals"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) throw new Error("User not found");

        const withdrawal = await ctx.db.get(args.withdrawalId);
        if (!withdrawal) throw new Error("Withdrawal not found");

        // Verify ownership
        if (withdrawal.user_id !== user.subject) {
            throw new Error("Unauthorized");
        }

        // Can only cancel pending withdrawals
        if (withdrawal.status !== "pending") {
            throw new Error("Can only cancel pending withdrawals");
        }

        // Mark as failed and refund
        await ctx.db.patch(args.withdrawalId, {
            status: "failed",
            processed_at: Date.now(),
        });

        // Refund the amount
        // Balance refund is intentionally skipped here and should be handled by creator-ledger state.
    },
});
