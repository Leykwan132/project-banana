import { action, mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { PayoutStatus, WithdrawalStatus, WithdrawalSourceType, PAYOUT_GATEWAY_FEE, PAYOUT_PLATFORM_FEE_RATE, MIN_WITHDRAWAL_AMOUNT } from "./constants";
import { ErrorType } from "./errors";
import { generateChecksumSHA512, getBillplzBaseUrl } from "./utils";
import { NotificationCopy, NotificationType } from "./notificationConstants";
import { notificationPool } from "./workpools";

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

        const payouts = await ctx.db
            .query("payouts")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .collect();

        const enrichedPayouts = await Promise.all(
            payouts.map(async (payout) => {
                let campaign = payout.campaign_id ? await ctx.db.get(payout.campaign_id) : null;

                if (!campaign && payout.application_id) {
                    const application = await ctx.db.get(payout.application_id);
                    campaign = application?.campaign_id ? await ctx.db.get(application.campaign_id) : null;
                }

                const business = campaign?.business_id ? await ctx.db.get(campaign.business_id) : null;
                const basePayAmount = campaign?.base_pay ?? 0;

                return {
                    ...payout,
                    campaign_name: payout.campaign_name ?? campaign?.name ?? "Payout",
                    company_name: payout.company_name ?? campaign?.business_name ?? business?.name ?? undefined,
                    base_pay_amount: basePayAmount,
                    performance_breakdown_amount: Math.max(0, payout.amount - basePayAmount),
                };
            }),
        );

        return enrichedPayouts.sort((left, right) => right.updated_at - left.updated_at);
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
 * Fetch the current payout gateway fee from constants
 */
export const getPayoutGatewayFee = query({
    handler: async () => {
        return PAYOUT_GATEWAY_FEE;
    },
});

export const getMinWithdrawalAmount = query({
    handler: async () => {
        return MIN_WITHDRAWAL_AMOUNT;
    },
});

export const getPayoutPlatformFeeRate = query({
    handler: async () => {
        return PAYOUT_PLATFORM_FEE_RATE;
    },
});

/**
 * Get all withdrawals for the current authenticated user
 */
export const getUserWithdrawals = query({
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) return [];

        const withdrawals = (await ctx.db
            .query("withdrawals")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .order("desc")
            .collect()).filter((withdrawal) => {
                return withdrawal.source_type !== WithdrawalSourceType.Business;
            });

        // Join with bank_accounts to get bank name and account number for display
        return await Promise.all(
            withdrawals.map(async (w) => {
                const bankAccount = await ctx.db.get(w.bank_account_id);
                return {
                    ...w,
                    gateway_fee: w.gateway_fee ?? 0,
                    platform_fee: w.platform_fee ?? 0,
                    bank_name: bankAccount?.bank_name ?? null,
                    account_number: bankAccount?.account_number ?? null,
                    account_holder_name: bankAccount?.account_holder_name ?? null,
                };
            })
        );
    },
});

/**
 * Get all business withdrawals for the current authenticated user
 */
