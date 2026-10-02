export type CreatorSubmissionAction = 'upload-video' | 'submit-links' | 'waiting' | 'create-another' | 'closed';

export function getCreatorSubmissionAction(applicationStatus: string, campaignStatus: string): CreatorSubmissionAction {
    if (campaignStatus === 'completed' || campaignStatus === 'cancelled') return 'closed';

    if (campaignStatus === 'pending_cancellation') {
        return applicationStatus === 'ready_to_post' ? 'submit-links' : 'closed';
    }

    if (applicationStatus === 'earning') return campaignStatus === 'active' ? 'create-another' : 'closed';
    if (applicationStatus === 'ready_to_post' || applicationStatus === 'action_required') return 'submit-links';
    if (applicationStatus === 'reviewing' || applicationStatus === 'pending_review' || applicationStatus === 'verifying') return 'waiting';
    if (applicationStatus === 'pending_submission' || applicationStatus === 'changes_requested') return 'upload-video';

    return 'waiting';
}
