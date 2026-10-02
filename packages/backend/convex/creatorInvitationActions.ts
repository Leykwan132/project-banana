import { action } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { createAuth } from './auth';
import { assertInvitationAdmin } from './lib/adminAccess';
import { hashToken, invitationCallback, newSecret } from './lib/invitationAuth';

export const send = action({
  args: { email: v.string(), name: v.optional(v.string()), invitationId: v.optional(v.id('creator_invitations')) },
  returns: v.id('creator_invitations'),
  handler: async (ctx, args): Promise<Id<'creator_invitations'>> => {
    await assertInvitationAdmin(ctx);
    const siteUrl = process.env.SITE_URL;
    if (!siteUrl || !process.env.RESEND_FROM_EMAIL || !process.env.RESEND_API_KEY) throw new Error('Configure SITE_URL, RESEND_FROM_EMAIL, and RESEND_API_KEY in this Convex deployment first.');
    const email = args.email.trim().toLowerCase();
    const secret = newSecret(); const generation = newSecret();
    const invitationId: Id<'creator_invitations'> = await ctx.runMutation(internal.creatorInvitations.prepare, { ...args, email, secretHash: await hashToken(secret), generation });
    const callbackURL = invitationCallback(siteUrl, secret);
    try {
      const auth = createAuth(ctx, { invitationId, generation, email });
      await auth.api.signInMagicLink({
        body: { email, name: args.name?.trim(), callbackURL, newUserCallbackURL: callbackURL, errorCallbackURL: callbackURL },
        headers: new Headers({ origin: new URL(siteUrl).origin }),
      });
    } catch {
      await ctx.runMutation(internal.creatorInvitations.markDeliveryFailed, { invitationId, generation });
      throw new Error('Invitation email could not be queued. Check email configuration and use Resend.');
    }
    return invitationId;
  },
});
