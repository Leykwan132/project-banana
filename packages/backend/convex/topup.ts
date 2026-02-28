import { mutation, query, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { api, internal } from "./_generated/api";

// ============================================================
// QUERIES
// ============================================================

export const getTopUpHistory = query({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) return { page: [], isDone: true, continueCursor: "" };

        const business = await ctx.db
            .query("businesses")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .unique();

        if (!business) return { page: [], isDone: true, continueCursor: "" };

        return await ctx.db
            .query("topup_orders")
            .withIndex("by_business", (q) => q.eq("business_id", business._id))
            .order("desc")
            .paginate(args.paginationOpts);
    },
});

// Used for the Credits page list
// Used for the Credits page list
export const getPastTopUpPayments = query({
    args: {
        paginationOpts: paginationOptsValidator,
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            return {
                page: [],
                isDone: true,
                continueCursor: "",
            };
        }

        const business = await ctx.db
            .query("businesses")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .unique();

        if (!business) {
            return {
                page: [],
                isDone: true,
                continueCursor: "",
            };
        }

        let query = ctx.db
            .query("topup_orders")
            .withIndex("by_business", (q) => q.eq("business_id", business._id));

        if (args.status && args.status !== "all") {
            // For precision, ideally we'd have a compound index.
            // But for now, client-side filtering (filter()) is acceptable for lower volume,
            // or we rely on the fact pagination happens after?
            // Convex `filter` runs before pagination limit if used inside `filter()`.
            // `paginate` takes the query.
            query = query.filter((q) => q.eq(q.field("status"), args.status));
        }

        return await query.order("desc").paginate(args.paginationOpts);
    },
});

export const getTopUpCount = query({
    args: {
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) return 0;

        const business = await ctx.db
            .query("businesses")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .unique();

        if (!business) return 0;

        let query = ctx.db
            .query("topup_orders")
            .withIndex("by_business", (q) => q.eq("business_id", business._id));

        if (args.status && args.status !== "all") {
            query = query.filter((q) => q.eq(q.field("status"), args.status));
        }

        const count = await query.collect();
        return count.length;
    },
});

// Used for the Credits page "Past Spending" tab
export const getPastCreditSpending = query({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            return {
                page: [],
                isDone: true,
                continueCursor: "",
            };
        }

        const business = await ctx.db
            .query("businesses")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .unique();

        if (!business) {
            return {
                page: [],
                isDone: true,
                continueCursor: "",
            };
        }

        const result = await ctx.db
            .query("credits")
            .withIndex("by_business_type", (q) =>
                q.eq("business_id", business._id).eq("type", "campaign_spend")
            )
            .order("desc")
            .paginate(args.paginationOpts);

        // Enrich each credit record with the campaign name
        const enrichedPage = await Promise.all(
            result.page.map(async (credit) => {
                let campaign_name = "Unknown Campaign";
                if (credit.campaign_id) {
                    const campaign = await ctx.db.get(credit.campaign_id);
                    if (campaign) {
                        campaign_name = campaign.name;
                    }
                }
                return {
                    ...credit,
                    campaign_name,
                };
            })
        );

        return {
            ...result,
            page: enrichedPage,
        };
    },
});

export const getSpendingCount = query({
    args: {},
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) return 0;

        const business = await ctx.db
            .query("businesses")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .unique();

        if (!business) return 0;

        const records = await ctx.db
            .query("credits")
            .withIndex("by_business_type", (q) =>
                q.eq("business_id", business._id).eq("type", "campaign_spend")
            )
            .collect();

        return records.length;
    },
});

export const getOrder = query({
    args: { orderId: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        return await ctx.db
            .query("topup_orders")
            .withIndex("by_order_id", (q) => q.eq("order_id", args.orderId))
            .unique();
    },
});

// ============================================================
// MUTATIONS
// ============================================================

// Internal mutation to store the order after creation
export const storeOrder = mutation({
    args: {
        businessId: v.id("businesses"),
        amount: v.number(),
        amountPaise: v.number(),
        currency: v.string(),
        orderId: v.string(),
        receipt: v.string(),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const id = await ctx.db.insert("topup_orders", {
            business_id: args.businessId,
            amount: args.amount,
            amount_paise: args.amountPaise,
            currency: args.currency,
            order_id: args.orderId,
            receipt: args.receipt,
            status: "created",
            created_at: now,
            updated_at: now,
        });
        return id;
    },
});

// Verify and store payment from frontend checkout (does NOT add credits)
// Credits are only added when webhook confirms payment
export const verifyAndStorePayment = mutation({
    args: {
        orderId: v.string(),
        razorpayPaymentId: v.string(),
        razorpaySignature: v.string(),
    },
    handler: async (ctx, args) => {
        const order = await ctx.db
            .query("topup_orders")
            .withIndex("by_order_id", (q) => q.eq("order_id", args.orderId))
            .unique();

        if (!order) throw new Error("Order not found");

        // Verify signature: HMAC-SHA256(order_id + "|" + razorpay_payment_id, key_secret)
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keySecret) throw new Error("Razorpay key secret not configured");

        const expectedSignature = await generateSignature(
            `${args.orderId}|${args.razorpayPaymentId}`,
            keySecret
        );

        if (expectedSignature !== args.razorpaySignature) {
            await ctx.db.patch(order._id, {
                status: "signature_failed",
                updated_at: Date.now(),
            });
            throw new Error("Invalid payment signature");
        }

        // Store payment details, mark as pending_webhook (waiting for webhook confirmation)
        await ctx.db.patch(order._id, {
            status: "pending_webhook",
            razorpay_payment_id: args.razorpayPaymentId,
            razorpay_signature: args.razorpaySignature,
            updated_at: Date.now(),
        });

        return { success: true, status: "pending_webhook" };
    },
});