export const getBusinessWithdrawals = query({
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) return [];

        const business = await ctx.db
            .query("businesses")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .unique();
        if (!business) return [];

        const withdrawals = (await ctx.db
            .query("withdrawals")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .order("desc")
            .collect()).filter((withdrawal) => {
                return withdrawal.source_type === WithdrawalSourceType.Business && withdrawal.business_id === business._id;
            });

        return await Promise.all(
            withdrawals.map(async (w) => {
                const bankAccount = await ctx.db.get(w.bank_account_id);
                return {
                    ...w,
                    gateway_fee: w.gateway_fee ?? 0,
                    platform_fee: w.platform_fee ?? 0,
                    bank_name: bankAccount?.bank_name ?? null,
                    account_number: bankAccount?.account_number ?? null,
                    account_holder_name: bankAccount?.account_holder_name ?? null,
                };
            })
        );
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
// BILLPLZ V5 HELPERS
// ============================================================

/**
 * Call Billplz V5 Payment Order API to initiate a bank transfer
 * 
 * Checksum arguments (strict order): [payment_order_collection_id, bank_account_number, total, epoch]
 * 
 * @see https://www.billplz.com/api#v5-payment-order-create-a-payment-order
 */
export async function createBillplzPaymentOrder(args: {
    bankCode: string;
    bankAccountNumber: string;
    name: string;
    description: string;
    callbackUrl: string;
    email?: string;
    total: number; // Amount in cents (e.g., 2000 = RM 20.00)
}): Promise<{ id: string; status: string }> {
    const apiKey = process.env.BILLPLZ_API_KEY;
    const xSignatureKey = process.env.BILLPLZ_X_SIGNATURE_KEY;
    const paymentOrderCollectionId = process.env.BILLPLZ_PAYMENT_ORDER_COLLECTION_ID;

    if (!apiKey || !xSignatureKey || !paymentOrderCollectionId) {
        throw new Error("Billplz payout configuration missing (BILLPLZ_API_KEY, BILLPLZ_X_SIGNATURE_KEY, or BILLPLZ_PAYMENT_ORDER_COLLECTION_ID)");
    }

    const epoch = Math.floor(Date.now() / 1000);
    const billplzBaseUrl = getBillplzBaseUrl();

    // Checksum raw string: join values in strict order
    // [payment_order_collection_id, bank_account_number, total, epoch]
    const rawString = `${paymentOrderCollectionId}${args.bankAccountNumber}${args.total}${epoch}`;
    const checksum = await generateChecksumSHA512(rawString, xSignatureKey);

    const body = new URLSearchParams({
        payment_order_collection_id: paymentOrderCollectionId,
        bank_code: billplzBaseUrl.includes("-sandbox") ? "DUMMYBANKVERIFIED" : args.bankCode,
        bank_account_number: args.bankAccountNumber,
        name: args.name,
        description: args.description,
        callback_url: args.callbackUrl,
        total: args.total.toString(),
        epoch: epoch.toString(),
        checksum: checksum,
    });

    if (args.email) {
        body.set("email", args.email);
    }

    const response = await fetch(`${billplzBaseUrl}/api/v5/payment_orders`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${btoa(apiKey + ":")}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Billplz Payment Order Error:", errorText);
        throw new Error(`Failed to create Billplz payment order: ${errorText}`);
    }

    const data = (await response.json()) as { id: string; status: string };
    console.log(`Billplz Payment Order created: ${data.id}, status: ${data.status}`);
    return data;
}

function validateWithdrawalAmount(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new ConvexError(ErrorType.INVALID_INPUT);
    }

    if (amount < MIN_WITHDRAWAL_AMOUNT) {
        throw new ConvexError({
            ...ErrorType.INVALID_INPUT,
            message: `Withdrawal amount must be at least RM ${MIN_WITHDRAWAL_AMOUNT.toFixed(2)}`,
        });
    }
}

function calculatePlatformFee(amount: number) {
    return Math.round(amount * PAYOUT_PLATFORM_FEE_RATE * 100) / 100;
}

function calculateGatewayFee() {
    return PAYOUT_GATEWAY_FEE;
}

/**
 * Call Billplz V5 Payment Order Collection API to create a new collection.
 *
 * Checksum raw string (strict order): [title, epoch, callback_url]
 *
 * @see https://www.billplz.com/api#v5-payment-order-collection-create-a-payment-order-collection
 */
async function createBillplzPaymentOrderCollection(args: {
    title: string;
    callbackUrl: string;
}): Promise<{ id: string; title: string; status: string }> {
    const apiKey = process.env.BILLPLZ_API_KEY;
    const xSignatureKey = process.env.BILLPLZ_X_SIGNATURE_KEY;

    if (!apiKey || !xSignatureKey) {
        throw new Error(
            "Billplz payout configuration missing (BILLPLZ_API_KEY or BILLPLZ_X_SIGNATURE_KEY)"
        );
    }

    const epoch = Math.floor(Date.now() / 1000);
    const billplzBaseUrl = getBillplzBaseUrl();

    // Checksum raw string: join values in strict order [title, callback_url, epoch]
    const rawString = `${args.title}${args.callbackUrl}${epoch}`;
    const checksum = await generateChecksumSHA512(rawString, xSignatureKey);

    const response = await fetch(`${billplzBaseUrl}/api/v5/payment_order_collections`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${btoa(apiKey + ":")}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            title: args.title,
            epoch: epoch.toString(),
            callback_url: args.callbackUrl,
            checksum: checksum,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Billplz Payment Order Collection Error:", errorText);
        throw new Error(`Failed to create Billplz payment order collection: ${errorText}`);
    }

    const data = (await response.json()) as { id: string; title: string; status: string };
    console.log(`Billplz Payment Order Collection created: ${data.id}, status: ${data.status}`);
    return data;
}

