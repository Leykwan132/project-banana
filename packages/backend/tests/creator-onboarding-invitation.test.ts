import { expect, test } from 'bun:test';
import { completeOnboarding } from '../convex/creators';
import { authComponent } from '../convex/auth';
import { prepare } from '../convex/creatorInvitations';
import { hashToken } from '../convex/lib/invitationAuth';
import { memoryContext } from './creator-invitations.test';
const call = (fn: any, ctx: any, args: any) => fn._handler(ctx, args);
const fields = { username: 'newcreator', signupGoal: ['side_income'], referralSource: 'friends' };
const user = { subject: 'creator-user', email: 'test@example.com', name: 'Test' };
async function recipient() {
  const ctx = memoryContext(); const id = await call(prepare, ctx, { email: user.email, secretHash: await hashToken('secret'), generation: 'g' });
  ctx.records.get(id).magic_token_hash = 'magic-hash'; ctx.records.get(id).delivery_status = 'queued';
  ctx.auth.getUserIdentity = async () => user;
  ctx.scheduler = { runAfter: async () => null };
  ctx.runMutation = async () => null;
  ctx.runQuery = async () => null;
  return { ctx, id };
}
test('new creator direct onboarding requires an invitation', async () => {
  const { ctx } = await recipient();
  await expect(call(completeOnboarding, ctx, fields)).rejects.toThrow('invitation');
  expect([...ctx.records.values()].filter((r: any) => r.table === 'creators')).toHaveLength(0);
});
test('existing active creator does not require invitation; deleted profile cannot be restored', async () => {
  const { ctx } = await recipient(); const id = await ctx.db.insert('creators', { user_id: user.subject, is_deleted: false });
  expect(await call(completeOnboarding, ctx, fields)).toBe(id);
  ctx.records.get(id).is_deleted = true;
  await expect(call(completeOnboarding, ctx, fields)).rejects.toThrow('deleted');
});
test('unverified and wrong email accounts cannot accept; verified recipient consumes once', async () => {
  const original = authComponent.getAuthUser;
  try {
    const { ctx, id } = await recipient();
    authComponent.getAuthUser = async () => ({ email: user.email, emailVerified: false });
    await expect(call(completeOnboarding, ctx, { ...fields, invitationToken: 'secret' })).rejects.toThrow('Verify');
    authComponent.getAuthUser = async () => ({ email: 'wrong@example.com', emailVerified: true });
    await expect(call(completeOnboarding, ctx, { ...fields, invitationToken: 'secret' })).rejects.toThrow('another email');
    authComponent.getAuthUser = async () => ({ email: user.email, emailVerified: true });
    const creatorId = await call(completeOnboarding, ctx, { ...fields, invitationToken: 'secret' });
    expect(ctx.records.get(id).status).toBe('accepted');
    expect(ctx.records.get(id).accepted_by).toBe(user.subject);
    expect(await call(completeOnboarding, ctx, fields)).toBe(creatorId);
    expect([...ctx.records.values()].filter((r: any) => r.table === 'creators')).toHaveLength(1);
  } finally { authComponent.getAuthUser = original; }
});
test('failed username and expired/revoked invitations never consume authorization', async () => {
  const original = authComponent.getAuthUser;
  try {
    authComponent.getAuthUser = async () => ({ email: user.email, emailVerified: true });
    const { ctx, id } = await recipient();
    await ctx.db.insert('creators', { user_id: 'other', username: fields.username });
    await expect(call(completeOnboarding, ctx, { ...fields, invitationToken: 'secret' })).rejects.toThrow();
    expect(ctx.records.get(id).status).toBe('pending');
    ctx.records.get(id).expires_at = Date.now() - 1;
    await expect(call(completeOnboarding, ctx, { ...fields, invitationToken: 'secret' })).rejects.toThrow('expired');
    ctx.records.get(id).expires_at = Date.now() + 10000; ctx.records.get(id).status = 'revoked';
    await expect(call(completeOnboarding, ctx, { ...fields, invitationToken: 'secret' })).rejects.toThrow('revoked');
  } finally { authComponent.getAuthUser = original; }
});
