export enum NotificationType {
    SubmissionApproved = "submission_approved",
    SubmissionRejected = "submission_rejected",
    PostDescriptionMissing = "post_description_missing",
    BankAccountApproved = "bank_account_approved",
    BankAccountRejected = "bank_account_rejected",
}

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
        title: "Fix your post description ✍️",
        description: (campaignName: string) =>
            `Your post for ${campaignName} is missing some information. See what's missing here.`,
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
} as const;
