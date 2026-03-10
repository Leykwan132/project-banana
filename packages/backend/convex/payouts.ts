import { action, mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { WithdrawalStatus, WithdrawalSourceType, PAYOUT_GATEWAY_FEE, PAYOUT_PLATFORM_FEE_RATE, MIN_WITHDRAWAL_AMOUNT } from "./constants";
import { ErrorType } from "./errors";

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
 * Fetch the current payout gateway fee from constants
 */
export const getPayoutGatewayFee = query({
    handler: async () => {
        return PAYOUT_GATEWAY_FEE;
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
                const sourceType = withdrawal.source_type ?? WithdrawalSourceType.Creator;
                return sourceType === WithdrawalSourceType.Creator;
            });

        // Join with bank_accounts to get bank name and account number for display
        return await Promise.all(
            withdrawals.map(async (w) => {
                const bankAccount = await ctx.db.get(w.bank_account_id);
                return {
                    ...w,
                    gateway_fee: w.gateway_fee ?? PAYOUT_GATEWAY_FEE,
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
            .collect()).filter((withdrawal) => (
                withdrawal.source_type === WithdrawalSourceType.Business &&
                withdrawal.business_id === business._id
            ));

        return await Promise.all(
            withdrawals.map(async (w) => {
                const bankAccount = await ctx.db.get(w.bank_account_id);
                return {
                    ...w,
                    gateway_fee: w.gateway_fee ?? PAYOUT_GATEWAY_FEE,
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
 * Generate HMAC-SHA512 checksum for Billplz V5 API
 * Per Billplz docs: join values in strict order, then HMAC-SHA512 with X-Signature key
 */
async function generateChecksumSHA512(rawString: string, xSignatureKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(xSignatureKey);
    const messageData = encoder.encode(rawString);

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-512" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Call Billplz V5 Payment Order API to initiate a bank transfer
 * 
 * Checksum arguments (strict order): [payment_order_collection_id, bank_account_number, total, epoch]
 * 
 * @see https://www.billplz.com/api#v5-payment-order-create-a-payment-order
 */
async function createBillplzPaymentOrder(args: {
    bankCode: string;
    bankAccountNumber: string;
    name: string;
    description: string;
    total: number; // Amount in cents (e.g., 2000 = RM 20.00)
}): Promise<{ id: string; status: string }> {
    const apiKey = process.env.BILLPLZ_API_KEY;
    const xSignatureKey = process.env.BILLPLZ_X_SIGNATURE_KEY;
    const paymentOrderCollectionId = process.env.BILLPLZ_PAYMENT_ORDER_COLLECTION_ID;

    if (!apiKey || !xSignatureKey || !paymentOrderCollectionId) {
        throw new Error("Billplz payout configuration missing (BILLPLZ_API_KEY, BILLPLZ_X_SIGNATURE_KEY, or BILLPLZ_PAYMENT_ORDER_COLLECTION_ID)");
    }

    const epoch = Math.floor(Date.now() / 1000);

    // Checksum raw string: join values in strict order
    // [payment_order_collection_id, bank_account_number, total, epoch]
    const rawString = `${paymentOrderCollectionId}${args.bankAccountNumber}${args.total}${epoch}`;
    const checksum = await generateChecksumSHA512(rawString, xSignatureKey);

    const response = await fetch("https://www.billplz-sandbox.com/api/v5/payment_orders", {
        method: "POST",
        headers: {
            Authorization: `Basic ${btoa(apiKey + ":")}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            payment_order_collection_id: paymentOrderCollectionId,
            bank_code: "https://www.billplz-sandbox.com/api/v5/payment_orders".includes("-sandbox") ? "DUMMYBANKVERIFIED" : args.bankCode,
            bank_account_number: args.bankAccountNumber,
            name: args.name,
            description: args.description,
            total: args.total.toString(),
            epoch: epoch.toString(),
            checksum: checksum,
        }),
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

    const isSandbox = true; // flip to false for production
    const baseUrl = isSandbox
        ? "https://www.billplz-sandbox.com"
        : "https://www.billplz.com";

    const epoch = Math.floor(Date.now() / 1000);

    // Checksum raw string: join values in strict order [title, callback_url, epoch]
    const rawString = `${args.title}${args.callbackUrl}${epoch}`;
    const checksum = await generateChecksumSHA512(rawString, xSignatureKey);

    const response = await fetch(`${baseUrl}/api/v5/payment_order_collections`, {
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
        bankAccountId: v.id("bank_accounts"),
        billplzPaymentOrderId: v.optional(v.string()),
        businessId: v.optional(v.id("businesses")),
        sourceType: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const sourceType = args.sourceType ?? WithdrawalSourceType.Creator;

        if (sourceType === WithdrawalSourceType.Business) {
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
                source_type: WithdrawalSourceType.Business,
                status: WithdrawalStatus.Processing,
                billplz_payment_order_id: args.billplzPaymentOrderId,
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
            source_type: WithdrawalSourceType.Creator,
            status: WithdrawalStatus.Processing,
            billplz_payment_order_id: args.billplzPaymentOrderId,
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
 * Calls Billplz V5 Payment Order API to initiate a bank transfer,
 * then creates the withdrawal record.
 */
export const requestWithdrawal = action({
    args: {
        amount: v.number(),
        bankAccountId: v.id("bank_accounts"),
    },
    handler: async (ctx, args): Promise<Id<"withdrawals">> => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) throw new Error("User not found");

        validateWithdrawalAmount(args.amount);

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

        // Get SWIFT code and account holder name
        const bankCode = bankAccount.bank_code || "";
        const accountHolderName = bankAccount.account_holder_name || user.name || "User";

        // Amount sent to Billplz = requested amount minus platform fee (includes payment gateway).
        // e.g. User requests RM 25.00 -> Billplz sends RM 22.50, balance is deducted RM 25.00.
        const platformFee = calculatePlatformFee(args.amount);
        const amountAfterFee = args.amount - platformFee;
        const totalCents = Math.round(amountAfterFee * 100);

        // Create Billplz Payment Order to initiate bank transfer
        const paymentOrder = await createBillplzPaymentOrder({
            bankCode: bankCode,
            bankAccountNumber: bankAccount.account_number,
            name: accountHolderName,
            description: `Payout for ${user.name || user.subject}`,
            total: totalCents,
        });

        // Execute the DB operations as a single transaction via internal mutation
        return await ctx.runMutation(internal.payouts.internalProcessWithdrawal, {
            userId: user.subject,
            amount: args.amount,
            gatewayFee: platformFee,
            bankAccountId: args.bankAccountId,
            billplzPaymentOrderId: paymentOrder.id,
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
        const user = await ctx.auth.getUserIdentity();
        if (!user) throw new Error("User not found");

        validateWithdrawalAmount(args.amount);

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

        const bankCode = bankAccount.bank_code || "";
        const accountHolderName = bankAccount.account_holder_name || business.name || user.name || "Business";
        const platformFee = calculatePlatformFee(args.amount);
        const amountAfterFee = args.amount - platformFee;
        const totalCents = Math.round(amountAfterFee * 100);

        const paymentOrder = await createBillplzPaymentOrder({
            bankCode,
            bankAccountNumber: bankAccount.account_number,
            name: accountHolderName,
            description: `Business withdrawal for ${business.name}`,
            total: totalCents,
        });

        return await ctx.runMutation(internal.payouts.internalProcessWithdrawal, {
            userId: user.subject,
            amount: args.amount,
            gatewayFee: platformFee,
            bankAccountId: args.bankAccountId,
            billplzPaymentOrderId: paymentOrder.id,
            businessId: business._id,
            sourceType: WithdrawalSourceType.Business,
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

        if (withdrawal.status !== WithdrawalStatus.Processing) {
            throw new Error("Withdrawal is not in processing state");
        }

        const updates: any = {
            status: args.status,
        };

        await ctx.db.patch(args.withdrawalId, updates);

        // If failed, refund the balance
        if (args.status === "failed") {
            if (withdrawal.source_type === WithdrawalSourceType.Business && withdrawal.business_id) {
                const business = await ctx.db.get(withdrawal.business_id);
                if (business) {
                    await ctx.db.patch(business._id, {
                        credit_balance: business.credit_balance + withdrawal.amount,
                        updated_at: Date.now(),
                    });
                }
            } else {
                const creator: any = await ctx.runQuery(api.creators.getCreatorByUserId, { userId: withdrawal.user_id });
                if (creator) {
                    await ctx.db.patch(creator._id, {
                        balance: (creator.balance ?? 0) + withdrawal.amount,
                    });
                }
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

        if (args.status === WithdrawalStatus.Completed) {
            await ctx.db.patch(withdrawal._id, {
                status: WithdrawalStatus.Completed,
            });
            console.log(`Withdrawal ${withdrawal._id} marked as completed`);
        } else if (args.status === WithdrawalStatus.Refunded) {
            if (withdrawal.source_type === WithdrawalSourceType.Business && withdrawal.business_id) {
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
