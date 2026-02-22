import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, components, internal } from "./_generated/api";
import { authKit } from "./auth";
import { registerRoutes } from "@convex-dev/stripe";
import type Stripe from "stripe";
import { authComponent, createAuth } from "./auth";

const priceIdToPlan: Record<string, string> = {};

if (process.env.STRIPE_PRICE_STARTER_MONTHLY) priceIdToPlan[process.env.STRIPE_PRICE_STARTER_MONTHLY] = "starter";
if (process.env.STRIPE_PRICE_STARTER_ANNUAL) priceIdToPlan[process.env.STRIPE_PRICE_STARTER_ANNUAL] = "starter";
if (process.env.STRIPE_PRICE_GROWTH_MONTHLY) priceIdToPlan[process.env.STRIPE_PRICE_GROWTH_MONTHLY] = "growth";
if (process.env.STRIPE_PRICE_GROWTH_ANNUAL) priceIdToPlan[process.env.STRIPE_PRICE_GROWTH_ANNUAL] = "growth";
if (process.env.STRIPE_PRICE_PAYG_MONTHLY) priceIdToPlan[process.env.STRIPE_PRICE_PAYG_MONTHLY] = "free";
if (process.env.STRIPE_PRICE_PAYG_ANNUAL) priceIdToPlan[process.env.STRIPE_PRICE_PAYG_ANNUAL] = "free";
if (process.env.STRIPE_PRICE_UNLIMITED_MONTHLY) priceIdToPlan[process.env.STRIPE_PRICE_UNLIMITED_MONTHLY] = "unlimited";
if (process.env.STRIPE_PRICE_UNLIMITED_ANNUAL) priceIdToPlan[process.env.STRIPE_PRICE_UNLIMITED_ANNUAL] = "unlimited";

const http = httpRouter();
authKit.registerRoutes(http);

// ============================================================
// RAZORPAY WEBHOOK (For Top-up/Credits only)
// ============================================================

authComponent.registerRoutes(http, createAuth, { cors: true });