// Process payment from webhook (adds credits)
export const processWebhookPayment = mutation({
    args: {
        orderId: v.string(),
        razorpayPaymentId: v.string(),
    },
    handler: async (ctx, args) => {
        const order = await ctx.db
            .query("topup_orders")
            .withIndex("by_order_id", (q) => q.eq("order_id", args.orderId))
            .unique();

        if (!order) throw new Error("Order not found");

        // Already processed
        if (order.status === "paid") {
            return { success: true, alreadyProcessed: true };
        }

        const business = await ctx.db.get(order.business_id);
        if (!business) throw new Error("Business not found");

        const now = Date.now();
        const newBalance = business.credit_balance + order.amount;

        // Update order status
        await ctx.db.patch(order._id, {
            status: "paid",
            razorpay_payment_id: args.razorpayPaymentId,
            updated_at: now,
        });

        // Add credits to business
        await ctx.db.patch(order.business_id, {
            credit_balance: newBalance,
            updated_at: now,
        });

        // Record transaction in credits table
        await ctx.db.insert("credits", {
            business_id: order.business_id,
            amount: order.amount,
            status: "completed",
            type: "top_up",
            reference: args.orderId,
            created_at: now,
        });

        return { success: true, newBalance };
    },
});

// Helper function to generate HMAC-SHA256 signature
// Helper function to generate HMAC-SHA256 signature
async function generateSignature(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(data);

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Internal mutation to store Billplz order
export const storeBillplzOrder = internalMutation({
    args: {
        businessId: v.id("businesses"),
        amount: v.number(),
        amountPaise: v.number(),
        currency: v.string(),
        billplzId: v.string(),
        billplzUrl: v.string(),
        receipt: v.string(),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        await ctx.db.insert("topup_orders", {
            business_id: args.businessId,
            amount: args.amount,
            amount_paise: args.amountPaise,
            currency: args.currency,
            provider: "billplz",
            billplz_id: args.billplzId,
            billplz_url: args.billplzUrl,
            receipt: args.receipt,
            status: "pending", // Billplz starts as pending/active until paid
            created_at: now,
            updated_at: now,
        });
    },
});

export const processBillplzWebhook = internalMutation({
    args: {
        billplzId: v.string(),
        paid: v.boolean(),
        paidAmount: v.optional(v.number()), // in cents
    },
    handler: async (ctx, args) => {
        const order = await ctx.db
            .query("topup_orders")
            .withIndex("by_billplz_id", (q) => q.eq("billplz_id", args.billplzId))
            .unique();

        if (!order) {
            console.error(`Billplz order not found: ${args.billplzId}`);
            // Return success to Billplz so they don't retry if order is genuinely missing?
            // Or throw error to retry? Better to throw.
            throw new Error("Order not found");
        }

        if (order.status === "paid") {
            return { success: true, alreadyProcessed: true };
        }

        if (args.paid) {
            const business = await ctx.db.get(order.business_id);
            if (!business) throw new Error("Business not found");

            const now = Date.now();
            const newBalance = business.credit_balance + order.amount;

            // Update order
            await ctx.db.patch(order._id, {
                status: "paid",
                updated_at: now,
            });

            // Update business balance
            await ctx.db.patch(order.business_id, {
                credit_balance: newBalance,
                updated_at: now,
            });

            // Record credit transaction
            await ctx.db.insert("credits", {
                business_id: order.business_id,
                amount: order.amount,
                status: "completed",
                type: "top_up",
                reference: args.billplzId,
                created_at: now,
            });

            return { success: true };
        } else {
            // Payment failed or other status
            // Maybe update status to failed if needed
            return { success: false };
        }
    },
});

// ============================================================
// ACTIONS
// ============================================================

export const createOrder = action({
    args: {
        amount: v.number(), // Amount in MYR (e.g., 100 for RM100)
    },
    handler: async (ctx, args): Promise<{
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
        businessName: string;
    }> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        // Get user and business
        const user = await ctx.runQuery(api.users.getUser, {});
        if (!user) throw new Error("User not found");

        const business = await ctx.runQuery(api.businesses.getMyBusiness, {});
        if (!business) throw new Error("Business not found");

        // Validate amount
        if (args.amount <= 0) throw new Error("Amount must be positive");

        // Razorpay requires amount in smallest currency unit (paise/sen)
        // For MYR, 1 RM = 100 sen
        const amountPaise: number = Math.round(args.amount * 100);
        const currency: string = "MYR";
        const receiptId: string = `rcpt_${crypto.randomUUID().replace(/-/g, "")}`;

        // Get Razorpay credentials from environment
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            throw new Error("Razorpay credentials not configured");
        }

        // Create order via Razorpay API
        const razorpayResponse: Response = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
            },
            body: JSON.stringify({
                amount: amountPaise,
                currency: currency,
                receipt: receiptId,
                notes: {
                    business_id: business._id,
                    business_name: business.name,
                },
            }),
        });

        if (!razorpayResponse.ok) {
            const errorText = await razorpayResponse.text();
            throw new Error(`Failed to create Razorpay order: ${errorText}`);
        }

        const orderData = (await razorpayResponse.json()) as { id: string };
        const orderId: string = orderData.id; // This is the order_id from Razorpay

        // Store order in database
        await ctx.runMutation(api.topup.storeOrder, {
            businessId: business._id,
            amount: args.amount,
            amountPaise: amountPaise,
            currency: currency,
            orderId: orderId,
            receipt: receiptId,
        });

        // Return data needed for frontend checkout
        return {
            orderId: orderId,
            amount: amountPaise,
            currency: currency,
            keyId: keyId,
            businessName: business.name,
        };
    },
});

