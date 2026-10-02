# Shared Web Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ship separate business and creator login entry points using shared accounts, record-based workspace access, and a functioning creator campaign browser.

**Architecture:** Keep Better Auth and Google sign-in. A current-account query resolves business and active creator membership; shared routing logic preserves workspace intent through authentication. Existing business URLs remain, while creator pages use `/creator` routes.

**Tech Stack:** React, React Router, TypeScript, Convex, Better Auth, Bun tests, Vite.

**Spec:** `docs/superpowers/specs/2026-10-02-shared-web-login-design.md`

## Global Constraints

- Web is the primary product; mobile development is on hold.
- Existing creator records grant access without a new invitation.
- Businesses and creators share the existing Better Auth account system and Convex database.
- Existing business dashboard URLs remain unchanged.
- Creator behavior must reuse existing backend methods.
- Preserve unrelated local changes already present in this checkout.
- Login separation alone must not be reported as completing invitations or the full creator migration.

## Review Focus

- Existing signed-in visits must leave login without requiring another Google sign-in.
- Unknown workspace values must resolve to business intent, never arbitrary destinations.
- Deleted creator records must not grant creator access.
- Membership queries still loading must not trigger onboarding or wrong-workspace redirects.
- Authentication failures must retain the chosen workspace and allow retry.

## Delivery sequence

This PR implements Tasks 1–5 below. It makes existing creators usable on web through campaign browsing, but does not enable new creator onboarding. The separate invitation unit adds admin management, email links, invitation-authorized onboarding, and backend enforcement. The full creator migration then adds applications, uploads, post links, analytics, notifications, bank accounts, and withdrawals using existing methods. Those units remain required to complete the original broader request; they are not part of this login PR.

### Task 1: Current-account membership and routing policy

**Files:** Modify `packages/backend/convex/users.ts`, `apps/web/src/lib/workspace.ts`, and `apps/web/tests/workspace.test.ts`. Reuse the existing generated users module declaration; preserve the unrelated local API declaration change.

**Interfaces:** `users.getMyWorkspaces({})` returns null for signed-out callers or `{ businessId: Id<'businesses'> | null, creatorId: Id<'creators'> | null }` for the authenticated identity. `parseWorkspace(value: string | null): 'business' | 'creator'`. `resolveWorkspace(workspace, membership): '/overview' | '/onboarding' | '/creator/campaigns' | '/workspace-access?workspace=business' | '/workspace-access?workspace=creator'`.

- [x] Write Bun tests covering all six routing rows in the spec, legacy and invalid workspace values, and deleted creator membership. Test backend membership lookup with an authenticated-context stub to prove identity-derived lookup, nullable records, and deleted-creator exclusion.
- [x] Run `bun test apps/web/tests/workspace.test.ts`; verify meaningful failures before implementation.
- [x] Implement the query using existing `by_user` indexes and the routing policy with explicit workspace values. Do not use an email or accept a user ID argument.
- [x] Run the tests and verify all cases pass.
- [x] Commit only the query, generated module declaration change, policy, and tests.

### Task 2: Shared login and callback resolution

**Files:** Modify `src/pages/Login.tsx`, `src/pages/AuthRedirect.tsx`, and `src/main.tsx` under the web app. Create `src/hooks/useWorkspaces.ts` and `src/pages/WorkspaceAccess.tsx`.

**Interfaces:** `Login({ workspace: 'business' | 'creator' })` uses the existing auth client. `useWorkspaces()` exposes authenticated/loading/error/membership states without querying while signed out. Callback URLs are `/auth-redirect?workspace=business` and `/auth-redirect?workspace=creator`.

- [x] Add tests for callback construction, error routing, and loading-state decisions to `tests/workspace.test.ts`; verify failures.
- [x] Register `/business/login`, `/creator/login`, and `/workspace-access`; preserve `/login` as a business compatibility redirect including errors.
- [x] Implement role-specific copy and links, returned and thrown sign-in error handling, and immediate resolution of existing sessions. Disable sign-in while the session is loading.
- [x] Update AuthRedirect to wait for membership and preserve workspace on authentication errors. Render readable retry states for membership failures rather than redirect loops.
- [x] Implement wrong-workspace messaging. Creator-only business entry offers creator access and an explicit `/onboarding` action; creator entry without a record explains that an invitation is required and offers business access when available. Do not expose public creator onboarding.
- [x] Run policy tests and verify the signed-in, error, and wrong-workspace journeys in the browser.
- [x] Commit this task's files only.

### Task 3: Working creator login destination

**Files:** Create `src/components/CreatorLayout.tsx`, `src/pages/creator/CreatorCampaigns.tsx`, and `src/pages/creator/CreatorCampaignDetails.tsx`; modify web route registration.

