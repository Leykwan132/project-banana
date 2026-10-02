import { expect, test } from 'bun:test';
import { getActiveCampaigns } from '../convex/campaigns';

const handler = (getActiveCampaigns as unknown as {
    _handler: (ctx: unknown, args: { paginationOpts: unknown }) => Promise<{ page: Array<Record<string, unknown>> }>;
})._handler;

test('active campaign browse results include total and claimed budget', async () => {
    const campaign = {
        _id: 'campaign-1',
        business_id: 'business-1',
        name: 'Campaign',
        payout_thresholds: [],
        base_pay: 20,
        maximum_payout: 150,
        total_budget: 1200,
        budget_claimed: 345,
        submissions: 3,
        category: ['Product Review'],
        created_at: 1,
    };
    const ctx = {
        db: {
            query: () => ({
                withIndex: () => ({
                    order: () => ({
                        paginate: async () => ({ page: [campaign], isDone: true, continueCursor: '' }),
                    }),
                }),
            }),
            get: async () => ({ name: 'Brand' }),
        },
    };

    const result = await handler(ctx, { paginationOpts: {} });

    expect(result.page[0]).toMatchObject({ total_budget: 1200, budget_claimed: 345 });
});
