import { CampaignStatus } from '@/constants/campaignStatus';

export type CampaignLifecycleBannerConfig = {
    message: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
};

type CampaignLifecycleBannerVariant = 'application' | 'campaign';

const CAMPAIGN_LIFECYCLE_BANNER_STYLES: Record<
    typeof CampaignStatus[keyof typeof CampaignStatus],
    Omit<CampaignLifecycleBannerConfig, 'message'>
> = {
    [CampaignStatus.Draft]: {
        backgroundColor: '#15803D',
        textColor: '#FFFFFF',
        fontFamily: 'GoogleSans_700Bold',
    },
    [CampaignStatus.Active]: {
        backgroundColor: '#15803D',
        textColor: '#FFFFFF',
        fontFamily: 'GoogleSans_700Bold',
    },
    [CampaignStatus.Paused]: {
        backgroundColor: '#CA8A04',
        textColor: '#FFFFFF',
        fontFamily: 'GoogleSans_700Bold',
    },
    [CampaignStatus.PendingCancellation]: {
        backgroundColor: '#B42318',
        textColor: '#FFFFFF',
        fontFamily: 'GoogleSans_700Bold',
    },
    [CampaignStatus.Completed]: {
        backgroundColor: '#15803D',
        textColor: '#FFFFFF',
        fontFamily: 'GoogleSans_700Bold',
    },
    [CampaignStatus.Cancelled]: {
        backgroundColor: '#B42318',
        textColor: '#FFFFFF',
        fontFamily: 'GoogleSans_700Bold',
    },
};

const CAMPAIGN_LIFECYCLE_BANNER_MESSAGES: Record<
    CampaignLifecycleBannerVariant,
    Partial<Record<typeof CampaignStatus[keyof typeof CampaignStatus], string>>
> = {
    application: {
        [CampaignStatus.PendingCancellation]: 'Campaign ending soon',
        [CampaignStatus.Paused]: "You're lucky! Campaign is no longer taking new submission",
        [CampaignStatus.Completed]: 'Fully claimed',
        [CampaignStatus.Cancelled]: 'Campaign ended',
    },
    campaign: {
        [CampaignStatus.PendingCancellation]: 'Campaign ending soon. Post now!',
        [CampaignStatus.Paused]: "You're lucky! Campaign is no longer taking new submission.",
        [CampaignStatus.Completed]: 'Campaign has been fully claimed',
        [CampaignStatus.Cancelled]: 'No longer accepting submissions.',
    },
};

export const getCampaignLifecycleBanner = (
    status?: string,
    variant: CampaignLifecycleBannerVariant = 'campaign'
): CampaignLifecycleBannerConfig | null => {
    if (
        status !== CampaignStatus.PendingCancellation &&
        status !== CampaignStatus.Paused &&
        status !== CampaignStatus.Completed &&
        status !== CampaignStatus.Cancelled
    ) {
        return null;
    }

    const message = CAMPAIGN_LIFECYCLE_BANNER_MESSAGES[variant][status];
    if (!message) return null;

    return {
        message,
        ...CAMPAIGN_LIFECYCLE_BANNER_STYLES[status],
    };
};
