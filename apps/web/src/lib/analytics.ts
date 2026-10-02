
import type { PostHog } from 'posthog-js';

type AuthenticatedUser = {
    id: string;
    email?: string | null;
    name?: string | null;
};

type BusinessAnalyticsSource = {
    _id: string;
    name: string;
    industry?: string | null;
    size?: string | null;
    subscription_plan_type?: string | null;
    subscription_status?: string | null;
    pending_approvals?: number | null;
    credit_balance?: number | null;
    is_onboarded?: boolean | null;
};

type CampaignThresholdAnalyticsSource = {
    views: number;
    payout: number;
};

type CampaignScriptAnalyticsSource = {
    type: string;
    description: string;
};

type CampaignCreationValues = {
    name: string;
    status: string;
    business_name: string;
    total_budget: number;
    asset_links?: string;
    maximum_payout: number;
    category: string[];
    payout_thresholds: CampaignThresholdAnalyticsSource[];
    requirements: string[];
    scripts?: CampaignScriptAnalyticsSource[];
};

type CampaignCreationAnalyticsInput = {
    campaignId?: string;
    business: BusinessAnalyticsSource;
    values: CampaignCreationValues;
    shouldUseCompanyLogo: boolean;
    uploadedLogoR2Key?: string;
    uploadedCoverR2Key?: string;
    launchFee: number;
    totalCharge: number;
    estimatedRemainingCredits: number;
};

type SubmissionAnalyticsSource = {
    _id: string;
    application_id: string;
    campaign_id: string;
    user_id: string;
    type: string;
    status: string;
    attempt_number: number;
    created_at: number;
};

type SubmissionReviewAnalyticsInput = {
    action: 'approved' | 'rejected';
    submission: SubmissionAnalyticsSource;
    campaignName?: string | null;
    campaignBusinessId?: string | null;
    feedback?: string;
    reviewSurface: 'admin_submissions' | 'business_submission_review';
    reviewerRole: 'admin' | 'business_owner';
};

export const BASE_ANALYTICS_CONTEXT = {
    source_app: 'project_banana_web',
    platform: 'web',
} as const;

export const USER_SCOPED_ANALYTICS_KEYS = [
    'authenticated',
    'user_role',
    'is_admin',
    'business_id',
    'business_name',
    'business_industry',
    'business_size',
    'subscription_plan_type',
    'subscription_status',
] as const;

const countDelimitedValues = (value?: string) => {
    if (!value) return 0;

    return value
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean).length;
};

export const registerBaseAnalyticsContext = (posthog: Pick<PostHog, 'register'>) => {
    posthog.register(BASE_ANALYTICS_CONTEXT);
};

export const clearUserScopedAnalyticsContext = (posthog: Pick<PostHog, 'unregister'>) => {
    USER_SCOPED_ANALYTICS_KEYS.forEach((key) => posthog.unregister(key));
};

export const buildUserAnalyticsTraits = ({
    user,
    business,
    isAdmin,
}: {
    user: AuthenticatedUser;
    business?: BusinessAnalyticsSource | null;
    isAdmin: boolean;
}) => ({
    email: user.email ?? null,
    name: user.name ?? null,
    user_role: isAdmin ? 'admin' : business ? 'business_owner' : 'authenticated_user',
    is_admin: isAdmin,
    business_id: business?._id ?? null,
    business_name: business?.name ?? null,
    business_industry: business?.industry ?? null,
    business_size: business?.size ?? null,
    subscription_plan_type: business?.subscription_plan_type ?? null,
    subscription_status: business?.subscription_status ?? null,
    pending_approvals: business?.pending_approvals ?? 0,
    credit_balance: business?.credit_balance ?? null,
    is_onboarded: business?.is_onboarded ?? null,
    ...BASE_ANALYTICS_CONTEXT,
});

export const buildCampaignCreationEventProperties = ({
    campaignId,
    business,
    values,
    shouldUseCompanyLogo,
    uploadedLogoR2Key,
    uploadedCoverR2Key,
    launchFee,
    totalCharge,
    estimatedRemainingCredits,
}: CampaignCreationAnalyticsInput) => ({
    campaign_id: campaignId,
    campaign_name: values.name,
    campaign_status: values.status,
    business_id: business._id,
    business_name: values.business_name,
    business_credit_balance: business.credit_balance ?? null,
    business_subscription_plan_type: business.subscription_plan_type ?? null,
    category: values.category,
    category_count: values.category.length,
    total_budget: values.total_budget,
    maximum_payout: values.maximum_payout,
    payout_threshold_count: values.payout_thresholds.length,
    payout_thresholds: values.payout_thresholds,
    requirement_count: values.requirements.length,
    requirements: values.requirements,
    script_count: values.scripts?.length ?? 0,
    scripts: values.scripts ?? [],
    asset_links: values.asset_links ?? '',
    asset_link_count: countDelimitedValues(values.asset_links),
    has_asset_links: Boolean(values.asset_links?.trim()),
    use_company_logo: shouldUseCompanyLogo,
    campaign_logo_source: shouldUseCompanyLogo ? 'business_profile' : uploadedLogoR2Key ? 'campaign_upload' : 'none',
    campaign_logo_uploaded: Boolean(uploadedLogoR2Key),
    campaign_cover_uploaded: Boolean(uploadedCoverR2Key),
    launch_fee: launchFee,
    total_charge: totalCharge,
    estimated_remaining_credits: estimatedRemainingCredits,
    ...BASE_ANALYTICS_CONTEXT,
});

export const buildSubmissionReviewEventProperties = ({
    action,
    submission,
    campaignName,
    campaignBusinessId,
    feedback,
    reviewSurface,
    reviewerRole,
}: SubmissionReviewAnalyticsInput) => {
    const trimmedFeedback = feedback?.trim() ?? '';

    return {
        action,
        submission_id: submission._id,
        submission_type: submission.type,
        submission_status_before: submission.status,
        submission_status_after: action === 'approved' ? 'ready_to_post' : 'changes_requested',
        submission_attempt_number: submission.attempt_number,
        submission_created_at: submission.created_at,
        submission_owner_user_id: submission.user_id,
        application_id: submission.application_id,
        campaign_id: submission.campaign_id,
        campaign_name: campaignName ?? null,
        campaign_business_id: campaignBusinessId ?? null,
        feedback: trimmedFeedback || null,
        feedback_provided: Boolean(trimmedFeedback),
        feedback_length: trimmedFeedback.length,
        review_surface: reviewSurface,
        reviewer_role: reviewerRole,
        ...BASE_ANALYTICS_CONTEXT,
    };
};

export const buildAnalyticsErrorProperties = (error: unknown) => {
    if (typeof error !== 'object' || error === null) {
        return {
            error_message: String(error),
        };
    }

    const data = 'data' in error && typeof error.data === 'object' && error.data !== null
        ? error.data as Record<string, unknown>
        : null;

    return {
        error_name: 'name' in error && typeof error.name === 'string' ? error.name : null,
        error_message: 'message' in error && typeof error.message === 'string' ? error.message : String(error),
        error_code: data?.code ?? null,
    };
};