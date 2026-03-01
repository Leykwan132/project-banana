import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { authComponent } from "./auth";
import { api, components, internal } from "./_generated/api";
import { getCreatorByUserId } from "./creators";
import { ErrorType } from "./errors";

// ============================================================
// QUERIES
// ============================================================

export const getPayouts = query({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            throw new ConvexError(ErrorType.NOT_AUTHENTICATED);
        }

        return await ctx.db
            .query("payouts")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .order("desc")
            .paginate(args.paginationOpts);
    },
});

export const getWithdrawals = query({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) return { page: [], isDone: true, continueCursor: "" };

        return await ctx.db
            .query("withdrawals")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .order("desc")
            .paginate(args.paginationOpts);
    },
});

export const getBalance = query({
    args: {},
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) return 0;

        // Calculate balance: (Total Payouts) - (Total Withdrawals [completed/pending])
        // Note: In production, rely on a stored 'balance' field or transactional sum
        // For now, let's use the 'total_earnings' as lifetime credits, and sum withdrawals.

        const withdrawals = await ctx.db
            .query("withdrawals")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .collect();

        const totalWithdrawn = withdrawals.reduce((sum, w) => {
            if (w.status !== "failed" && w.status !== "rejected") {
                return sum + w.amount;
            }
            return sum;
        }, 0);

        const creator: any = await ctx.runQuery(api.creators.getCreatorByUserId, { userId: user.subject });
        const totalEarnings = creator?.total_earnings ?? 0;
        return totalEarnings - totalWithdrawn;
    }
});

// ============================================================
// MUTATIONS
// ============================================================

export const createWithdrawal = mutation({
    args: {
        amount: v.number(),
        bankAccountId: v.id("bank_accounts"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) throw new Error("User not found");

        // Check balance
        const withdrawals = await ctx.db
            .query("withdrawals")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .collect();

        const totalWithdrawn = withdrawals.reduce((sum, w) => {
            if (w.status !== "failed" && w.status !== "rejected") {
                return sum + w.amount;
            }
            return sum;
        }, 0);

        const creator: any = await ctx.runQuery(api.creators.getCreatorByUserId, { userId: user.subject });
        const currentBalance = (creator?.total_earnings ?? 0) - totalWithdrawn;

        if (args.amount > currentBalance) {
            throw new Error("Insufficient balance");
        }

        const now = Date.now();
        await ctx.db.insert("withdrawals", {
            user_id: user.subject,
            bank_account_id: args.bankAccountId,
            amount: args.amount,
            status: "processing",
            created_at: now,
        });
    },
});
