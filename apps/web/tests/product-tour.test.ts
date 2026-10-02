import { describe, expect, it } from 'bun:test';
import { PRODUCT_TOUR_ACTIVE_KEY, PRODUCT_TOUR_COMPLETED_KEY, clearStaleProductTourActive } from '../src/lib/productTour';

describe('clearStaleProductTourActive', () => {
    it('clears only the persisted active flag when a fresh app load starts', () => {
        const values = new Map([
            [PRODUCT_TOUR_ACTIVE_KEY, 'true'],
            [PRODUCT_TOUR_COMPLETED_KEY, 'true'],
        ]);
        const storage = { removeItem: (key: string) => values.delete(key) };

        clearStaleProductTourActive(storage);

        expect(values.has(PRODUCT_TOUR_ACTIVE_KEY)).toBe(false);
        expect(values.get(PRODUCT_TOUR_COMPLETED_KEY)).toBe('true');
    });
});
