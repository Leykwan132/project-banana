export const CampaignStatus = {
    Draft: "draft",
    Active: "active",
    Paused: "paused",
    Completed: "completed",
    Cancelled: "cancelled",
} as const;

export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];

export const ApplicationStatus = {
    PendingSubmission: "pending_submission",
    Reviewing: "reviewing",
    ChangesRequested: "changes_requested",
    ReadyToPost: "ready_to_post",
    Verifying: "verifying",
    ActionRequired: "action_required",
    Earning: "earning",
} as const;

export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export const UserCampaignStatus = {
    Earning: "earning",
    MaxedOut: "maxed_out",
    PendingReview: "pending_review",
} as const;

export type UserCampaignStatus = (typeof UserCampaignStatus)[keyof typeof UserCampaignStatus];

export const CreditStatus = {
    Pending: "pending",
    Completed: "completed",
    Failed: "failed",
} as const;

export type CreditStatus = (typeof CreditStatus)[keyof typeof CreditStatus];

export const CreditType = {
    TopUp: "top_up",
    CampaignSpend: "campaign_spend",
    Refund: "refund",
} as const;

export type CreditType = (typeof CreditType)[keyof typeof CreditType];

export const WithdrawalStatus = {
    Pending: "pending",
    Processing: "processing",
    Completed: "completed",
    Failed: "failed",
    Refunded: "refunded",
} as const;

export type WithdrawalStatus = (typeof WithdrawalStatus)[keyof typeof WithdrawalStatus];

export const WithdrawalSourceType = {
    Creator: "creator",
    Business: "business",
} as const;

export type WithdrawalSourceType = (typeof WithdrawalSourceType)[keyof typeof WithdrawalSourceType];

/** Payment gateway fee charged per withdrawal */
export const PAYOUT_GATEWAY_FEE = parseFloat("1.10");
export const PAYOUT_PLATFORM_FEE_RATE = process.env.PAYOUT_PLATFORM_FEE_RATE ? parseFloat(process.env.PAYOUT_PLATFORM_FEE_RATE) : 0.1;
export const MIN_WITHDRAWAL_AMOUNT = process.env.MIN_WITHDRAWAL_AMOUNT ? parseFloat(process.env.MIN_WITHDRAWAL_AMOUNT) : 20;
