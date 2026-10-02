import { describe, expect, test } from 'bun:test';
import { businessAccountActions, businessFundsNavigation, businessSubscriptionActions } from '../src/lib/business-sidebar-navigation';

describe('business sidebar navigation', () => {
  test('keeps bank accounts with funds and settings in account actions', () => {
    expect(businessFundsNavigation.map(({ name }) => name)).toEqual([
      'Credits',
      'Withdrawals',
      'Bank Accounts',
    ]);
    expect(businessAccountActions.map(({ name }) => name)).toEqual([
      'Settings',
    ]);
  });

  test('offers one subscription upgrade action that opens the subscription page', () => {
    expect(businessSubscriptionActions).toEqual([
      { name: 'Upgrade plan', href: '/subscription' },
    ]);
  });
});
