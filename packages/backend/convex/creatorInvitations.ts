import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { assertInvitationAdmin } from './lib/adminAccess';
import { hashToken, INVITATION_TTL_MS } from './lib/invitationAuth';
import { invitationEmail } from './lib/invitationEmail';
import type { EmailId } from '@convex-dev/resend';
import { authComponent } from './auth';

const statusValidator = v.union(v.literal('pending'), v.literal('accepted'), v.literal('expired'), v.literal('revoked'));
const itemValidator = v.object({
  _id: v.id('creator_invitations'), email: v.string(), name: v.optional(v.string()),
  status: statusValidator, deliveryStatus: v.string(), expiresAt: v.number(), createdAt: v.number(),
});
export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(itemValidator), isDone: v.boolean(), continueCursor: v.string(), splitCursor: v.optional(v.union(v.string(), v.null())), pageStatus: v.optional(v.union(v.literal('SplitRecommended'), v.literal('SplitRequired'), v.null())) }),
  handler: async (ctx, args) => {
    await assertInvitationAdmin(ctx);
    const result = await ctx.db.query('creator_invitations').order('desc').paginate(args.paginationOpts);
    const page = await Promise.all(result.page.map(async row => {
      const email = row.email_id ? await invitationEmail.status(ctx, row.email_id as EmailId) : null;
      return { _id: row._id, email: row.email, name: row.name,
        status: row.status === 'pending' && row.expires_at <= Date.now() ? 'expired' as const : row.status,
        deliveryStatus: email?.status ?? row.delivery_status, expiresAt: row.expires_at, createdAt: row._creationTime };
    }));
    return { ...result, page };
  },
});
export const prepare = internalMutation({
  args: { email: v.string(), name: v.optional(v.string()), invitationId: v.optional(v.id('creator_invitations')), secretHash: v.string(), generation: v.string() },
  returns: v.id('creator_invitations'),
  handler: async (ctx, args) => {
    const admin = await assertInvitationAdmin(ctx);
    const email = args.email.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address');
    const existing = await ctx.db.query('creator_invitations').withIndex('by_email', q => q.eq('email', email)).unique();
    if (args.invitationId && (!existing || existing._id !== args.invitationId)) throw new Error('Invitation not found');
    if (existing?.status === 'accepted') throw new Error('This invitation has already been accepted');
    if (existing && !args.invitationId) throw new Error('An invitation already exists for this email. Use Resend.');
    const fields = { email, name: args.name?.trim() || undefined, invited_by: admin.subject,
      status: 'pending' as const, delivery_status: 'sending' as const, expires_at: Date.now() + INVITATION_TTL_MS,
      generation: args.generation, secret_hash: args.secretHash, magic_token_hash: undefined,
      email_id: undefined, updated_at: Date.now() };
    if (existing) { await ctx.db.patch(existing._id, fields); return existing._id; }
    return await ctx.db.insert('creator_invitations', fields);
  },
});
export const bindMagicToken = internalMutation({
  args: { invitationId: v.id('creator_invitations'), generation: v.string(), magicTokenHash: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.invitationId);
    if (!row || row.status !== 'pending' || row.generation !== args.generation || row.expires_at <= Date.now()) throw new Error('Invitation is no longer valid');
    await ctx.db.patch(row._id, { magic_token_hash: args.magicTokenHash });
    return null;
  },
});
export const markQueued = internalMutation({
  args: { invitationId: v.id('creator_invitations'), generation: v.string(), emailId: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.invitationId);
    if (row?.status === 'pending' && row.generation === args.generation) await ctx.db.patch(row._id, { delivery_status: 'queued', email_id: args.emailId, updated_at: Date.now() });
    return null;
  },
});
export const markDeliveryFailed = internalMutation({
  args: { invitationId: v.id('creator_invitations'), generation: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.invitationId);
    if (row?.status === 'pending' && row.generation === args.generation) await ctx.db.patch(row._id, { delivery_status: 'failed', magic_token_hash: undefined, updated_at: Date.now() });
    return null;
  },
});
export const revoke = mutation({
  args: { invitationId: v.id('creator_invitations') }, returns: v.null(),
  handler: async (ctx, args) => {
    await assertInvitationAdmin(ctx);
    const row = await ctx.db.get(args.invitationId);
    if (!row) throw new Error('Invitation not found');
    if (row.status === 'accepted') throw new Error('Accepted invitations cannot be revoked');
    await ctx.db.patch(row._id, { status: 'revoked', magic_token_hash: undefined, updated_at: Date.now() });
    return null;
  },
});
export const validateMagicLink = internalQuery({
  args: { magicTokenHash: v.string(), secretHash: v.string() }, returns: v.boolean(),
  handler: async (ctx, args) => {
    const row = await ctx.db.query('creator_invitations').withIndex('by_magic_token_hash', q => q.eq('magic_token_hash', args.magicTokenHash)).unique();
    return !!row && row.status === 'pending' && row.expires_at > Date.now() && row.secret_hash === args.secretHash && row.delivery_status !== 'failed';
  },
});

export async function requireInvitation(ctx: QueryCtx | MutationCtx, token: string | undefined) {
  if (!token) throw new Error('A creator invitation is required');
  const user = await authComponent.getAuthUser(ctx);
  if (!user?.emailVerified) throw new Error('Verify your invited email using the magic link');
  const secretHash = await hashToken(token);
  const row = await ctx.db.query('creator_invitations').withIndex('by_secret_hash', q => q.eq('secret_hash', secretHash)).unique();
  if (!row) throw new Error('This invitation link is invalid or has been replaced');
  if (row.status !== 'pending') throw new Error(`This invitation has been ${row.status}`);
  if (row.expires_at <= Date.now()) throw new Error('This invitation has expired. Ask the admin to resend it.');
  if (row.delivery_status === 'failed' || !row.magic_token_hash) throw new Error('This invitation is not ready. Ask the admin to resend it.');
  if (row.email !== user.email.trim().toLowerCase()) throw new Error('This invitation belongs to another email. Sign out and use the invited account.');
  return row;
}
export const getMyInvitation = query({
  args: { token: v.string() },
  returns: v.union(v.object({ valid: v.literal(true), email: v.string(), name: v.optional(v.string()) }), v.object({ valid: v.literal(false), message: v.string() })),
  handler: async (ctx, args) => {
    try { const row = await requireInvitation(ctx, args.token); return { valid: true as const, email: row.email, name: row.name }; }
    catch (e) { return { valid: false as const, message: e instanceof Error ? e.message : 'Unable to check invitation' }; }
  },
});
