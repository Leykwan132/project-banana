export enum CampaignStatus {
    Draft = "draft",
    Active = "active",
    Paused = "paused",
    Completed = "completed",
    Cancelled = "cancelled",
}

export enum ApplicationStatus {
    PendingSubmission = "pending_submission",
    Reviewing = "reviewing",
    ChangesRequested = "changes_requested",
    ReadyToPost = "ready_to_post",
    Earning = "earning",
}

export enum UserCampaignStatus {
    Earning = "earning",
    MaxedOut = "maxed_out",
    PendingReview = "pending_review",
}

export enum CreditStatus {
    Pending = "pending",
    Completed = "completed",
    Failed = "failed",
}

export enum CreditType {
    TopUp = "top_up",
    CampaignSpend = "campaign_spend",
    Refund = "refund",
}

export enum WithdrawalStatus {
    Pending = "pending",
    Processing = "processing",
    Completed = "completed",
    Failed = "failed",
    Refunded = "refunded",
}

/** Payment gateway fee charged per withdrawal (RM 1.10) */
export const PAYOUT_GATEWAY_FEE = 1.10;
