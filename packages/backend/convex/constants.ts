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