// ============================================================
// PAYOUT MUTATIONS
// ============================================================

/**
 * Create a Billplz Payment Order Collection.
 * This must be called once (e.g. from admin) to obtain a collection ID.
 * The resulting collection ID should be stored as BILLPLZ_PAYMENT_ORDER_COLLECTION_ID in env.
 *
 * The callback_url is automatically set to the existing payment order webhook endpoint.
 */
export const createPaymentOrderCollection = action({
    args: {
        title: v.optional(v.string()),
    },
    handler: async (_ctx, args): Promise<{ id: string; title: string; status: string }> => {
        const siteUrl = process.env.CONVEX_SITE_URL;
        if (!siteUrl) {
            throw new Error("CONVEX_SITE_URL is not set in environment variables");
        }

        const title = args.title ?? "Project Banana Payout Collection";
        const callbackUrl = `${siteUrl}/webhooks/billplz/payment_order`;

        console.log(`Creating Billplz Payment Order Collection: "${title}", callback: ${callbackUrl}`);

        return await createBillplzPaymentOrderCollection({ title, callbackUrl });
    },
});

/**
 * Create a new payout (usually called by admin/system)
 */
export const createPayout = mutation({
    args: {
        userId: v.string(),
        applicationId: v.optional(v.id("applications")),
        amount: v.number(),
    },
    handler: async (ctx, args) => {
        const now = Date.now();

        const payoutId = await ctx.db.insert("payouts", {
            user_id: args.userId,
            application_id: args.applicationId,
            amount: args.amount,
            status: PayoutStatus.Pending,
            created_at: now,
            updated_at: now,
        });

        return payoutId;
    },
});

export const upsertCampaignPayout = internalMutation({
    args: {
        userId: v.string(),
        applicationId: v.optional(v.id("applications")),
        campaignId: v.id("campaigns"),
        amountDelta: v.number(),
        companyName: v.optional(v.string()),
        campaignName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        if (args.amountDelta <= 0) {
            return null;
        }

        const now = Date.now();
        const existing = await ctx.db
            .query("payouts")
            .withIndex("by_user_campaign", (q) =>
                q.eq("user_id", args.userId).eq("campaign_id", args.campaignId)
            )
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                application_id: args.applicationId ?? existing.application_id,
                company_name: args.companyName ?? existing.company_name,
                campaign_name: args.campaignName ?? existing.campaign_name,
                amount: existing.amount + args.amountDelta,
                status: PayoutStatus.Completed,
                updated_at: now,
            });

            return existing._id;
        }

        return await ctx.db.insert("payouts", {
            user_id: args.userId,
            application_id: args.applicationId,
            campaign_id: args.campaignId,
            company_name: args.companyName,
            campaign_name: args.campaignName,
            amount: args.amountDelta,
            status: PayoutStatus.Completed,
            created_at: now,
            updated_at: now,
        });
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
            throw new ConvexError(ErrorType.INSUFFICIENT_BALANCE);
        }
    },
});

