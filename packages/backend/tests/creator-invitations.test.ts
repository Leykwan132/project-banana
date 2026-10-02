import { expect, test } from 'bun:test';
import { prepare, revoke, list, markQueued, validateMagicLink } from '../convex/creatorInvitations';
import { hashToken, invitationCallback } from '../convex/lib/invitationAuth';

const call = (fn: any, ctx: any, args: any = {}) => fn._handler(ctx, args);
export function memoryContext(identity: any = { subject: 'admin-1', email: 'admin@example.com', emailVerified: true }) {
  const records = new Map<string, any>();
  let next = 0;
  const ctx: any = {
    records,
    auth: { getUserIdentity: async () => identity },
    db: {
      get: async (id: string) => records.get(id) ?? null,
      insert: async (table: string, fields: any) => { const id = `${table}-${++next}`; records.set(id, { _id: id, _creationTime: Date.now(), table, ...fields }); return id; },
      patch: async (id: string, fields: any) => { const row = records.get(id); Object.assign(row, fields); },
      query: (table: string) => {
        let rows = () => [...records.values()].filter(r => r.table === table);
        const query: any = {
          withIndex: (_: string, selector: any) => { const conditions: any[] = []; const q: any = { eq: (field: string, value: any) => { conditions.push([field, value]); return q; } }; selector(q); const before = rows; rows = () => before().filter(r => conditions.every(([f, v]) => r[f] === v)); return query; },
          unique: async () => { const result = rows(); if (result.length > 1) throw Error('not unique'); return result[0] ?? null; },
          order: () => query,
          paginate: async () => ({ page: rows(), isDone: true, continueCursor: '' }),
        };
        return query;
      },
    },
  };
  return ctx;
}
process.env.ADMIN_USER_IDS = '["admin@example.com"]';
const input = async (email = ' Test@Example.com ') => ({ email, secretHash: await hashToken('secret'), generation: 'generation-1' });

test('only admins may list, prepare, and revoke invitations', async () => {
  for (const identity of [null, { subject: 'outsider', email: 'outsider@example.com' }]) {
    const ctx = memoryContext(identity);
    await expect(call(list, ctx, { paginationOpts: { numItems: 20, cursor: null } })).rejects.toThrow();
    await expect(call(prepare, ctx, await input())).rejects.toThrow();
    await expect(call(revoke, ctx, { invitationId: 'invite-1' })).rejects.toThrow();
  }
});
test('normalize email and replace a pending invitation on resend', async () => {
  const ctx = memoryContext();
  const id = await call(prepare, ctx, await input());
  expect(ctx.records.get(id).email).toBe('test@example.com');
  await call(prepare, ctx, { ...await input('test@example.com'), invitationId: id, generation: 'generation-2', secretHash: await hashToken('new-secret') });
  expect(ctx.records.size).toBe(1);
  expect(ctx.records.get(id).generation).toBe('generation-2');
});
test('duplicate initial send and accepted resend are rejected', async () => {
  const ctx = memoryContext(); const id = await call(prepare, ctx, await input());
  await expect(call(prepare, ctx, await input())).rejects.toThrow('already');
  ctx.records.get(id).status = 'accepted';
  await expect(call(prepare, ctx, { ...await input(), invitationId: id })).rejects.toThrow('accepted');
});
test('late queue result cannot restore a revoked or resent invitation', async () => {
  const ctx = memoryContext(); const id = await call(prepare, ctx, await input());
  await call(revoke, ctx, { invitationId: id });
  await call(markQueued, ctx, { invitationId: id, generation: 'generation-1', emailId: 'email-1' });
  expect(ctx.records.get(id).status).toBe('revoked');
  expect(ctx.records.get(id).email_id).toBeUndefined();
});
test('verification binds both tokens and rejects revoked, expired, and replaced links', async () => {
  const ctx = memoryContext(); const secretHash = await hashToken('secret'); const magicTokenHash = await hashToken('magic');
  const id = await call(prepare, ctx, await input());
  ctx.records.get(id).magic_token_hash = magicTokenHash;
  expect(await call(validateMagicLink, ctx, { magicTokenHash, secretHash })).toBe(true);
  expect(await call(validateMagicLink, ctx, { magicTokenHash, secretHash: await hashToken('wrong') })).toBe(false);
  ctx.records.get(id).expires_at = Date.now() - 1;
  expect(await call(validateMagicLink, ctx, { magicTokenHash, secretHash })).toBe(false);
  ctx.records.get(id).expires_at = Date.now() + 100000;
  ctx.records.get(id).status = 'revoked';
  expect(await call(validateMagicLink, ctx, { magicTokenHash, secretHash })).toBe(false);
  ctx.records.get(id).status = 'pending'; ctx.records.get(id).secret_hash = await hashToken('new');
  expect(await call(validateMagicLink, ctx, { magicTokenHash, secretHash })).toBe(false);
});
test('callback URL is fixed to web invitation route', () => {
  expect(invitationCallback('https://web.example.com', 'secret')).toBe('https://web.example.com/creator/invitation?token=secret');
});

test('callback validation rejects replaced routes and attacker origins', async () => {
  const { callbackSecret } = await import('../convex/lib/invitationAuth');
  expect(callbackSecret('https://web.example.com', 'https://evil.example.com/creator/invitation?token=secret')).toBeNull();
  expect(callbackSecret('https://web.example.com', 'https://web.example.com/overview?token=secret')).toBeNull();
  expect(callbackSecret('https://web.example.com', 'https://web.example.com/creator/invitation?token=secret&extra=1')).toBeNull();
  expect(callbackSecret('https://web.example.com', 'https://web.example.com/creator/invitation?token=secret')).toBe('secret');
});

test('an unverified email/password account cannot impersonate an allowlisted admin', async () => {
  const ctx = memoryContext({ subject: 'unverified-admin', email: 'admin@example.com', emailVerified: false });
  await expect(call(prepare, ctx, await input())).rejects.toThrow('verified');
});
