import type { ApplicationStatus } from '@/components/ApplicationStatusBadge';
import { CampaignStatus } from '@/constants/campaignStatus';

export const defaultSubmissionBlockedSheetTitle = "Submissions closed";
export const defaultSubmissionBlockedMessage = "This campaign has ended, so you can no longer submit a video or post link.";

export const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return String(error ?? "");
};

export const isSubmissionBlockedError = (error: unknown) =>
    [
        "video submissions are closed",
        "post submissions are closed",
        "new video submissions are no longer allowed",
        "only approved posts in ready to post can still be submitted",
    ].some((text) => getErrorMessage(error).toLowerCase().includes(text));

export const getSubmissionBlockedMessage = ({
    campaignStatus,
    applicationStatus,
    action,
}: {
    campaignStatus?: string;
    applicationStatus?: ApplicationStatus;
    action: 'video' | 'post' | 'general';
}) => {
    if (campaignStatus === CampaignStatus.PendingCancellation) {
        if (action === 'video') {
            return "This campaign is ending. New video submissions are no longer allowed.";
        }

        if (applicationStatus !== 'Ready to Post') {
            return "This campaign is ending. Only approved posts in Ready to Post can still be submitted.";
        }
    }

    if (campaignStatus === CampaignStatus.Completed || campaignStatus === CampaignStatus.Cancelled) {
        if (action === 'video') {
            return "This campaign has ended. Video submissions are closed.";
        }

        if (action === 'post') {
            return "This campaign has ended. Post submissions are closed.";
        }
    }

    return defaultSubmissionBlockedMessage;
};

export const getSubmissionBlockedTitle = (campaignStatus?: string) =>
    campaignStatus === CampaignStatus.PendingCancellation ? 'Campaign ending' : defaultSubmissionBlockedSheetTitle;
