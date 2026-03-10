export enum NotificationType {
    SubmissionApproved = 'submission_approved',
    SubmissionRejected = 'submission_rejected',
    BankAccountApproved = 'bank_account_approved',
    BankAccountRejected = 'bank_account_rejected',
}

export const NotificationModalCopy = {
    bankAccountApproved: {
        title: 'Bank account approved ✅',
        description: (endingDigits?: string) =>
            `Your bank account${endingDigits ? ` ending in ${endingDigits}` : ''} is verified! You can now withdraw your earnings.`,
    },
    bankAccountRejected: {
        title: 'Action Needed: Bank account rejected ⚠️',
        description: (endingDigits?: string) =>
            `We couldn't verify your bank account${endingDigits ? ` ending in ${endingDigits}` : ''}. Tap here to add a new one and get paid!`,
    },
} as const;
