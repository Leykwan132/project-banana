import { action, mutation, query } from "./_generated/server";
import { components, api } from "./_generated/api";
import { StripeSubscriptions, } from "@convex-dev/stripe";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const stripeClient = new StripeSubscriptions(components.stripe, {});

// ============================================================
// TYPES
// ============================================================

type PlanType = "starter" | "growth" | "unlimited";
type BillingCycle = "monthly" | "annual";

// Plan configuration mapping
const PLAN_CONFIG: Record<PlanType, {
    name: string;
    campaignLimit: number;
}> = {
    starter: {
        name: "Starter",
        campaignLimit: 1,
    },
    growth: {
        name: "Growth",
        campaignLimit: 5,
    },
    unlimited: {
        name: "Unlimited",
        campaignLimit: -1,
    },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getStripeCredentials(): { secretKey: string } {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        throw new Error("STRIPE_SECRET_KEY not configured");
    }
    return { secretKey };
}

// ============================================================
// QUERIES
// ============================================================

export const getMySubscription = query({
    args: {},
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) return null;

        const business = await ctx.db
            .query("businesses")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .unique();

        if (!business) return null;

        console.log('plan config', PLAN_CONFIG[business.subscription_plan_type as PlanType])
        return {
            subscriptionId: business.stripe_subscription_id,
            status: business.subscription_status,
            planType: business.subscription_plan_type,
            billingCycle: business.subscription_billing_cycle,
            subscriptionAmount: business.subscription_amount,
            planConfig: business.subscription_plan_type
                ? PLAN_CONFIG[business.subscription_plan_type as PlanType]
                : null,
        };
    },
});

// ============================================================
// MUTATIONS
// ============================================================

// Store Stripe subscription after checkout completion (called by webhook)
export const storeStripeSubscription = mutation({
    args: {
        businessId: v.string(),
        stripeCustomerId: v.string(),
        stripeSubscriptionId: v.string(),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        // Validate businessId is a proper Convex ID
        const business = await ctx.db.get(args.businessId as Id<"businesses">);
        if (!business) {
            console.error(`Business not found: ${args.businessId}`);
            return { success: false, error: "Business not found" };
        }

        await ctx.db.patch(business._id, {
            stripe_customer_id: args.stripeCustomerId,
            stripe_subscription_id: args.stripeSubscriptionId,
            subscription_status: args.status,
            updated_at: Date.now(),
        });

        return { success: true };
    },
});

// Update subscription status from webhooks
export const updateStripeSubscriptionStatus = mutation({
    args: {
        businessId: v.string(),
        status: v.string(),
        planType: v.optional(v.string()), // 'starter' | 'growth'
        billingCycle: v.optional(v.string()), // 'month' | 'year'
        amount: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const business = await ctx.db.get(args.businessId as Id<"businesses">);

        if (!business) {
            return { success: false, error: "Business not found" };
        }

        const updates: any = {
            subscription_status: args.status,
        };

        if (args.planType) updates.subscription_plan_type = args.planType;
        if (args.billingCycle) updates.subscription_billing_cycle = args.billingCycle === 'year' ? 'annual' : 'monthly';
        if (args.amount) updates.subscription_amount = args.amount;

        await ctx.db.patch(business._id, updates);

        return { success: true };
    },
});

// Clear subscription (for cancelled subscriptions)
export const clearSubscription = mutation({
    args: {
        stripeSubscriptionId: v.string(),
    },
    handler: async (ctx, args) => {
        const business = await ctx.db
            .query("businesses")
            .withIndex("by_stripe_subscription", (q) =>
                q.eq("stripe_subscription_id", args.stripeSubscriptionId)
            )
            .unique();

        if (!business) {
            return { success: false, error: "Business not found" };
        }

        await ctx.db.patch(business._id, {
            stripe_subscription_id: undefined,
            subscription_status: undefined,
            subscription_plan_type: undefined,
            subscription_billing_cycle: undefined,
            updated_at: Date.now(),
        });

        return { success: true };
    },
});

// ============================================================
// ACTIONS
// ============================================================

