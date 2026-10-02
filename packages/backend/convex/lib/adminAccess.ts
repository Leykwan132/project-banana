import type { UserIdentity } from 'convex/server';

export async function assertAdmin(ctx: { auth: { getUserIdentity: () => Promise<UserIdentity | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Unauthenticated');
  let adminEmails: string[] = [];
  try { adminEmails = JSON.parse(process.env.ADMIN_USER_IDS || '[]'); } catch { /* Fail closed. */ }
  if (!Array.isArray(adminEmails) || !identity.email || !adminEmails.includes(identity.email)) {
    throw new Error('Unauthorized: not an admin');
  }
  return identity;
}

/** Invitation management must not trust an unverified email/password identity. */
export async function assertInvitationAdmin(ctx: Parameters<typeof assertAdmin>[0]) {
  const identity = await assertAdmin(ctx);
  if (identity.emailVerified !== true) throw new Error('A verified admin email is required');
  return identity;
}
