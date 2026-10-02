import { describe, expect, it } from 'bun:test';
import { getCreatorSubmissionAction } from '../src/lib/creator-submission-flow';

describe('getCreatorSubmissionAction', () => {
    it('allows a video upload for a pending submission', () => {
        expect(getCreatorSubmissionAction('pending_submission', 'active')).toBe('upload-video');
    });

    it('allows a replacement video after changes are requested', () => {
        expect(getCreatorSubmissionAction('changes_requested', 'active')).toBe('upload-video');
    });

    it('allows post links while a campaign is ending if the application is ready to post', () => {
        expect(getCreatorSubmissionAction('ready_to_post', 'pending_cancellation')).toBe('submit-links');
    });

    it('blocks link submission after an action-required application enters campaign cancellation', () => {
        expect(getCreatorSubmissionAction('action_required', 'pending_cancellation')).toBe('closed');
    });

    it('waits while the current video is under review', () => {
        expect(getCreatorSubmissionAction('reviewing', 'active')).toBe('waiting');
    });

    it('allows another application after earning while the campaign is active', () => {
        expect(getCreatorSubmissionAction('earning', 'active')).toBe('create-another');
    });

    it('blocks submissions when a campaign is cancelled', () => {
        expect(getCreatorSubmissionAction('pending_submission', 'cancelled')).toBe('closed');
    });
});
