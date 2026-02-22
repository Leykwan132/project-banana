export type BillingCycle = 'monthly' | 'annual';

export const STRIPE_PRICES = {
    free: {
        monthly: import.meta.env.VITE_STRIPE_PRICE_PAYG_MONTHLY ?? '',
        annual: import.meta.env.VITE_STRIPE_PRICE_PAYG_ANNUAL ?? '',
    },
    starter: {
        monthly: import.meta.env.VITE_STRIPE_PRICE_STARTER_MONTHLY ?? 'price_1SwdFtGxFs9ga3zc5cI5Weib',
        annual: import.meta.env.VITE_STRIPE_PRICE_STARTER_ANNUAL ?? 'price_1SwdR9GxFs9ga3zcN4TG9KnG',
    },
    growth: {
        monthly: import.meta.env.VITE_STRIPE_PRICE_GROWTH_MONTHLY ?? 'price_1SwdJYGxFs9ga3zcZpNKmp4S',
        annual: import.meta.env.VITE_STRIPE_PRICE_GROWTH_ANNUAL ?? 'price_1SwdUGGxFs9ga3zc6C80xiAz',
    },
    unlimited: {
        monthly: import.meta.env.VITE_STRIPE_PRICE_UNLIMITED_MONTHLY ?? '',
        annual: import.meta.env.VITE_STRIPE_PRICE_UNLIMITED_ANNUAL ?? '',
    },
} as const;

export function getStripePriceId(planType: keyof typeof STRIPE_PRICES, billingCycle: BillingCycle): string {
    return STRIPE_PRICES[planType][billingCycle] ?? '';
}
