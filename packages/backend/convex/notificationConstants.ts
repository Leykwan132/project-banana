export const NotificationType = {
    SubmissionApproved: "submission_approved",
    SubmissionRejected: "submission_rejected",
    PostDescriptionMissing: "post_description_missing",
    PostEarning: "post_earning",
    ApplicationUpdatesSummary: "application_updates_summary",
    BankAccountApproved: "bank_account_approved",
    BankAccountRejected: "bank_account_rejected",
    WithdrawalPaid: "withdrawal_paid",
} as const;

export type NotificationType = typeof NotificationType[keyof typeof NotificationType];

export const NotificationCopy = {
    submissionApproved: {
        title: "Submission Approved! 🥳",
        description: (campaignName: string) => `Amazing! Your submission for ${campaignName} has been approved. Please check the next step before posting!`,

    },
    submissionRejected: {
        title: "Update your submission 📝",
        description: (businessName: string, campaignName: string) =>
            `${businessName} left feedback on your video for ${campaignName}. Tap to view and resubmit!`,
    },
    postDescriptionMissing: {
        title: "Fix your post details ✍️",
        description: (campaignName: string) =>
            `Your post for ${campaignName} needs attention. Review the issue and re-upload link if needed.`,
    },
    postEarning: {
        title: "Your post is earning 💰",
        description: (campaignName: string) =>
            `Your post for ${campaignName} is now earning. Track your payout anytime.`,
    },
    applicationUpdatesSummary: {
        title: "Applications need updates ⚠️",
        description: (count: number) =>
            count === 1
                ? "You have 1 application that needs to be updated."
                : `You have ${count} applications that need to be updated.`,
    },
    bankAccountApproved: {
        title: "Bank account approved ✅",
        description: (endingDigits: string) =>
            `Your bank account ending in ${endingDigits} is verified! You can now withdraw your earnings.`,
    },
    bankAccountRejected: {
        title: "Bank account rejected ⚠️",
        description: (endingDigits: string) =>
            `We couldn't verify your bank account ending in ${endingDigits}. Tap here to add a new one and get paid!`,
    },
    withdrawalPaid: {
        title: "Your payout has landed",
        description: (amount: string, endingDigits: string) =>
            `${amount} has been sent to your bank account ending in ${endingDigits}. Tap to view it.`,
    },
} as const;
