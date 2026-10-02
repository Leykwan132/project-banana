# Creator Invitations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Let admins invite creators from the existing admin portal and let recipients create their shared account and creator profile through an email magic link.

**Architecture:** Add `/admin/invitations` to the current admin sidebar. Keep Better Auth for identity and the existing Resend component for email; store invitation authorization in Convex and enforce it transactionally in the existing `creators.completeOnboarding` mutation. Existing active creators continue to access their records without invitations.

**Tech Stack:** React, React Router, Convex, Better Auth 1.4.9 backend magic-link plugin, existing Resend component, TypeScript, Bun.

**Spec:** `docs/superpowers/specs/2026-10-02-shared-web-login-design.md`, invitation dependency and account continuity sections.

## Global Constraints

- Web is the primary product; mobile development is on hold.
- Existing creator records grant access without a new invitation.
- Businesses and creators share the existing Better Auth account system and Convex database.
- Creator behavior must reuse existing backend methods.
- Invitation validation must occur in the backend creator onboarding path, including direct API calls.
- Resending invalidates the previous invitation link.
- Preserve unrelated local changes already present in this checkout.
- This unit completes invitations, not the remaining creator campaign/submission/withdrawal migration.

## Review Focus

- An unverified email/password identity must not claim a creator invitation just by matching its email.
- An old link must stop working after resend or revoke, even before the Better Auth token expires.
- Concurrent acceptance must create at most one creator and consume the invitation in the same transaction.
- Failed email delivery must be visible and retryable; admin must not see a false success.
- A recipient already signed into another account must see a clear account mismatch and a sign-out path.

## Product behavior

- Sidebar item **Invitations**, alongside Bank Approvals, Submissions, and Payouts.
- Page title **Creator invitations**; email field, optional name, **Send invitation** button, and paginated history with email, status, expiry, and resend/revoke actions.
- Invitations and magic links expire after 24 hours. Resend rotates the link and starts another 24 hours. Display this in admin and in the email.
- Statuses visible to admin: Pending, Accepted, Expired, Revoked, and Delivery failed. Expiry is derived from the server timestamp, rather than requiring a cron.
- Recipients open a magic link, receive the shared authenticated session, then complete the existing creator onboarding fields on web.
- Reuse mobile username, goal, and referral values. No new campaign, submission, bank, or financial methods.

### Task 1: Invitation records and admin lifecycle

**Files:** Modify `packages/backend/convex/schema.ts`; create `packages/backend/convex/creatorInvitations.ts`, `packages/backend/convex/lib/adminAccess.ts`, and `packages/backend/tests/creator-invitations.test.ts`; modify `packages/backend/convex/admin.ts` only to reuse its current allowlist helper. Preserve that file's unrelated local changes.

**Interfaces:** Public `creatorInvitations.list({ paginationOpts })` returns a Convex page containing safe admin fields, never tokens or token hashes. Public `send({ email: string, name?: string, invitationId?: Id<'creator_invitations'> })` is an admin-only action; supplying an ID resends that record. Public `revoke({ invitationId })` is an admin-only mutation. Internal `prepare`, `markSent`, and `markDeliveryFailed` mutations manage sending generations. Shared `assertAdmin(ctx)` retains the existing `ADMIN_USER_IDS` email allowlist behavior.

- [x] Write tests for unauthenticated/nonadmin list/send/revoke rejection, normalized email, duplicate pending invitation handling, accepted-invitation resend rejection, resend rotation, and late delivery completion from an older generation.
- [x] Run `bun test packages/backend/tests/creator-invitations.test.ts`; confirm the missing implementation fails.
- [x] Add `creator_invitations` with normalized email, optional name, admin creator ID, status, delivery status, expiry, generation, hashed invitation secret, optional hashed magic-link token, and optional consumed user/creator IDs. Index by email and by magic-link token hash. Validate all registered function arguments and returns.
- [x] Implement the lifecycle with indexed reads, paginated history, and a generation check on delivery updates. Generate secrets in actions using cryptographic randomness; persist hashes only. A resend replaces the previous hashes before sending. Failed sends remain explicitly retryable.
- [x] Run the tests; confirm unauthorized operations and stale generation updates cannot mutate invitations.
- [x] Commit only this task's changes, excluding existing user edits in admin and generated files.

### Task 2: Email magic links using shared authentication

**Files:** Modify `packages/backend/convex/auth.ts` and `packages/backend/convex/emails.ts`; create `packages/backend/convex/lib/invitationAuth.ts`; extend invitation tests.

**Interfaces:** `send` from Task 1 calls `createAuth(ctx).api.signInMagicLink` with the canonical `SITE_URL` callback `/creator/invitation?token=<secret>`. The plugin sends through internal `emails.sendCreatorInvitation({ email, url })`. Internal `creatorInvitations.validateMagicLink({ tokenHash, invitationSecretHash })` returns a pending, unexpired invitation or rejects. Better Auth remains responsible for verifying the email and issuing the shared session.

- [x] Write tests for arbitrary nonadmin magic-link issuance, unknown email, expiry, revocation, old generation after resend, modified callback origin/path, and mismatched authentication token versus invitation secret.
- [x] Run the invitation tests and confirm failures for the missing gates.
- [x] Add the installed plugin from `better-auth/plugins/magic-link`, with hashed auth-token storage and 24-hour expiry. Gate issuance with the existing admin identity and current invitation generation. Record the auth-token hash before sending email. Gate verification before Better Auth account/session creation using both hashes and the canonical callback; reject substituted callback/new-user callback URLs.
- [x] Send a plain-text and HTML invitation using the existing Resend component and `RESEND_FROM_EMAIL`. Reject missing configuration or send failure and persist delivery failure. Do not log tokens, URLs, or secrets.
- [x] Run the tests and backend TypeScript check. Confirm no new identity store or email provider was introduced.
- [x] Commit this task's authentication and email changes.

