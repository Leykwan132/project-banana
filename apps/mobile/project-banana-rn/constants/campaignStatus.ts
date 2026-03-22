// Keep app-safe enum values in sync with packages/backend/convex/constants.ts.
export const CampaignStatus = {
    Draft: "draft",
    Active: "active",
    Paused: "paused",
    PendingCancellation: "pending_cancellation",
    Completed: "completed",
    Cancelled: "cancelled",
} as const;

export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];