// Create a checkout session for a subscription
export const createSubscriptionCheckout = action({
    args: {
        priceId: v.string(),
        planType: v.string(),
        billingCycle: v.string(),
    },
    returns: v.object({
        sessionId: v.string(),
        url: v.union(v.string(), v.null()),
    }),
    handler: async (ctx, args): Promise<{ sessionId: string; url: string | null }> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const business = await ctx.runQuery(api.businesses.getMyBusiness, {});
        // Fix for circular dependency issue with api import - use any cast if needed or just trust runtime
        if (!business) throw new Error("Business not found");

        // Get or create a Stripe customer
        const customer = await stripeClient.getOrCreateCustomer(ctx, {
            userId: identity.subject,
            email: identity.email,
            name: identity.name,
        });

        const { secretKey } = getStripeCredentials();

        // Create Stripe Checkout session manually to support trial period
        const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Bearer ${secretKey}`,
            },
            body: new URLSearchParams({
                "mode": "subscription",
                "payment_method_types[0]": "card",
                "line_items[0][price]": args.priceId,
                "line_items[0][quantity]": "1",
                // TODO: update this to 14 days
                // "subscription_data[trial_period_days]": "14",
                "success_url": "http://localhost:5173/overview?success=true",
                "cancel_url": "http://localhost:5173/overview?canceled=true",
                "client_reference_id": business._id,
                "customer": customer.customerId,
                "metadata[businessId]": business._id,
                "subscription_data[metadata][userId]": identity.subject,
                "subscription_data[metadata][businessId]": business._id,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create checkout session: ${errorText}`);
        }

        const session = await response.json();


        return {
            sessionId: session.id,
            url: session.url,
        };
    },
});

// Create a checkout session for a one-time payment
// Create a checkout session for a top-up payment with dynamic amount
// Create a checkout session for a one-time payment
export const createPaymentCheckout = action({
    args: { priceId: v.string() },
    returns: v.object({
        sessionId: v.string(),
        url: v.union(v.string(), v.null()),
    }),
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const customer = await stripeClient.getOrCreateCustomer(ctx, {
            userId: identity.subject,
            email: identity.email,
            name: identity.name,
        });

        return await stripeClient.createCheckoutSession(ctx, {
            priceId: args.priceId,
            customerId: customer.customerId,
            metadata: { userId: identity.subject, type: "topup_credit" },
            mode: "payment",
            successUrl: "http://localhost:5173/credits?success=true",
            cancelUrl: "http://localhost:5173/credits?canceled=true",
            paymentIntentMetadata: { userId: identity.subject, type: "topup_credit" },
        });
    },
});

// Get subscription details from Stripe
export const getSubscriptionDetails = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const subscriptions = await ctx.runQuery(
            components.stripe.public.listSubscriptionsByUserId,
            { userId: identity.subject },
        ); // uses Stripe component public query [[Stripe API ref](https://www.convex.dev/components/stripe#api-reference)]

        return subscriptions[0] ?? null;
    },
});

// Cancel subscription (at end of billing period)
export const cancelSubscription = action({
    args: {},
    handler: async (ctx): Promise<{ success: boolean }> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const business = await ctx.runQuery(api.businesses.getMyBusiness, {});
        if (!business || !business.stripe_subscription_id) {
            throw new Error("No subscription found");
        }

        if (!["active", "trialing", "past_due"].includes(business.subscription_status || "")) {
            throw new Error("Cannot cancel subscription in current state");
        }

        const { secretKey } = getStripeCredentials();

        // Cancel at end of billing period
        const response = await fetch(
            `https://api.stripe.com/v1/subscriptions/${business.stripe_subscription_id}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Bearer ${secretKey}`,
                },
                body: new URLSearchParams({
                    "cancel_at_period_end": "true",
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to cancel subscription: ${errorText}`);
        }

        return { success: true };
    },
});

// Create customer portal session for managing subscription
export const createPortalSession = action({
    args: {
        returnUrl: v.string(),
    },
    handler: async (ctx, args): Promise<{ portalUrl: string }> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const customer = await stripeClient.getOrCreateCustomer(ctx, {
            userId: identity.subject,
            email: identity.email,
            name: identity.name,
        });

        const response = await stripeClient.createCustomerPortalSession(ctx, {
            customerId: customer.customerId,
            returnUrl: args.returnUrl,
        })

        return {
            portalUrl: response.url,
        };
    },
});