http.route({
    path: "/webhooks/razorpay",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            // Get raw body for signature verification
            const body = await request.text();
            const signature = request.headers.get("x-razorpay-signature");

            if (!signature) {
                return new Response(
                    JSON.stringify({ error: "Missing signature header" }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                );
            }

            // Verify webhook signature
            const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
            if (!webhookSecret) {
                console.error("RAZORPAY_WEBHOOK_SECRET not configured");
                return new Response(
                    JSON.stringify({ error: "Webhook not configured" }),
                    { status: 500, headers: { "Content-Type": "application/json" } }
                );
            }

            const expectedSignature = await generateWebhookSignature(body, webhookSecret);
            if (expectedSignature !== signature) {
                console.error("Invalid webhook signature");
                return new Response(
                    JSON.stringify({ error: "Invalid signature" }),
                    { status: 401, headers: { "Content-Type": "application/json" } }
                );
            }

            // Parse the webhook payload
            const payload = JSON.parse(body);
            const event = payload.event;

            // Only process order.paid events (for top-up/credits)
            if (event === "order.paid") {
                const orderId = payload.payload.order.entity.id;
                const paymentId = payload.payload.payment.entity.id;

                // Process the payment (add credits)
                await ctx.runMutation(api.topup.processWebhookPayment, {
                    orderId,
                    razorpayPaymentId: paymentId,
                });

                console.log(`Processed order.paid for order: ${orderId}`);
            }

            return new Response(
                JSON.stringify({ success: true }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        } catch (error) {
            console.error("Razorpay webhook error:", error);
            return new Response(
                JSON.stringify({ error: "Webhook processing failed" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
    }),
});

// ============================================================
// BILLPLZ WEBHOOK (For Top-up/Credits)
// ============================================================


http.route({
    path: "/webhooks/billplz",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const xSignatureKey = process.env.BILLPLZ_X_SIGNATURE_KEY;
            if (!xSignatureKey) {
                console.error("BILLPLZ_X_SIGNATURE_KEY not configured");
                return new Response(
                    JSON.stringify({ error: "Webhook not configured" }),
                    { status: 500, headers: { "Content-Type": "application/json" } }
                );
            }

            // Read and parse body
            const contentType = request.headers.get("content-type") || "";
            let params: Record<string, any> = {};

            if (contentType.includes("application/json")) {
                params = await request.json();
            } else {
                // Default to x-www-form-urlencoded as per Billplz docs/usage
                const text = await request.text();
                const urlParams = new URLSearchParams(text);
                urlParams.forEach((value, key) => {
                    params[key] = value;
                });
            }

            // Extract signature from body
            const signature = params.x_signature;
            if (!signature) {
                console.error("Missing x_signature in Billplz webhook body");
                return new Response(
                    JSON.stringify({ error: "Missing signature" }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                );
            }

            // Verify Signature
            // Source: https://www.billplz.com/api#x-signature
            // 1. Gather all fields except 'x_signature'
            // 2. Construct source string: key + value
            // 3. Sort elements (case-insensitive)
            // 4. Join with |
            // 5. HMAC-SHA256 with X Signature Key

            const sourceString = Object.keys(params)
                .filter((key) => key !== "x_signature")
                .map((key) => {
                    // Ensure value is string
                    const value = params[key] !== null && params[key] !== undefined ? String(params[key]) : "";
                    return `${key}${value}`;
                })
                .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
                .join("|");


            const expectedSignature = await generateWebhookSignature(sourceString, xSignatureKey);


            if (expectedSignature !== signature) {
                console.error(`Invalid Billplz signature. Expected: ${expectedSignature}, Got: ${signature}`);
                return new Response(
                    JSON.stringify({ error: "Invalid signature" }),
                    { status: 401, headers: { "Content-Type": "application/json" } }
                );
            }
            const id = params.id;
            const paid = params.paid === "true" || params.paid === true;

            if (id) {
                console.log(`Processing Billplz webhook for bill ${id}, paid: ${paid}`);
                await ctx.runMutation(internal.topup.processBillplzWebhook, {
                    billplzId: id,
                    paid: paid,
                    paidAmount: params.paid_amount ? parseFloat(params.paid_amount) : undefined,
                });
                console.log(`Successfully processed Billplz webhook for bill ${id}`);
            }

            return new Response(
                JSON.stringify({ success: true }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );

        } catch (error) {
            console.error("Billplz webhook error:", error);
            return new Response(
                JSON.stringify({ error: "Webhook processing failed" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
    }),
});

// Helper function to generate HMAC-SHA256 signature for webhook verification
async function generateWebhookSignature(data: string, secret: string): Promise<string> {
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
// STRIPE WEBHOOK (For Subscriptions)
// ============================================================

// http.route({
//     path: "/webhooks/stripe",
//     method: "POST",
//     handler: httpAction(async (ctx, request) => {
//         try {
//             const body = await request.text();
//             const signature = request.headers.get("stripe-signature");

//             if (!signature) {
//                 return new Response(
//                     JSON.stringify({ error: "Missing stripe-signature header" }),
//                     { status: 400, headers: { "Content-Type": "application/json" } }
//                 );
//             }

//             const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
//             if (!webhookSecret) {
//                 console.error("STRIPE_WEBHOOK_SECRET not configured");
//                 return new Response(
//                     JSON.stringify({ error: "Webhook not configured" }),
//                     { status: 500, headers: { "Content-Type": "application/json" } }
//                 );
//             }

//             // Parse signature header
//             const signatureParts = signature.split(",").reduce((acc, part) => {
//                 const [key, value] = part.split("=");
//                 acc[key] = value;
//                 return acc;
//             }, {} as Record<string, string>);

//             const timestamp = signatureParts["t"];
//             const expectedSignature = signatureParts["v1"];

//             if (!timestamp || !expectedSignature) {
//                 return new Response(
//                     JSON.stringify({ error: "Invalid signature format" }),
//                     { status: 400, headers: { "Content-Type": "application/json" } }
//                 );
//             }

//             // Verify signature: HMAC-SHA256 of timestamp.body
//             const signedPayload = `${timestamp}.${body}`;
//             const computedSignature = await generateWebhookSignature(signedPayload, webhookSecret);

//             if (computedSignature !== expectedSignature) {
//                 console.error("Invalid Stripe webhook signature");
//                 return new Response(
//                     JSON.stringify({ error: "Invalid signature" }),
//                     { status: 401, headers: { "Content-Type": "application/json" } }
//                 );
//             }

//             // Parse the event
//             const event = JSON.parse(body);
//             const eventType = event.type;

//             console.log(`Stripe webhook received: ${eventType}`);

//             // Handle checkout.session.completed - user completed payment/subscription setup
//             if (eventType === "checkout.session.completed") {
//                 const session = event.data.object;

//                 // Only process subscription checkouts
//                 if (session.mode === "subscription") {
//                     const customerId = session.customer;
//                     const subscriptionId = session.subscription;
//                     // Check client_reference_id first, then metadata.businessId
//                     const businessId = session.client_reference_id || session.metadata?.businessId;

//                     if (businessId && subscriptionId) {
//                         await ctx.runMutation(api.stripe.storeStripeSubscription, {
//                             businessId,
//                             stripeCustomerId: customerId,
//                             stripeSubscriptionId: subscriptionId,
//                             status: "active", // Will be updated by subscription.updated event
//                         });
//                         console.log(`Checkout completed for business: ${businessId}, subscription: ${subscriptionId}`);
//                     }
//                 }
//             }

//             // Handle subscription updates
//             if (eventType === "customer.subscription.updated") {
//                 const subscription = event.data.object;
//                 const subscriptionId = subscription.id;
//                 const status = subscription.status;

//                 await ctx.runMutation(api.stripe.updateStripeSubscriptionStatus, {
//                     stripeSubscriptionId: subscriptionId,
//                     status: status,
//                 });
//                 console.log(`Subscription updated: ${subscriptionId}, status: ${status}`);
//             }

//             // Handle subscription deletion/cancellation
//             if (eventType === "customer.subscription.deleted") {
//                 const subscription = event.data.object;
//                 const subscriptionId = subscription.id;

//                 await ctx.runMutation(api.stripe.updateStripeSubscriptionStatus, {
//                     stripeSubscriptionId: subscriptionId,
//                     status: "canceled",
//                 });
//                 console.log(`Subscription deleted: ${subscriptionId}`);
//             }

//             // Handle failed payments
//             if (eventType === "invoice.payment_failed") {
//                 const invoice = event.data.object;
//                 const subscriptionId = invoice.subscription;

//                 if (subscriptionId) {
//                     await ctx.runMutation(api.stripe.updateStripeSubscriptionStatus, {
//                         stripeSubscriptionId: subscriptionId,
//                         status: "past_due",
//                     });
//                     console.log(`Payment failed for subscription: ${subscriptionId}`);
//                 }
//             }

//             return new Response(
//                 JSON.stringify({ received: true }),
//                 { status: 200, headers: { "Content-Type": "application/json" } }
//             );
//         } catch (error) {
//             console.error("Stripe webhook error:", error);
//             return new Response(
//                 JSON.stringify({ error: "Webhook processing failed" }),
//                 { status: 500, headers: { "Content-Type": "application/json" } }
//             );
//         }
//     }),
// });
registerRoutes(http, components.stripe, {
    webhookPath: "/stripe/webhook",
    events: {
        "checkout.session.completed": async (ctx, event: Stripe.CheckoutSessionCompletedEvent) => {
            const session = event.data.object;

            if (session.metadata?.type === "topup_credit") {
                // Get userId from metadata
                const userId = session.metadata.userId;
                if (!userId) {
                    console.error("Missing userId in topup session metadata");
                    return;
                }

                // Look up the user
                const user = await ctx.runQuery(api.users.getUserByAuthId, { authId: userId });
                if (!user) {
                    console.error(`User not found for authId: ${userId}`);
                    return;
                }

                // Look up the business for this user
                const business = await ctx.runQuery(api.businesses.getBusinessByUserId, { userId: user._id });
                if (!business) {
                    console.error(`Business not found for user: ${user._id}`);
                    return;
                }

                // Calculate amount from session.amount_total (in cents) to main currency (RM)
                const amountInCents = session.amount_total ?? 0;
                const amount = amountInCents / 100;

                // Add credits to the business
                console.log("Adding credits to business:", business._id, amount);
                await ctx.runMutation(internal.businesses.addCredits, {
                    businessId: business._id,
                    amount,
                    reference: session.id,
                });

                console.log(`Top-up completed for business: ${business._id}, amount: ${amount} RM`);
            }
        },

        "customer.subscription.created": async (ctx, event: Stripe.CustomerSubscriptionCreatedEvent) => {
            const subscription = event.data.object;
            const subscriptionId = subscription.id;
            const status = subscription.status;

            const billingCycle = event.data.object.items.data[0].price.recurring?.interval;
            const priceId = event.data.object.items.data[0].price.id;
            const plan = priceIdToPlan[priceId];
            const unitAmount = event.data.object.items.data[0].price.unit_amount ? event.data.object.items.data[0].price.unit_amount / 100 : 0;
            const businessId = event.data.object.metadata?.businessId;

            if (!businessId) {
                console.error(`Subscription created without businessId metadata: ${subscriptionId}`);
                return;
            }

            console.log('plan', plan)
            await ctx.runMutation(api.stripe.updateStripeSubscriptionStatus, {
                businessId: businessId,
                status: status,
                planType: plan,
                billingCycle: billingCycle,
                amount: unitAmount,
            });

            // Mark business as onboarded once a subscribed plan is created.
            await ctx.runMutation(internal.businesses.setBusinessOnboarded, {
                businessId,
                isOnboarded: true,
            });
            console.log(`Business onboarded: ${businessId}`);

            console.log(`Subscription created: ${subscriptionId}, status: ${status}, plan: ${plan}, cycle: ${billingCycle}`);
        },

        "customer.subscription.updated": async (ctx, event: Stripe.CustomerSubscriptionUpdatedEvent) => {
            const subscription = event.data.object;
            const status = subscription.status;

            const billingCycle = event.data.object.items.data[0].price.recurring?.interval;
            const priceId = event.data.object.items.data[0].price.id;
            const plan = priceIdToPlan[priceId];
            const unitAmount = event.data.object.items.data[0].price.unit_amount ? event.data.object.items.data[0].price.unit_amount / 100 : 0;
            const businessId = event.data.object.metadata?.businessId;

            await ctx.runMutation(api.stripe.updateStripeSubscriptionStatus, {
                businessId: businessId,
                status: status,
                planType: plan,
                billingCycle: billingCycle,
                amount: unitAmount,
            });
            console.log(`Subscription updated: ${businessId}, status: ${status}, plan: ${plan}, cycle: ${billingCycle}`);
        },

        "customer.subscription.deleted": async (ctx, event: Stripe.CustomerSubscriptionDeletedEvent) => {
            const subscription = event.data.object;
            const status = subscription.status;
            const businessId = event.data.object.metadata?.businessId;

            await ctx.runMutation(api.stripe.updateStripeSubscriptionStatus, {
                businessId: businessId,
                status: status,
            });
            console.log(`Subscription deleted: ${businessId}, status: ${status}`);
        },
    },
    onEvent: async (ctx, event: Stripe.Event) => {
        // Called for ALL events - useful for logging/analytics
        console.log("Stripe event:", event.type);
    },
});

export default http;
