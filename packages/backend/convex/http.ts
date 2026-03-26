import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, components, internal } from "./_generated/api";
import { registerRoutes } from "@convex-dev/stripe";
import type Stripe from "stripe";
import { authComponent, createAuth } from "./auth";
import { generateWebhookSignature, generateChecksumSHA512 } from "./utils";
import { PLAN_TYPE_LABELS, type PlanType } from "./constants";


type StripePlanDetails = {
    dbValue: PlanType;
};

const priceIdToPlan: Record<string, StripePlanDetails> = {};

const registerPricePlan = (priceId: string | undefined, plan: StripePlanDetails) => {
    if (!priceId) return;
    priceIdToPlan[priceId] = plan;
};

registerPricePlan(process.env.STRIPE_PRICE_STARTER_MONTHLY, { dbValue: "starter" });
registerPricePlan(process.env.STRIPE_PRICE_STARTER_ANNUAL, { dbValue: "starter" });
registerPricePlan(process.env.STRIPE_PRICE_GROWTH_MONTHLY, { dbValue: "growth" });
registerPricePlan(process.env.STRIPE_PRICE_GROWTH_ANNUAL, { dbValue: "growth" });
registerPricePlan(process.env.STRIPE_PRICE_PAYG_MONTHLY, { dbValue: "payasyougo" });
registerPricePlan(process.env.STRIPE_PRICE_PAYG_ANNUAL, { dbValue: "payasyougo" });
registerPricePlan(process.env.STRIPE_PRICE_UNLIMITED_MONTHLY, { dbValue: "unlimited" });
registerPricePlan(process.env.STRIPE_PRICE_UNLIMITED_ANNUAL, { dbValue: "unlimited" });

const SUBSCRIPTION_REDIRECT_URL = process.env.SITE_URL ? `${process.env.SITE_URL}/subscription` : null;

const shouldSendSubscriptionUpdateEmail = (
    currentPlanType: string | undefined,
    nextPlan?: StripePlanDetails,
) => {
    if (!nextPlan) {
        return false;
    }

    return currentPlanType !== nextPlan.dbValue;
};

const sendSubscriptionUpdateEmail = async (
    ctx: any,
    args: {
        businessId: string;
        plan?: StripePlanDetails;
    },
) => {
    if (!args.plan) {
        console.error(`Unable to send subscription update email for business ${args.businessId}: unknown plan`);
        return;
    }

    if (!SUBSCRIPTION_REDIRECT_URL) {
        console.error(`Unable to send subscription update email for business ${args.businessId}: SITE_URL is not configured`);
        return;
    }

    const business = await ctx.runQuery(api.businesses.getBusiness, {
        businessId: args.businessId as any,
    });

    if (!business) {
        console.error(`Unable to send subscription update email: business ${args.businessId} not found`);
        return;
    }

    const authUser = await authComponent.getAnyUserById(ctx, business.user_id);
    if (!authUser?.email) {
        console.error(`Unable to send subscription update email for business ${args.businessId}: email is not configured`);
        return;
    }

    await ctx.runAction((internal as any).emails.sendSubscriptionUpdatesEmail, {
        email: authUser.email,
        planType: PLAN_TYPE_LABELS[args.plan.dbValue],
        redirectUrl: SUBSCRIPTION_REDIRECT_URL,
    });
};

const http = httpRouter();

authComponent.registerRoutes(http, createAuth, { cors: true });

