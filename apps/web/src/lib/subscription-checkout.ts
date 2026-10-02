export type SubscriptionCheckoutIssue = 'missing-price' | 'missing-checkout-url';

export function getSubscriptionCheckoutIssue(
    priceId: string,
    checkoutUrl?: string | null,
): SubscriptionCheckoutIssue | null {
    if (!priceId) return 'missing-price';
    if (checkoutUrl === null) return 'missing-checkout-url';
    return null;
}