export const internalCheckSufficientBusinessBalance = internalQuery({
    args: {
        businessId: v.id("businesses"),
        userId: v.string(),
        amount: v.number(),
    },
    handler: async (ctx, args) => {
        const business = await ctx.db.get(args.businessId);

        if (!business) {
            throw new Error("Business not found");
        }

        if (business.user_id !== args.userId) {
            throw new ConvexError(ErrorType.UNAUTHORIZED_ACCESS);
        }

        if (business.credit_balance < args.amount) {
            throw new ConvexError(ErrorType.INSUFFICIENT_CREDITS);
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
        gatewayFee: v.number(),
        platformFee: v.number(),
        bankAccountId: v.id("bank_accounts"),
        billplzPaymentOrderId: v.optional(v.string()),
        businessId: v.optional(v.id("businesses")),
        sourceType: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) throw new Error("User not found");

        if (args.sourceType === WithdrawalSourceType.Business) {
            if (!args.businessId) {
                throw new Error("Business withdrawal requires a businessId");
            }

            const business = await ctx.db.get(args.businessId);
            if (!business) {
                throw new Error("Business not found");
            }

            if (business.user_id !== args.userId) {
                throw new ConvexError(ErrorType.UNAUTHORIZED_ACCESS);
            }

            if (business.credit_balance < args.amount) {
                throw new ConvexError(ErrorType.INSUFFICIENT_CREDITS);
            }

            const now = Date.now();
            const withdrawalId = await ctx.db.insert("withdrawals", {
                user_id: args.userId,
                business_id: args.businessId,
                bank_account_id: args.bankAccountId,
                amount: args.amount,
                gateway_fee: args.gatewayFee,
                platform_fee: args.platformFee,
                source_type: WithdrawalSourceType.Business,
                status: WithdrawalStatus.Pending,
                created_at: now,
            });

            await ctx.db.patch(business._id, {
                credit_balance: business.credit_balance - args.amount,
                updated_at: now,
            });

            return withdrawalId;
        }

        // Direct DB access is efficient here since we are in a mutation
        const creator = await ctx.db
            .query("creators")
            .withIndex("by_user", (q) => q.eq("user_id", args.userId))
            .unique();

        if (!creator) throw new Error("Creator not found");

        const currentBalance = creator?.balance ?? 0;
        if (currentBalance < args.amount) {
            throw new ConvexError(ErrorType.INSUFFICIENT_BALANCE);
        }

        const now = Date.now();
        // Store the user-requested amount and the total fee charged at the time of withdrawal.
        const withdrawalId = await ctx.db.insert("withdrawals", {
            user_id: args.userId,
            bank_account_id: args.bankAccountId,
            amount: args.amount,
            gateway_fee: args.gatewayFee,
            platform_fee: args.platformFee,
            source_type: WithdrawalSourceType.Creator,
            status: WithdrawalStatus.Pending,
            created_at: now,
        });

        // Decrement user balance by the full requested amount.
        await ctx.db.patch(creator._id, {
            balance: currentBalance - args.amount,
        });

        return withdrawalId;
    },
});

/**
 * Request a withdrawal (Action)
 * Creates a pending withdrawal request and reserves the user's balance.
 */
export const requestWithdrawal = action({
    args: {
        amount: v.number(),
        bankAccountId: v.id("bank_accounts"),
        isBusiness: v.optional(v.boolean()),
    },
    handler: async (ctx, args): Promise<Id<"withdrawals">> => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) throw new Error("User not found");

        validateWithdrawalAmount(args.amount);

        if (args.isBusiness) {
            const business = await ctx.runQuery(api.businesses.getMyBusiness, {});
            if (!business) {
                throw new Error("Business not found");
            }

            await ctx.runQuery(internal.payouts.internalCheckSufficientBusinessBalance, {
                businessId: business._id,
                userId: user.subject,
                amount: args.amount,
            });

            const bankAccount = await ctx.runQuery(api.bankAccounts.getBankAccount, {
                bankAccountId: args.bankAccountId,
                sourceType: WithdrawalSourceType.Business,
            });
            if (!bankAccount) throw new Error("Bank account not found");
            if (bankAccount.status !== "verified") throw new Error("Bank account is not verified");

            return await ctx.runMutation(internal.payouts.internalProcessWithdrawal, {
                userId: user.subject,
                amount: args.amount,
                gatewayFee: calculateGatewayFee(),
                platformFee: 0,
                bankAccountId: args.bankAccountId,
                businessId: business._id,
                sourceType: WithdrawalSourceType.Business,
            });
        }

        // Check balance first
        await ctx.runQuery(internal.payouts.internalCheckSufficientBalance, {
            userId: user.subject,
            amount: args.amount,
        });

        // Fetch bank account details for Billplz API call
        const bankAccount = await ctx.runQuery(api.bankAccounts.getBankAccount, {
            bankAccountId: args.bankAccountId,
            sourceType: WithdrawalSourceType.Creator,
        });
        if (!bankAccount) throw new Error("Bank account not found");
        if (bankAccount.status !== "verified") throw new Error("Bank account is not verified");

        const platformFee = calculatePlatformFee(args.amount);

        return await ctx.runMutation(internal.payouts.internalProcessWithdrawal, {
            userId: user.subject,
            amount: args.amount,
            gatewayFee: 0,
            platformFee,
            bankAccountId: args.bankAccountId,
            sourceType: WithdrawalSourceType.Creator,
        });
    },
});