// ============================================================
// STRIPE WEBHOOK (For Subscriptions)
// ============================================================
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

                // Businesses are keyed by the Better Auth subject, not the notification-only users table.
                const business = await ctx.runQuery(api.businesses.getBusinessByUserId, { userId });
                if (!business) {
                    console.error(`Business not found for user: ${userId}`);
                    return;
                }

                // Calculate amount from session.amount_total (in cents) to main currency (RM)
                const amountInCents = session.amount_total ?? 0;
                const amount = amountInCents / 100;

                // Add credits to the business
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

            const existingBusiness = await ctx.runQuery(api.businesses.getBusiness, {
                businessId: businessId as any,
            });

            await ctx.runMutation(api.stripe.updateStripeSubscriptionStatus, {
                businessId: businessId,
                status: status,
                planType: plan?.dbValue,
                billingCycle: billingCycle,
                amount: unitAmount,
            });

            // Mark business as onboarded once a subscribed plan is created.
            await ctx.runMutation(internal.businesses.setBusinessOnboarded, {
                businessId,
                isOnboarded: true,
            });
            console.log(`Business onboarded: ${businessId}`);

            if (shouldSendSubscriptionUpdateEmail(existingBusiness?.subscription_plan_type, plan)) {
                await sendSubscriptionUpdateEmail(ctx, {
                    businessId,
                    plan,
                });
            } else {
                console.log(`Skipping subscription created email for ${businessId}: plan unchanged (${existingBusiness?.subscription_plan_type ?? "none"} -> ${plan?.dbValue ?? "unknown"})`);
            }

            console.log(`Subscription created: ${subscriptionId}, status: ${status}, plan: ${plan ? PLAN_TYPE_LABELS[plan.dbValue] : "Unknown"}, dbValue: ${plan?.dbValue ?? "unknown"}, cycle: ${billingCycle}`);
        },

        "customer.subscription.updated": async (ctx, event: Stripe.CustomerSubscriptionUpdatedEvent) => {
            const subscription = event.data.object;
            const status = subscription.status;

            const billingCycle = event.data.object.items.data[0].price.recurring?.interval;
            const priceId = event.data.object.items.data[0].price.id;
            const plan = priceIdToPlan[priceId];
            const unitAmount = event.data.object.items.data[0].price.unit_amount ? event.data.object.items.data[0].price.unit_amount / 100 : 0;
            const businessId = event.data.object.metadata?.businessId;

            const existingBusiness = businessId
                ? await ctx.runQuery(api.businesses.getBusiness, {
                    businessId: businessId as any,
                })
                : null;

            await ctx.runMutation(api.stripe.updateStripeSubscriptionStatus, {
                businessId: businessId,
                status: status,
                planType: plan?.dbValue,
                billingCycle: billingCycle,
                amount: unitAmount,
            });

            if (businessId) {
                if (shouldSendSubscriptionUpdateEmail(existingBusiness?.subscription_plan_type, plan)) {
                    await sendSubscriptionUpdateEmail(ctx, {
                        businessId,
                        plan,
                    });
                } else {
                    console.log(`Skipping subscription updated email for ${businessId}: plan unchanged (${existingBusiness?.subscription_plan_type ?? "none"} -> ${plan?.dbValue ?? "unknown"})`);
                }
            } else {
                console.error(`Subscription updated without businessId metadata: ${subscription.id}`);
            }

            console.log(`Subscription updated: ${businessId}, status: ${status}, plan: ${plan ? PLAN_TYPE_LABELS[plan.dbValue] : "Unknown"}, dbValue: ${plan?.dbValue ?? "unknown"}, cycle: ${billingCycle}`);
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
    //@ts-ignore
    onEvent: async (ctx, event: Stripe.Event) => {
        // Called for ALL events - useful for logging/analytics
        console.log("Stripe event:", event.type);
    },
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


// ============================================================
// BILLPLZ PAYMENT ORDER CALLBACK (For Payouts)
// ============================================================

http.route({
    path: "/webhooks/billplz/payment_order",
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

            // Parse body (form-urlencoded or JSON)
            const contentType = request.headers.get("content-type") || "";
            let params: Record<string, any> = {};

            if (contentType.includes("application/json")) {
                params = await request.json();
            } else {
                const text = await request.text();
                const urlParams = new URLSearchParams(text);
                urlParams.forEach((value, key) => {
                    params[key] = value;
                });
            }

            const checksum = params.checksum;
            if (!checksum) {
                console.error("Missing checksum in Billplz payment order callback");
                return new Response(
                    JSON.stringify({ error: "Missing checksum" }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                );
            }

            // Verify SHA-512 checksum
            // Callback checksum fields (strict order): [id, bank_account_number, status, total, reference_id, epoch]
            const id = params.id || "";
            const bankAccountNumber = params.bank_account_number || "";
            const status = params.status || "";
            const total = params.total !== undefined ? String(params.total) : "";
            const referenceId = params.reference_id || "";
            const epoch = params.epoch !== undefined ? String(params.epoch) : "";

            const rawString = `${id}${bankAccountNumber}${status}${total}${referenceId}${epoch}`;
            const expectedChecksum = await generateChecksumSHA512(rawString, xSignatureKey);

            if (expectedChecksum !== checksum) {
                console.error(`Invalid Billplz Payment Order checksum. Expected: ${expectedChecksum}, Got: ${checksum}`);
                return new Response(
                    JSON.stringify({ error: "Invalid checksum" }),
                    { status: 401, headers: { "Content-Type": "application/json" } }
                );
            }

            // Only process "completed" or "refunded" statuses
            if (status === "completed" || status === "refunded") {
                console.log(`Processing Billplz Payment Order callback: ${id}, status: ${status}`);
                await ctx.runMutation(internal.payouts.processPaymentOrderCallback, {
                    billplzPaymentOrderId: id,
                    status: status,
                });
                console.log(`Successfully processed Billplz Payment Order callback: ${id}`);
            } else {
                console.log(`Ignoring Billplz Payment Order callback with status: ${status}`);
            }

            return new Response(
                JSON.stringify({ success: true }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        } catch (error) {
            console.error("Billplz Payment Order webhook error:", error);
            return new Response(
                JSON.stringify({ error: "Webhook processing failed" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
    }),
});

export default http;
