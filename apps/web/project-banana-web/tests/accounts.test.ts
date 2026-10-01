import { expect, test } from 'bun:test';
import { getMyWorkspaces } from '../../../../packages/backend/convex/users';

// Invoke the real registered query with only the Convex database boundary stubbed.
const handler = (getMyWorkspaces as unknown as { _handler: (ctx: unknown, args: {}) => Promise<unknown> })._handler;
function context(identity: { subject: string } | null, deleted = false, hasBusiness = true, hasCreator = true) {
  return {
    auth: { getUserIdentity: async () => identity },
    db: { query: (table: string) => ({ withIndex: (name: string, select: (q: unknown) => unknown) => {
      if (name !== 'by_user') throw new Error('Wrong ownership index');
      select({ eq: (field: string, value: string) => {
        if (field !== 'user_id' || value !== identity?.subject) throw new Error('Wrong account ownership');
      } });
      return { unique: async () => table === 'businesses'
        ? (hasBusiness ? { _id: 'business-1' } : null)
        : (hasCreator ? { _id: 'creator-1', is_deleted: deleted } : null) };
    } }) },
  };
}
test('signed-out accounts have no membership', async () => {
  expect(await handler(context(null), {})).toBeNull();
});
test('membership uses authenticated identity for both existing records', async () => {
  expect(await handler(context({ subject: 'account-1' }), {})).toEqual({ businessId: 'business-1', creatorId: 'creator-1' });
});
test('deleted creator records cannot grant creator access', async () => {
  expect(await handler(context({ subject: 'account-1' }, true), {})).toEqual({ businessId: 'business-1', creatorId: null });
});
test('absent profiles do not create or infer membership', async () => {
  expect(await handler(context({ subject: 'account-1' }, false, false, false), {})).toEqual({ businessId: null, creatorId: null });
});