export const requestBusinessWithdrawal = action({
    args: {
        amount: v.number(),
        bankAccountId: v.id("bank_accounts"),
    },
    handler: async (ctx, args): Promise<Id<"withdrawals">> => {
        return await ctx.runAction(api.payouts.requestWithdrawal, {
            ...args,
            isBusiness: true,
        });
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
        if (withdrawal.status !== WithdrawalStatus.Pending) {
            throw new Error("Can only cancel pending withdrawals");
        }

        // Mark as failed
        await ctx.db.patch(args.withdrawalId, {
            status: WithdrawalStatus.Failed,
        });

        // Refund the amount
        // Balance refund is intentionally skipped here and should be handled by creator-ledger state.
    },
});

// ============================================================
// BILLPLZ PAYMENT ORDER CALLBACK
// ============================================================

/**
 * Process Billplz Payment Order callback (called from webhook handler in http.ts)
 * Updates withdrawal status based on the payment order status from Billplz.
 * 
 * Callback statuses: "completed" | "refunded"
 */
export const processPaymentOrderCallback = internalMutation({
    args: {
        billplzPaymentOrderId: v.string(),
        status: v.string(), // "completed" | "refunded"
    },
    handler: async (ctx, args) => {
        const withdrawal = await ctx.db
            .query("withdrawals")
            .withIndex("by_billplz_payment_order", (q) =>
                q.eq("billplz_payment_order_id", args.billplzPaymentOrderId)
            )
            .unique();

        if (!withdrawal) {
            console.error(`Withdrawal not found for Billplz payment order: ${args.billplzPaymentOrderId}`);
            throw new Error("Withdrawal not found for payment order");
        }

        // Already processed
        if (withdrawal.status === WithdrawalStatus.Completed || withdrawal.status === WithdrawalStatus.Failed) {
            console.log(`Withdrawal ${withdrawal._id} already in terminal state: ${withdrawal.status}`);
            return;
        }

        const now = Date.now();
        const bankAccount = await ctx.db.get(withdrawal.bank_account_id);
        const endingDigits = bankAccount?.account_number.slice(-4) ?? "0000";
        const sourceType = withdrawal.source_type;
        const netAmount = Math.max(
            withdrawal.amount - (withdrawal.gateway_fee ?? 0) - (withdrawal.platform_fee ?? 0),
            0,
        );
        const formattedRequestedAmount = `RM ${withdrawal.amount.toFixed(2)}`;
        const formattedNetAmount = `RM ${netAmount.toFixed(2)}`;

        if (args.status === WithdrawalStatus.Completed) {
            await ctx.db.patch(withdrawal._id, {
                status: WithdrawalStatus.Completed,
            });
            console.log(`Withdrawal ${withdrawal._id} marked as completed`);

            if (sourceType === WithdrawalSourceType.Business) {
                await notificationPool.enqueueAction(ctx, internal.notifications.dispatchBusinessWithdrawalPaidEmail, {
                    userId: withdrawal.user_id,
                    amount: formattedRequestedAmount,
                    netAmount: formattedNetAmount,
                    bankName: bankAccount?.bank_name ?? "Bank account",
                    endingDigits,
                    redirectPath: "/withdrawals",
                }, { retry: false });
            } else {
                await notificationPool.enqueueAction(ctx, internal.notifications.dispatchCreatorWithdrawalPaid, {
                    userId: withdrawal.user_id,
                    title: NotificationCopy.withdrawalPaid.title,
                    description: NotificationCopy.withdrawalPaid.description(formattedNetAmount, endingDigits),
                    data: {
                        type: NotificationType.WithdrawalPaid,
                        withdrawalId: withdrawal._id,
                        endingDigits,
                    },
                }, { retry: false });
            }
        } else if (args.status === WithdrawalStatus.Refunded) {
            if (sourceType === WithdrawalSourceType.Business && withdrawal.business_id) {
                const business = await ctx.db.get(withdrawal.business_id);
                if (business) {
                    await ctx.db.patch(business._id, {
                        credit_balance: business.credit_balance + withdrawal.amount,
                        updated_at: now,
                    });
                }
            } else {
                // Refund the balance back to the creator
                const creator = await ctx.db
                    .query("creators")
                    .withIndex("by_user", (q) => q.eq("user_id", withdrawal.user_id))
                    .unique();

                if (creator) {
                    await ctx.db.patch(creator._id, {
                        balance: (creator.balance ?? 0) + withdrawal.amount,
                    });
                }
            }

            await ctx.db.patch(withdrawal._id, {
                status: WithdrawalStatus.Failed,
            });
            console.log(`Withdrawal ${withdrawal._id} refunded and marked as failed`);
        }
    },
});
