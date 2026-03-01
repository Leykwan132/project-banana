import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { generateDownloadUrl } from "./s3";

// ============================================================
// ADMIN AUTH HELPER
// ============================================================

async function assertAdmin(ctx: { auth: { getUserIdentity: () => Promise<any> } }) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    let adminIds: string[] = [];
    try {
        adminIds = JSON.parse(process.env.ADMIN_USER_IDS || "[]");
    } catch (e) {
        console.error("Failed to parse ADMIN_USER_IDS", e);
    }

    if (!identity.email || !adminIds.includes(identity.email)) {
        throw new Error("Unauthorized: not an admin");
    }
    return identity;
}

// ============================================================
// ADMIN QUERIES
// ============================================================

/**
 * Check if the currently authenticated user is an admin
 */
export const checkIsAdmin = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return false;

        let adminIds: string[] = [];
        try {
            adminIds = JSON.parse(process.env.ADMIN_USER_IDS || "[]");
        } catch (e) {
            console.error("Failed to parse ADMIN_USER_IDS", e);
        }

        if (!identity.email) return false;
        return adminIds.includes(identity.email);
    },
});

/**
 * Get paginated bank accounts with pending_review status
 */
export const getPendingBankAccounts = query({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, args) => {
        await assertAdmin(ctx);

        return await ctx.db
            .query("bank_accounts")
            .withIndex("by_status", (q) => q.eq("status", "pending_review"))
            .order("desc")
            .paginate(args.paginationOpts);
    },
});

/**
 * Get total count of pending bank accounts
 */
export const getPendingBankAccountsCount = query({
    handler: async (ctx) => {
        await assertAdmin(ctx);

        const all = await ctx.db
            .query("bank_accounts")
            .withIndex("by_status", (q) => q.eq("status", "pending_review"))
            .collect();
        return all.length;
    },
});

/**
 * Get paginated submissions with pending_review status
 */
export const getPendingSubmissions = query({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, args) => {
        await assertAdmin(ctx);

        return await ctx.db
            .query("submissions")
            .withIndex("by_status", (q) => q.eq("status", "pending_review"))
            .order("desc")
            .paginate(args.paginationOpts);
    },
});

/**
 * Get total count of pending submissions
 */
export const getPendingSubmissionsCount = query({
    handler: async (ctx) => {
        await assertAdmin(ctx);

        const all = await ctx.db
            .query("submissions")
            .withIndex("by_status", (q) => q.eq("status", "pending_review"))
            .collect();
        return all.length;
    },
});

/**
 * Get a single submission with campaign info (for detail view)
 */
export const getSubmissionWithCampaign = query({
    args: { submissionId: v.id("submissions") },
    handler: async (ctx, args) => {
        await assertAdmin(ctx);

        const sub = await ctx.db.get(args.submissionId);
        if (!sub) return null;

        const campaign = await ctx.db.get(sub.campaign_id);
        return {
            ...sub,
            campaign_name: campaign?.name ?? "Unknown Campaign",
            campaign_business_id: campaign?.business_id,
        };
    },
});

// ============================================================
// ADMIN MUTATIONS
// ============================================================

/**
 * Approve a bank account (set status to "verified")
 */
export const approveBankAccount = mutation({
    args: {
        bankAccountId: v.id("bank_accounts"),
    },
    handler: async (ctx, args) => {
        await assertAdmin(ctx);

        const account = await ctx.db.get(args.bankAccountId);
        if (!account) throw new Error("Bank account not found");

        await ctx.db.patch(args.bankAccountId, {
            status: "verified",
            updated_at: Date.now(),
        });
    },
});

/**
 * Reject a bank account (set status to "rejected")
 */
export const rejectBankAccount = mutation({
    args: {
        bankAccountId: v.id("bank_accounts"),
    },
    handler: async (ctx, args) => {
        await assertAdmin(ctx);

        const account = await ctx.db.get(args.bankAccountId);
        if (!account) throw new Error("Bank account not found");

        await ctx.db.patch(args.bankAccountId, {
            status: "rejected",
            updated_at: Date.now(),
        });
    },
});

// ============================================================
// ADMIN ACTIONS (S3 signed URLs)
// ============================================================

/**
 * Generate a signed download URL for a bank proof document (admin access)
 */
export const generateAdminProofAccessUrl = action({
    args: {
        s3Key: v.string(),
    },
    handler: async (ctx, args) => {
        await assertAdmin(ctx);
        return await generateDownloadUrl(args.s3Key);
    },
});

/**
 * Generate a signed download URL for a submission video (admin access)
 */
export const generateAdminVideoAccessUrl = action({
    args: {
        s3Key: v.string(),
    },
    handler: async (ctx, args) => {
        await assertAdmin(ctx);
        return await generateDownloadUrl(args.s3Key);
    },
});

// ============================================================
// ADMIN PAYOUT / WITHDRAWAL QUERIES
// ============================================================

/**
 * Get paginated withdrawals with "processing" status (pending admin approval)
 */
export const getPendingWithdrawals = query({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, args) => {
        await assertAdmin(ctx);

        return await ctx.db
            .query("withdrawals")
            .withIndex("by_status", (q) => q.eq("status", "processing"))
            .order("desc")
            .paginate(args.paginationOpts);
    },
});

/**
 * Get total count of pending withdrawals
 */
export const getPendingWithdrawalsCount = query({
    handler: async (ctx) => {
        await assertAdmin(ctx);

        const all = await ctx.db
            .query("withdrawals")
            .withIndex("by_status", (q) => q.eq("status", "processing"))
            .collect();
        return all.length;
    },
});

// ============================================================
// ADMIN PAYOUT / WITHDRAWAL MUTATIONS
// ============================================================

/**
 * Approve a withdrawal (set status to "completed")
 */
export const approveWithdrawal = mutation({
    args: {
        withdrawalId: v.id("withdrawals"),
    },
    handler: async (ctx, args) => {
        await assertAdmin(ctx);

        const withdrawal = await ctx.db.get(args.withdrawalId);
        if (!withdrawal) throw new Error("Withdrawal not found");
        if (withdrawal.status !== "processing") throw new Error("Withdrawal is not in processing state");

        await ctx.db.patch(args.withdrawalId, {
            status: "completed",
        });
    },
});

/**
 * Reject a withdrawal (set status to "failed" and refund balance)
 */
export const rejectWithdrawal = mutation({
    args: {
        withdrawalId: v.id("withdrawals"),
    },
    handler: async (ctx, args) => {
        await assertAdmin(ctx);

        const withdrawal = await ctx.db.get(args.withdrawalId);
        if (!withdrawal) throw new Error("Withdrawal not found");
        if (withdrawal.status !== "processing") throw new Error("Withdrawal is not in processing state");

        await ctx.db.patch(args.withdrawalId, {
            status: "failed",
        });

        // Refund the amount to the creator's balance
        const creator = await ctx.db
            .query("creators")
            .withIndex("by_user", (q) => q.eq("user_id", withdrawal.user_id))
            .unique();

        if (creator) {
            await ctx.db.patch(creator._id, {
                balance: (creator.balance ?? 0) + withdrawal.amount,
            });
        }
    },
});
