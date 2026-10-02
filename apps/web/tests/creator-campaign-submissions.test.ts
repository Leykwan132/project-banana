import { describe, expect, it } from 'bun:test';
import { getCreatorCampaignSubmissionState } from '../src/lib/creator-submission-flow';

describe('getCreatorCampaignSubmissionState', () => {
    it('keeps earning applications in the campaign history while allowing another submission', () => {
        const earningApplication = { id: 'application-1', status: 'earning' };

        expect(getCreatorCampaignSubmissionState([earningApplication])).toEqual({
            currentApplication: null,
            history: [earningApplication],
            isLoading: false,
        });
    });

    it('keeps the create action loading until campaign applications have arrived', () => {
        expect(getCreatorCampaignSubmissionState(undefined).isLoading).toBe(true);
    });
});
