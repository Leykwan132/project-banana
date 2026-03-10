export enum NotificationType {
    SubmissionApproved = "submission_approved",
    SubmissionRejected = "submission_rejected",
    BankAccountApproved = "bank_account_approved",
    BankAccountRejected = "bank_account_rejected",
}

export const NotificationCopy = {
    submissionApproved: {
        title: "Submission Approved! 🥳",
        description: (campaignName: string) => `Amazing! Your submission for ${campaignName} has been approved. You're all set to share it and start earning!`,
    },
    submissionRejected: {
        title: "Action Required: Update your submission 📝",
        description: (businessName: string, campaignName: string) =>
            `${businessName} left feedback on your video for ${campaignName}. Tap to view and resubmit!`,
    },
    bankAccountApproved: {
        title: "Bank account approved ✅",
        description: (endingDigits: string) =>
            `Your bank account ending in ${endingDigits} is verified! You can now withdraw your earnings.`,
    },
    bankAccountRejected: {
        title: "Action Needed: Bank account rejected ⚠️",
        description: (endingDigits: string) =>
            `We couldn't verify your bank account ending in ${endingDigits}. Tap here to add a new one and get paid!`,
    },
} as const;