### Task 3: Invitation-authorized creator onboarding

**Files:** Modify `packages/backend/convex/creators.ts`; extend `creatorInvitations.ts`; create `apps/web/src/pages/creator/CreatorInvitation.tsx` and `apps/web/tests/creator-invitation.test.ts`; modify `apps/web/src/main.tsx`.

**Interfaces:** Add optional `invitationToken: string` to existing `creators.completeOnboarding({ username, signupGoal, referralSource })`. Keep its creator ID return and existing creation behavior. Public `creatorInvitations.getMyInvitation({ token })` returns safe invitation status for the authenticated recipient only. `/creator/invitation` lives outside the creator membership layout so recipients without profiles can complete onboarding.

- [x] Write tests for direct onboarding without an invitation, unverified email, wrong email, expired/revoked/consumed secrets, existing active creators without invitations, deleted creator records, duplicate username, and concurrent/repeated acceptance.
- [x] Run the tests; confirm direct onboarding bypass is reproduced before changing the mutation.
- [x] In the existing mutation, preserve the active creator early return. Otherwise require a current invitation and verified email from the server's Better Auth user record; derive ownership from authentication. Reject deleted profiles rather than silently restoring or reassigning them. Create the creator and consume the invitation atomically, retaining existing welcome-email and analytics scheduling.
- [x] Implement the invitation page with session verification/loading, account mismatch and sign-out, invalid/expired/revoked messaging, and onboarding. Reuse username availability and `completeOnboarding`; reuse mobile goal IDs `side_income`, `full_time_creator`, `brand`, `monetize_audience`, `try_ugc`, and referral IDs `instagram`, `tiktok`, `threads`, `linkedin`, `friends`. Successful completion goes to `/creator/campaigns`.
- [x] Run the tests and explicitly type-check the web app. Verify a failed username attempt leaves the invitation usable.
- [x] Commit this task's onboarding integration.

### Task 4: Admin portal page and end-to-end verification

**Files:** Create `apps/web/src/pages/admin/AdminInvitations.tsx`; modify `apps/web/src/components/AdminLayout.tsx`, `apps/web/src/main.tsx`, and `apps/web/README.md`; update generated API declarations without overwriting existing local additions.

**Interfaces:** `/admin/invitations` uses Task 1's list/send/revoke functions under the existing admin layout. UI treats in-progress sends separately from delivered invitations and disables duplicate actions while they run.

- [x] Implement the sidebar item, form, paginated history, status/expiry display, resend/revoke actions, and inline delivery errors using the portal's existing styling. Never show or copy invitation bearer URLs in admin history.
- [x] Verify browser navigation from Payouts to Invitations, required email validation, loading/empty/error states, resend/revoke results, and refresh persistence.
- [x] Run `bun test`, backend TypeScript, explicit app TypeScript, and `bun --bun run --cwd apps/web build`. Report pre-existing diagnostics separately.
- [x] Verify the compiled backend in an isolated local Convex deployment without publishing unrelated local backend changes. Exercise real shared-session magic-link acceptance, existing business account acceptance, active creator continuity, expired/revoked/resend rejection, and direct mutation denial. Use a controlled test inbox; do not send invitations to real creators as a side effect of development.
- [x] Document required `SITE_URL`, `RESEND_FROM_EMAIL`, existing Resend credentials, and allowlist configuration. Note that frontend and backend must ship together.
- [x] Perform the native workflow's independent review, fix findings, and rerun affected checks. Update PR #2 description to include the final invitation scope, commit only owned changes, and push the existing branch. Do not merge or deploy production as a side effect.

## Self-review

The four tasks cover the approved invitation dependency: admin placement, email binding, expiry, resend, revoke, shared-session authentication, single-use authorization, and direct onboarding enforcement. Each Review Focus condition has a test in its owning task. Existing creator records and business registration remain unaffected; no account ownership is inferred from a client-provided email.

## Current investigation

Confirmed that `AdminLayout.tsx` lists only three existing admin sections; `main.tsx` registers no invitation route; schema contains no invitation table; Better Auth has no magic-link plugin; and `creators.completeOnboarding` currently accepts any authenticated new user. The screenshot matches the code: this is missing implementation, not a stale sidebar or hidden permission setting.

Implemented on `codex/shared-web-login` for PR #2. All 34 repository tests pass. Backend Convex TypeScript and the explicit web app TypeScript check pass; existing unused-variable diagnostics are excluded from the latter check. Production build passes with the existing large-bundle warning.

An isolated local Convex deployment compiled and pushed the schema and all functions. With email transport captured only in that isolated checkout, real HTTP magic-link verification established the cross-domain shared session, authenticated direct onboarding without an invitation was denied, concurrent acceptance returned one creator, and accepted/resend/revoked/expired links and arbitrary public issuance were rejected. No real emails or production deployments were performed.

Browser checks verified the recipient onboarding form, admin unlock, Invitations sidebar and history, sending a captured test email, and revocation with reactive status updates. The development guide is `docs/testing/creator-invitations.md`; real Resend delivery and Google account continuity remain controlled manual checks.

Independent review found a missing delivery webhook; signed and unsigned event regression tests failed before its registration and passed after the fix. Two minor UI issues remain: expiry labels do not refresh on time alone in an idle open page, and a saved accepted callback prioritizes the accepted-invitation message over existing workspace guidance. Backend authorization and normal creator login remain correct.

Execution decisions: sending action lives in its own module to avoid circular imports; queued emails are labeled queued until provider status changes; local integration captures email transport; backend/frontend changes commit as coherent units; invitation admin operations require verified email plus the existing allowlist, so sessions missing verification must sign in again.
