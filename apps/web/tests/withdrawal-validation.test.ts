import { expect, test } from 'bun:test';
import { getWithdrawalValidationError } from '../src/lib/withdrawal-validation';

const validRequest = {
    amount: 100,
    availableBalance: 250,
    minimumAmount: 20,
    gatewayFee: 2,
    hasVerifiedBank: true,
};

test('accepts a withdrawal when the amount and verified bank account are valid', () => {
    expect(getWithdrawalValidationError(validRequest)).toBeNull();
});

test('requires a verified bank account before review', () => {
    expect(getWithdrawalValidationError({ ...validRequest, hasVerifiedBank: false })).toBe(
        'Add and verify a bank account before requesting a withdrawal.'
    );
});

test('rejects a zero withdrawal amount', () => {
    expect(getWithdrawalValidationError({ ...validRequest, amount: 0 })).toBe(
        'Enter a valid withdrawal amount.'
    );
});

test('rejects amounts below the configured minimum', () => {
    expect(getWithdrawalValidationError({ ...validRequest, amount: 19.99 })).toBe(
        'Minimum withdrawal amount is RM 20.00.'
    );
});

test('rejects amounts that do not cover the gateway fee', () => {
    expect(getWithdrawalValidationError({ ...validRequest, amount: 20, gatewayFee: 20 })).toBe(
        'Withdrawal amount must be greater than RM 20.00.'
    );
});

test('rejects amounts above the available balance', () => {
    expect(getWithdrawalValidationError({ ...validRequest, amount: 251 })).toBe(
        'Withdrawal amount exceeds your available balance.'
    );
});
