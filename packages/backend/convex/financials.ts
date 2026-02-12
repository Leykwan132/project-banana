import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
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

        const creator = await getCreatorByUserId(ctx, String(user._id));
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
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) throw new Error("User not found");

        const creator = await getCreatorByUserId(ctx, user.subject);
        const bankAccount = creator?.bank_account;
        const bankName = creator?.bank_name;
        if (!bankAccount || !bankName) {
            throw new Error("Please add bank details to your profile first");
        }

        // Check balance
        // This duplicates logic in getBalance, ideally extracted helper
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

        const currentBalance = (creator?.total_earnings ?? 0) - totalWithdrawn;

        if (args.amount > currentBalance) {
            throw new Error("Insufficient balance");
        }

        const now = Date.now();
        await ctx.db.insert("withdrawals", {
            user_id: user.subject,
            amount: args.amount,
            status: "processing",
            bank_account: bankAccount,
            bank_name: bankName,
            requested_at: now,
            created_at: now,
        });
    },
});
