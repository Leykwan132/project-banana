import { expect, test } from 'bun:test';
import { getSubscriptionCheckoutIssue } from '../src/lib/subscription-checkout';

test('identifies a plan with no configured Stripe price', () => {
    expect(getSubscriptionCheckoutIssue('', undefined)).toBe('missing-price');
});

test('identifies a checkout session that has no redirect URL', () => {
    expect(getSubscriptionCheckoutIssue('price_starter_monthly', null)).toBe('missing-checkout-url');
});

test('accepts a configured plan with a Stripe checkout URL', () => {
    expect(getSubscriptionCheckoutIssue('price_starter_monthly', 'https://checkout.stripe.com/session')).toBeNull();
});