**Interfaces:** `/creator/campaigns` uses `api.campaigns.getActiveCampaigns` with Convex pagination; `/creator/campaigns/:campaignId` uses `api.campaigns.getCampaign`. Image access uses `api.campaigns.generateCampaignImageAccessUrl` where R2 keys exist.

- [x] Add tests for creator route authorization through the shared policy; verify signed-out, missing-record, and deleted-record cases fail before wiring the guard.
- [x] Build a responsive creator layout with campaign navigation, account identity, sign-out, and a business switch only when both records exist.
- [x] Render active campaign cards with existing name, brand, category, base pay, and maximum payout data; handle initial loading, empty results, query failures, and load-more states.
- [x] Render campaign briefs through the existing detail query, including requirements and payout thresholds. Handle unavailable campaigns and image failures without breaking the page. Do not add new application or payout methods.
- [x] Run tests and verify campaign navigation and pagination with available development data. Record any unavailable authenticated integration checks.
- [x] Commit the creator destination and its route registration.

### Task 4: Business protection, workspace switching, and public links

**Files:** Modify `src/components/DashboardLayout.tsx`, `src/components/Sidebar.tsx`, `src/App.tsx`, and `src/landing/creator/CreatorLanding.tsx`; inspect business landing and onboarding links for compatibility.

**Interfaces:** Business dashboard guard consumes `useWorkspaces()` and requires `businessId`. Creator layout requires `creatorId`. Switching navigates to `/auth-redirect?workspace=<matching workspace>` using the current session.

- [x] Add tests for protected-route decisions while authentication or membership loads and for dual-role switching; verify failures.
- [x] Protect business routes with membership checks and matching login redirects. Preserve explicit business onboarding for creator-only accounts without automatically redirecting those accounts there.
- [x] Add Switch workspace to business navigation only for dual-role accounts; use the creator layout's matching control.
- [x] Update public navigation and business login links to the matching entry. Add Creator login to the creator landing and communicate invitation-only new creator access. Remove unrestricted signup promises and primary app-download calls to action from the web journey.
- [x] Run tests and verify both entry points, direct route visits, explicit business registration, and same-session switching.
- [x] Commit only this task's changes.

### Task 5: Verify, review, and create the PR

**Files:** Update this plan's checkboxes and validation notes; create no unrelated product files.

- [x] Run `bun test apps/web/tests/workspace.test.ts` and membership tests.
- [x] Run `bun run --cwd apps/web check-types` and `bun run --cwd apps/web build`; separate baseline issues from regressions. Do not commit unrelated dependency changes.
- [x] Review the entire branch diff against the spec and routing matrix, then perform the selected execution workflow's independent review. Fix actionable findings and rerun affected checks.
- [x] Confirm no invitation onboarding, application, or financial feature is falsely described as shipped, and no unrelated local modifications or credentials are staged.
- [x] Push `codex/shared-web-login` and create a PR against the remote default branch. The PR describes separate logins, record-based guards, existing creator campaign access, validation, and the remaining invitation and creator-migration scope.
- [x] Attach the created PR to this chat with `attach_artifact` and return its link.

## Execution record

- Implemented membership in the existing `users` module to avoid mixing the unrelated generated API declaration edit into this PR.
- Native implementation used the user-requested branch in the current checkout, with explicit file commits preserving other staged and unstaged work.
- Tasks 1–4 implemented together because route registration requires the creator destination and both layout guards to be available in the same deliverable.
- Independent review found an authentication-transition race. Added a real-hook regression test, observed it fail, and fixed verification waiting with a 15-second recoverable timeout. Follow-up review found no remaining material issues.
- Full repository test suite: 17 passed, 0 failed. This includes 12 new web tests and 5 existing backend tests.
- Production build passed using Bun as the runtime. The existing large-bundle warning remains.
- Backend TypeScript check passed. App TypeScript check passed with unused-local and unused-parameter diagnostics disabled; the full strict app check retains five pre-existing unused-variable diagnostics in backend analytics, crons, financials, and payouts. The existing `check-types` script does not traverse the app project, so the app project was checked explicitly.
- Browser checks confirmed both login pages, legacy login error preservation, and signed-out business and creator route redirection. Authenticated campaign data, Google OAuth completion, dual-role switching, and the timer effect were not exercised against a deployed backend.
- No backend deployment performed: the checkout contains unrelated backend edits, which must not be deployed as a side effect of this PR. Deploy the new membership query with the web release.
- Invitations and the remaining creator feature migration remain separate units. Existing backend creator onboarding is unchanged; this PR does not claim backend invitation enforcement.

- PR created and attached: https://github.com/Leykwan132/project-banana/pull/2 (branch `codex/shared-web-login`).
