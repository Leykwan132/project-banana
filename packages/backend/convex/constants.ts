export const CampaignStatus = {
    Draft: "draft",
    Active: "active",
    Paused: "paused",
    PendingCancellation: "pending_cancellation",
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

export const PayoutStatus = {
    Pending: "pending",
    Processing: "processing",
    Completed: "completed",
    Failed: "failed",
} as const;

export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus];

export const WithdrawalSourceType = {
    Creator: "creator",
    Business: "business",
} as const;

export type WithdrawalSourceType = (typeof WithdrawalSourceType)[keyof typeof WithdrawalSourceType];

export type PlanType = "payasyougo" | "starter" | "growth" | "unlimited";

export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
    payasyougo: "Pay As You Go",
    starter: "Starter",
    growth: "Growth",
    unlimited: "Unlimited",
};

export type CategorySampleExample = {
    title: string;
    link: string;
};

export type CampaignCategory = {
    id: string;
    label: string;
    desc: string;
    examples: CategorySampleExample[];
};

export const CAMPAIGN_CATEGORIES: CampaignCategory[] = [
    {
        id: "challenge",
        label: "Challenge",
        desc: "Fun tasks or trends that creators do to showcase your brand playfully.",
        examples: [
            { title: "Pinn Yang - Guess the number", link: "https://vt.tiktok.com/ZSuvVDnJE/" },
            { title: "Raya - Dance Challenge", link: "https://vt.tiktok.com/ZSuvqag3m/" },
        ],
    },
    {
        id: "product-review",
        label: "Product Review",
        desc: "Honest and detailed feedback highlighting your product's best features.",
        examples: [
            { title: "Skincare - Unboxing", link: "https://vt.tiktok.com/ZSuvqhBNQ/" },
            { title: "Product - Review", link: "https://vt.tiktok.com/ZSuvgdLX2/" },
        ],
    },
    {
        id: "vlog",
        label: "Vlog",
        desc: "Casual, story-style videos integrating your product into daily life.",
        examples: [
            { title: "A day in my life", link: "https://vt.tiktok.com/ZSuvq4ff1/" },
            { title: "Come work with me", link: "https://vt.tiktok.com/ZSuvqV2Sj/" },
        ],
    },
    {
        id: "reaction",
        label: "Reaction",
        desc: "Genuine, unfiltered first impressions of creators trying your product.",
        examples: [
            { title: "Video Reaction", link: "https://vt.tiktok.com/ZSuvbe7xx/" },
            { title: "MV - Reaction", link: "https://vt.tiktok.com/ZSuvb5Fen/" },
        ],
    },
    {
        id: "voiceover",
        label: "Voiceover",
        desc: "A narrative spoken over compelling visuals or B-roll of your product.",
        examples: [
            { title: "Pinn Yang - Umrah", link: "https://vt.tiktok.com/ZSuvVfGQA/" },
            { title: "Travel - Voiceover", link: "https://vt.tiktok.com/ZSuvqGvW1/" },
        ],
    },
    {
        id: "clipping",
        label: "Clipping",
        desc: "Short, viral highlights cut from longer podcasts or stream content.",
        examples: [
            { title: "Intro to Clipping", link: "https://vt.tiktok.com/ZSuvbxGyq/" },
            { title: "IShowSpeed - Sample Stream Clip", link: "https://youtube.com/shorts/qcAzdP0qaYE?si=RzWjZklMxof_t1Xi" },
        ],
    },
];

const DEFAULT_CAMPAIGN_CANCELLATION_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
const configuredCampaignCancellationGraceMs = process.env.CAMPAIGN_CANCELLATION_GRACE_MS;

export const CAMPAIGN_CANCELLATION_GRACE_MS =
    Number(configuredCampaignCancellationGraceMs) || DEFAULT_CAMPAIGN_CANCELLATION_GRACE_MS;

/** Payment gateway fee charged per withdrawal */
export const PAYOUT_GATEWAY_FEE = parseFloat("1.10");
export const PAYOUT_PLATFORM_FEE_RATE = process.env.PAYOUT_PLATFORM_FEE_RATE ? parseFloat(process.env.PAYOUT_PLATFORM_FEE_RATE) : 0.1;
export const MIN_WITHDRAWAL_AMOUNT = process.env.MIN_WITHDRAWAL_AMOUNT ? parseFloat(process.env.MIN_WITHDRAWAL_AMOUNT) : 20;
