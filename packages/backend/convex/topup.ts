import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { api } from "./_generated/api";

// ============================================================
// QUERIES
// ============================================================

export const getTopUpHistory = query({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return { page: [], isDone: true, continueCursor: "" };

        const user = await ctx.db
            .query("users")
            .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
            .unique();

        if (!user) return { page: [], isDone: true, continueCursor: "" };

        const business = await ctx.db
            .query("businesses")
            .withIndex("by_user", (q) => q.eq("user_id", user._id))
            .unique();

        if (!business) return { page: [], isDone: true, continueCursor: "" };

        return await ctx.db
            .query("topup_orders")
            .withIndex("by_business", (q) => q.eq("business_id", business._id))
            .order("desc")
            .paginate(args.paginationOpts);
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
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");

        const order = await ctx.db.get(args.orderId);
        if (!order) throw new Error("Order not found");

        // Verify ownership via business
        const business = await ctx.db.get(order.business_id);
        if (!business || business.user_id !== user._id) {
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
