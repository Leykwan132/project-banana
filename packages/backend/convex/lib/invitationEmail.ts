import { Resend } from '@convex-dev/resend';
import { components } from '../_generated/api';
// Only invitation emails use this flag; other transactional email behavior stays unchanged.
export const invitationEmail = new Resend(components.resend, {
  testMode: process.env.INVITATION_EMAIL_TEST_MODE === 'true',
});