export const createBillplzBill = action({
    args: {
        amount: v.number(), // Amount in MYR (e.g., 100 for RM100)
    },
    handler: async (ctx, args): Promise<{
        billUrl: string;
        billId: string;
    }> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.runQuery(api.users.getUser, {});
        if (!user) throw new Error("User not found");

        const business = await ctx.runQuery(api.businesses.getMyBusiness, {});
        if (!business) throw new Error("Business not found");

        if (args.amount <= 0) throw new Error("Amount must be positive");

        const apiKey = process.env.BILLPLZ_API_KEY;
        const collectionId = process.env.BILLPLZ_COLLECTION_ID;
        const siteUrl = process.env.CONVEX_SITE_URL;

        if (!apiKey || !collectionId || !siteUrl) {
            throw new Error("Billplz configuration missing");
        }

        // Billplz amount is in cents
        const amountCents = Math.round(args.amount * 100);
        const receiptId = `rcpt_${crypto.randomUUID().replace(/-/g, "")}`;
        const description = `Topup for ${business.name}`;

        // Create Bill
        const response = await fetch("https://www.billplz-sandbox.com/api/v3/bills", {
            method: "POST",
            headers: {
                Authorization: `Basic ${btoa(apiKey + ":")}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                collection_id: collectionId,
                description: description,
                email: user.email || "no-email@example.com",
                name: user.name || "User",
                amount: amountCents.toString(),
                callback_url: `${siteUrl}/webhooks/billplz`,
                // redirect_url is where user goes after payment, can be set here or in collection
                redirect_url: process.env.BILLPLZ_REDIRECT_URL || "http://localhost:5173/credits",
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Billplz Error:", errorText);
            throw new Error(`Failed to create Billplz bill: ${errorText}`);
        }

        const billData = (await response.json()) as { id: string; url: string; };

        // Store order
        await ctx.runMutation(internal.topup.storeBillplzOrder, {
            businessId: business._id,
            amount: args.amount,
            amountPaise: amountCents, // reusing field for cents
            currency: "MYR",
            billplzId: billData.id,
            billplzUrl: billData.url,
            receipt: receiptId,
        });

        return {
            billUrl: billData.url,
            billId: billData.id,
        };
    },
});

export const getResumeOrderDetails = action({
    args: {
        orderId: v.string(), // This is the Razorpay order ID (e.g. order_P...)
    },
    handler: async (ctx, args): Promise<{
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
        businessName: string;
    }> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const business = await ctx.runQuery(api.businesses.getMyBusiness, {});
        if (!business) throw new Error("Business not found");

        const order = await ctx.runQuery(api.topup.getOrder, { orderId: args.orderId });
        if (!order) throw new Error("Order not found");

        if (order.status === "paid") throw new Error("Order already paid");

        // Get Razorpay key
        const keyId = process.env.RAZORPAY_KEY_ID;
        if (!keyId) throw new Error("Razorpay credentials not configured");


        if (!order.order_id) throw new Error("Invalid order data");

        return {
            orderId: order.order_id,
            amount: order.amount_paise,
            currency: order.currency,
            keyId: keyId,
            businessName: business.name,
        };
    },
});

export const deleteTopupOrder = mutation({
    args: {
        orderId: v.id("topup_orders"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) throw new Error("User not found");

        const order = await ctx.db.get(args.orderId);
        if (!order) throw new Error("Order not found");

        // Verify ownership via business
        const business = await ctx.db.get(order.business_id);
        if (!business || business.user_id !== user.subject) {
            throw new Error("Unauthorized");
        }

        // Prevent deleting paid or pending webhook orders
        if (order.status === "paid" || order.status === "pending_webhook") {
            throw new Error("Cannot delete processed or pending payment");
        }

        // Allow deleting: created, failed, signature_failed
        await ctx.db.delete(args.orderId);
    },
});
