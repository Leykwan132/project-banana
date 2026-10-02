export type WithdrawalValidationInput = {
    amount: number;
    availableBalance: number;
    minimumAmount: number;
    gatewayFee: number;
    hasVerifiedBank: boolean;
};

const formatCurrency = (value: number) =>
    `RM ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function getWithdrawalValidationError({
    amount,
    availableBalance,
    minimumAmount,
    gatewayFee,
    hasVerifiedBank,
}: WithdrawalValidationInput): string | null {
    if (!hasVerifiedBank) {
        return 'Add and verify a bank account before requesting a withdrawal.';
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        return 'Enter a valid withdrawal amount.';
    }

    if (minimumAmount > 0 && amount < minimumAmount) {
        return `Minimum withdrawal amount is ${formatCurrency(minimumAmount)}.`;
    }

    if (amount <= gatewayFee) {
        return `Withdrawal amount must be greater than ${formatCurrency(gatewayFee)}.`;
    }

    if (amount > availableBalance) {
        return 'Withdrawal amount exceeds your available balance.';
    }

    return null;
}
