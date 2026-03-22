import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { Id } from "./_generated/dataModel";
import { generateDownloadUrl } from "./r2";
import { WithdrawalSourceType } from "./constants";
import { NotificationCopy, NotificationType } from "./notificationConstants";
import { createBillplzPaymentOrder } from "./payouts";

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

        const result = await ctx.db
            .query("bank_accounts")
            .withIndex("by_status", (q) => q.eq("status", "pending_review"))
            .order("desc")
            .paginate(args.paginationOpts);

        return {
            ...result,
            page: result.page.map((account) => {
                const legacyProofKey = (account as any).proof_document_url as string | undefined;
                return {
                    ...account,
                    proof_document_r2_key: account.proof_document_r2_key ?? legacyProofKey,
                };
            }),
        };
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

export const getPendingBankAccountsForCron = internalQuery({
    args: {},
    handler: async (ctx) => {
        const accounts = await ctx.db
            .query("bank_accounts")
            .withIndex("by_status", (q) => q.eq("status", "pending_review"))
            .order("desc")
            .collect();

        return accounts.map((account) => ({
            _id: account._id,
            bank_name: account.bank_name,
            account_holder_name: account.account_holder_name,
            account_number: account.account_number,
            source_type: account.source_type ?? WithdrawalSourceType.Creator,
            created_at: account.created_at,
        }));
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

export const getPendingSubmissionsCountForCron = internalQuery({
    args: {},
    handler: async (ctx) => {
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

export const getWithdrawalForApproval = internalQuery({
    args: {
        withdrawalId: v.id("withdrawals"),
    },
    handler: async (ctx, args) => {
        const withdrawal = await ctx.db.get(args.withdrawalId);
        if (!withdrawal) {
            return null;
        }

        const sourceType = withdrawal.source_type ?? WithdrawalSourceType.Creator;
        const bankAccount = await ctx.db.get(withdrawal.bank_account_id);
        let requesterName = withdrawal.user_id;

        if (sourceType === WithdrawalSourceType.Business && withdrawal.business_id) {
            const business = await ctx.db.get(withdrawal.business_id);
            requesterName = business?.name ?? withdrawal.user_id;
        } else {
            const creator = await ctx.db
                .query("creators")
                .withIndex("by_user", (q) => q.eq("user_id", withdrawal.user_id))
                .unique();
            requesterName = creator?.name ?? withdrawal.user_id;
        }

        return {
            withdrawal,
            bankAccount,
            requesterName,
        };
    },
});

export const markWithdrawalProcessingAfterApproval = internalMutation({
    args: {
        withdrawalId: v.id("withdrawals"),
        billplzPaymentOrderId: v.string(),
    },
    handler: async (ctx, args) => {
        const withdrawal = await ctx.db.get(args.withdrawalId);
        if (!withdrawal) {
            throw new Error("Withdrawal not found");
        }

        if (withdrawal.status !== "pending") {
            throw new Error("Withdrawal is not pending approval");
        }

        await ctx.db.patch(args.withdrawalId, {
            status: "processing",
            billplz_payment_order_id: args.billplzPaymentOrderId,
        });

        return args.withdrawalId;
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
        if (account.status === "verified") return args.bankAccountId;

        await ctx.db.patch(args.bankAccountId, {
            status: "verified",
            updated_at: Date.now(),
        });

        const endingDigits = account.account_number.slice(-4);
        const business = await ctx.db
            .query("businesses")
            .withIndex("by_user", (q) => q.eq("user_id", account.user_id))
            .unique();
        const accountType = account.source_type ?? (business ? WithdrawalSourceType.Business : WithdrawalSourceType.Creator);

        if (accountType === WithdrawalSourceType.Business) {
            await ctx.scheduler.runAfter(0, internal.notifications.dispatchBusinessBankAccountOutcome, {
                userId: account.user_id,
                data: {
                    type: NotificationType.BankAccountApproved,
                    bankAccountId: args.bankAccountId,
                    bankAccountType: accountType,
                    endingDigits,
                },
                endingDigits,
                redirectPath: "/bank-accounts",
            });
        } else {
            await ctx.scheduler.runAfter(0, internal.notifications.dispatchCreatorBankAccountOutcome, {
                userId: account.user_id,
                title: NotificationCopy.bankAccountApproved.title,
                description: NotificationCopy.bankAccountApproved.description(endingDigits),
                data: {
                    type: NotificationType.BankAccountApproved,
                    bankAccountId: args.bankAccountId,
                    bankAccountType: accountType,
                    endingDigits,
                },
                endingDigits,
                redirectPath: "/bank-account",
            });
        }

        return args.bankAccountId;
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
        if (account.status === "rejected") return args.bankAccountId;

        await ctx.db.patch(args.bankAccountId, {
            status: "rejected",
            updated_at: Date.now(),
        });

        const endingDigits = account.account_number.slice(-4);
        const business = await ctx.db
            .query("businesses")
            .withIndex("by_user", (q) => q.eq("user_id", account.user_id))
            .unique();
        const accountType = account.source_type ?? (business ? WithdrawalSourceType.Business : WithdrawalSourceType.Creator);

        if (accountType === WithdrawalSourceType.Business) {
            await ctx.scheduler.runAfter(0, internal.notifications.dispatchBusinessBankAccountOutcome, {
                userId: account.user_id,
                data: {
                    type: NotificationType.BankAccountRejected,
                    bankAccountId: args.bankAccountId,
                    bankAccountType: accountType,
                    endingDigits,
                },
                endingDigits,
                redirectPath: "/bank-accounts",
            });
        } else {
            await ctx.scheduler.runAfter(0, internal.notifications.dispatchCreatorBankAccountOutcome, {
                userId: account.user_id,
                title: NotificationCopy.bankAccountRejected.title,
                description: NotificationCopy.bankAccountRejected.description(endingDigits),
                data: {
                    type: NotificationType.BankAccountRejected,
                    bankAccountId: args.bankAccountId,
                    bankAccountType: accountType,
                    endingDigits,
                },
                endingDigits,
                redirectPath: "/bank-account/add",
            });
        }

        return args.bankAccountId;
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
        proofKey: v.string(),
    },
    handler: async (ctx, args) => {
        await assertAdmin(ctx);

        if (args.proofKey.startsWith("http://") || args.proofKey.startsWith("https://")) {
            return args.proofKey;
        }

        return await generateDownloadUrl(args.proofKey);
    },
});

/**
 * Generate a signed download URL for a submission video (admin access)
 */
export const generateAdminVideoAccessUrl = action({
    args: {
        r2Key: v.string(),
    },
    handler: async (ctx, args) => {
        await assertAdmin(ctx);
        return await generateDownloadUrl(args.r2Key);
    },
});

// ============================================================
// ADMIN PAYOUT / WITHDRAWAL QUERIES
// ============================================================

/**
 * Get paginated withdrawals with "pending" status (pending admin approval)
 */
export const getPendingWithdrawals = query({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, args) => {
        await assertAdmin(ctx);

        const result = await ctx.db
            .query("withdrawals")
            .withIndex("by_status", (q) => q.eq("status", "pending"))
            .order("desc")
            .paginate(args.paginationOpts);

        return {
            ...result,
            page: await Promise.all(result.page.map(async (withdrawal) => {
                const sourceType = withdrawal.source_type ?? WithdrawalSourceType.Creator;
                const bankAccount = await ctx.db.get(withdrawal.bank_account_id);
                let requester_label = withdrawal.user_id;

                if (sourceType === WithdrawalSourceType.Business && withdrawal.business_id) {
                    const business = await ctx.db.get(withdrawal.business_id);
                    requester_label = business?.name ?? withdrawal.user_id;
                } else {
                    const creator = await ctx.db
                        .query("creators")
                        .withIndex("by_user", (q) => q.eq("user_id", withdrawal.user_id))
                        .unique();
                    requester_label = creator?.name ?? withdrawal.user_id;
                }

                return {
                    ...withdrawal,
                    bank_name: bankAccount?.bank_name ?? null,
                    account_holder_name: bankAccount?.account_holder_name ?? null,
                    account_number: bankAccount?.account_number ?? null,
                    source_type: sourceType,
                    requester_label,
                };
            })),
        };
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
            .withIndex("by_status", (q) => q.eq("status", "pending"))
            .collect();
        return all.length;
    },
});

// ============================================================
// ADMIN PAYOUT / WITHDRAWAL MUTATIONS
// ============================================================

/**
 * Approve a withdrawal and trigger the payout provider.
 */
export const approveWithdrawal = action({
    args: {
        withdrawalId: v.id("withdrawals"),
    },
    handler: async (ctx, args): Promise<Id<"withdrawals">> => {
        await assertAdmin(ctx);

        const approvalData = await ctx.runQuery(internal.admin.getWithdrawalForApproval, {
            withdrawalId: args.withdrawalId,
        });
        if (!approvalData) throw new Error("Withdrawal not found");

        const { withdrawal, bankAccount, requesterName } = approvalData;
        if (withdrawal.status !== "pending") throw new Error("Withdrawal is not pending approval");
        if (!bankAccount) throw new Error("Bank account not found");
        if (bankAccount.status !== "verified") throw new Error("Bank account is not verified");

        const bankCode = bankAccount.bank_code || "";
        const accountHolderName = bankAccount.account_holder_name || requesterName;
        const amountAfterFee = withdrawal.amount - withdrawal.gateway_fee;
        const totalCents = Math.round(Math.max(amountAfterFee, 0) * 100);

        const paymentOrder = await createBillplzPaymentOrder({
            bankCode,
            bankAccountNumber: bankAccount.account_number,
            name: accountHolderName,
            description: withdrawal.source_type === WithdrawalSourceType.Business
                ? `Business withdrawal for ${requesterName}`
                : `Payout for ${requesterName}`,
            total: totalCents,
        });

        return await ctx.runMutation(internal.admin.markWithdrawalProcessingAfterApproval, {
            withdrawalId: args.withdrawalId,
            billplzPaymentOrderId: paymentOrder.id,
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
        if (withdrawal.status !== "pending") throw new Error("Withdrawal is not pending approval");

        await ctx.db.patch(args.withdrawalId, {
            status: "failed",
        });

        if (withdrawal.source_type === WithdrawalSourceType.Business && withdrawal.business_id) {
            const business = await ctx.db.get(withdrawal.business_id);
            if (business) {
                await ctx.db.patch(business._id, {
                    credit_balance: business.credit_balance + withdrawal.amount,
                    updated_at: Date.now(),
                });
            }
            return;
        }

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
