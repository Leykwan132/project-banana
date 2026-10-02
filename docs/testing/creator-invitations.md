# Testing creator invitations

Use a separate Convex **development deployment** and a local web server. Do not run these commands with `--prod`. Backend secrets belong in Convex environment variables; only the public backend URLs belong in the web environment file.

## Start the test environment

From the repository root, start the backend:

```sh
cd packages/backend
bunx convex dev
```

This uses the development deployment selected in `packages/backend/.env.local`. For a backend running on your computer instead, select a local deployment with `bunx convex deployment select local`, then run `bunx convex dev`. Local and cloud deployments have separate data and environment variables.

In another terminal, from `packages/backend`, configure that development deployment:

```sh
bunx convex env set SITE_URL http://localhost:5173
bunx convex env set ADMIN_USER_IDS '["your-admin-email@example.com"]'
bunx convex env set RESEND_FROM_EMAIL 'Lumina <invites@your-verified-domain.com>'
bunx convex env set RESEND_API_KEY 'your-development-resend-api-key'
```

`ADMIN_USER_IDS` is the existing admin **email** allowlist despite its name. Use your actual admin Google account. Configure that Google provider's OAuth redirect for the development Convex HTTP site URL if it is not configured already. Keep existing `BETTER_AUTH_SECRET` and Google provider settings on this dev deployment.

Set these in `apps/web/.env.local`, using the URLs printed by your selected backend:

```dotenv
VITE_CONVEX_URL=https://your-dev-deployment.convex.cloud
VITE_CONVEX_SITE_URL=https://your-dev-deployment.convex.site
VITE_ADMIN_CODE=your-local-admin-unlock-code
```

For a local backend, use its printed local URLs instead. Keep any existing web settings in the file. Restart the web server after changing these values:

```sh
cd apps/web
bun --bun run dev --port 5173
```

Use the same host and port as `SITE_URL`; if you switch to a different port or `127.0.0.1`, update `SITE_URL` to match.

## Email delivery webhook

In the Resend dashboard, add a webhook endpoint at your **development Convex HTTP site** URL followed by `/webhooks/resend`. Subscribe to email sent, delivered, delivery delayed, bounced, complained, and failed events. Copy that endpoint's signing secret into the same Convex dev deployment:

```sh
bunx convex env set RESEND_WEBHOOK_SECRET 'your-development-webhook-signing-secret'
```

The endpoint verifies signatures before updating email status. A cloud development deployment is easiest for real provider callbacks. For a local backend, Resend needs a publicly reachable tunnel to the local HTTP actions port; configure the webhook to that tunnel's `/webhooks/resend` URL. Without a reachable webhook, successful sends can remain Sent and later bounces/delivery confirmations will not appear.

## Full acceptance test with your own inbox

To click a real email link, allow invitation emails to an inbox you control:

```sh
# Run from packages/backend against the development deployment only.
bunx convex env set INVITATION_EMAIL_TEST_MODE false
```

The sender must be allowed by your Resend account. A verified sender domain is the dependable option. This flag applies only to invitation email; it does not change existing welcome or transactional email behavior.

1. Open `http://localhost:5173/admin/invitations`, sign in as an allowlisted admin, and unlock the portal using the local admin code.
2. Send an invitation to a separate email account you control. The new history row starts as Sending/Queued; Sent means Resend accepted it, not that the recipient opened it. Delivery failures/bounces are shown when the provider status is available.
3. Open the received magic link in a separate browser profile or private window. The link verifies the invited email and creates or signs into the same Better Auth account system used by businesses.
4. Pick a username, select goals and a referral source, and create the creator profile. You should reach `/creator/campaigns`, and admin history should show Accepted.
5. Sign out and log in again using the invited Google account. Existing creator data should still be accessible. For an existing business account, confirm that both workspaces use the same identity and the business data remains intact.

Do not use your admin account as the recipient unless you intend to add a creator profile to it. Opening a magic link signs the browser into the invited account.

## Email-provider simulation

For delivery checks without emailing a real recipient:

```sh
bunx convex env set INVITATION_EMAIL_TEST_MODE true
```

Invite a unique labeled test address such as `delivered+creator-invite-1@resend.dev`, or `bounced+creator-invite-1@resend.dev`. See [Resend's test addresses](https://resend.dev/). These addresses simulate provider events; they are not inboxes you own and do not replace the full acceptance test above. Use Resend/component email status to inspect results. Delivery webhooks must be configured for statuses that depend on provider events; queued sending failures are recorded by the component without a webhook.

## Negative cases

- **Resend:** Send to a fresh test inbox, retain the first email, then use Resend in admin. The first link must show an invalid invitation; only the new email link may authorize setup.
- **Revoke:** Revoke a pending invitation before opening it. Its email link must not create a creator account.
- **Expiry:** On a fresh dev invitation, use the Convex dev dashboard to set `creator_invitations.expires_at` to a timestamp in the past, then open the link. Resend produces a fresh 24-hour link. Change dev test records only.
- **Wrong account:** After opening an invitation, sign out and sign into another email account, then revisit the invitation page. It must reject the mismatched account.
- **Direct API bypass:** The automated suite verifies that calling existing `creators.completeOnboarding` without an invitation cannot create a new creator. Unverified email/password accounts are also rejected.
- **Single use:** Accept an invitation, then reopen it. It must not create another profile. Existing active creator login remains available.
- **Duplicate username:** Try a taken username before accepting. No profile or consumed invitation should be created; another username must still work.
- **Permissions:** Nonadmin accounts cannot list, send, resend, or revoke invitations, even when calling the backend directly.
- **Email configuration:** In dev only, use an invalid email API key and send a fresh invitation. Watch the failed email state and restore the correct key before using Resend.

## Automated checks

From the repository root:

```sh
bun test
bun apps/web/node_modules/typescript/bin/tsc --noEmit -p packages/backend/convex/tsconfig.json
bun apps/web/node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.app.json --noUnusedLocals false --noUnusedParameters false
bun --bun run --cwd apps/web build
```

The app's existing strict unused-variable diagnostics are separate from invitation type checking. Run backend and web together: deploying only the sidebar will leave missing backend functions.
