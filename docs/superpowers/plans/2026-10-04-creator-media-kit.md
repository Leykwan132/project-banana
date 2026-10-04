# Creator Media Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let creators import Instagram accounts, configure independent public-display switches, publish their own Lumina media kit, and refresh saved account data every 24 hours.

**Architecture:** Add three focused Convex tables and authenticated editor operations. Use the installed Apify client, backend token, and scrape pool for asynchronous imports with bounded polling. The public page reads a filtered saved snapshot and shares its presentation component with the editor preview.

**Tech Stack:** React 19, TypeScript, HeroUI 3.2.6, Convex, existing Workpool component, Bun, installed apify-client.

**Spec:** `docs/superpowers/specs/2026-10-04-creator-media-kit-design.md`

## Global Constraints

- Five Instagram accounts per kit; up to 12 imported posts per account; up to six cached public thumbnails per account; ten optional rates.
- One kit per active creator; unique lowercase slug of 3–40 characters; public `/kit/{slug}`; editor `/creator/media-kit`.
- HeroUI Switch for every account, every metric per account, every rate, every contact method, and kit-level section controls.
- Disabled parents preserve child switches. Hidden accounts never contribute to displayed total audience.
- Initial kits are drafts; explicit publication requires an identity, valid slug, and at least one successfully imported visible account.
- Daily cron `{ hours: 24 }` includes hidden accounts and draft kits, excludes deleted owners, and skips active imports and imports successful within the preceding 24 hours.
- Manual refresh cooldown: 24 hours after success; ten minutes after failure. Maximum import lifetime: ten minutes.
- Paid Actor-start actions do not automatically retry; default per-run USD 0.05 ceiling applies to manual and scheduled imports.
- Use backend `APIFY_API_TOKEN`; never send secrets in URLs or public responses. No new Apify installation or connection.
- All registered Convex functions have args and returns validators. Indexed bounded reads; scheduled pagination for account sweeps.
- Protect existing workspace changes. Work from an isolated checkout with current `origin/main` as the prospective PR base, carrying only the media kit spec and plan.
- Routine verification uses simulated Apify results. Live paid scraping requires the quickstart's pricing estimate and session approval. Do not deploy production as part of creating the PR.

## Review Focus

- Two accounts with conflicting metric switches: public output must honor each account independently, including counts attached to post thumbnails.
- Cron overlaps a manual import: the account's atomic enqueue mutation must return the active job without starting another Actor.
- Account removed/hidden or owner deleted while queued/running: stale work must neither publish results nor restore the account.
- Missing counts, private profiles, zero followers, pinned posts, and failed refreshes: preserve unknowns and previous valid snapshots without invented metrics or date windows.
- A thumbnail response redirects, exceeds limits, or has a non-image content type: reject it safely, preserve the import, and clean unreferenced uploaded files.

---

### Task 1: Schema, input validation, and public data contract

**Files:** Create `packages/backend/convex/lib/mediaKitModel.ts`, `packages/backend/convex/mediaKitValidators.ts`, `packages/backend/tests/media-kit-model.test.ts`; modify `packages/backend/convex/schema.ts`.

**Interfaces:** Export `normalizeInstagramHandle(input: string): string`, `validateSlug(input: string): string`, `normalizeProfile(raw: unknown, expectedHandle: string): ProfileSnapshot`, `projectAccount(snapshot: ProfileSnapshot, switches: MetricVisibility): PublicAccount`, metric defaults, bounded settings validators, and DTO validators. Tables: `media_kits`, `media_kit_accounts`, `media_kit_imports` as defined in the spec.

- [ ] Write failing Bun tests for handles/URLs, reserved/invalid slugs, unsafe contacts, nonnegative integer prices, and missing-count normalization.
- [ ] Run `bun test packages/backend/tests/media-kit-model.test.ts` and confirm failure before implementation.
- [ ] Implement validators and normalized types. Index kits by creator and slug; accounts by kit and kit/handle; imports by account. Keep all three additions separate from campaign tables.
- [ ] Implement sample-aware averages, engagement calculation, six-post public presentation, and account-specific metric redaction. Test two accounts with different switches and post counts leaking no disabled metrics; hidden-account exclusion from totals.
- [ ] Run targeted tests and backend TypeScript checks; commit only this task's files.

### Task 2: Creator-owned persistence and anonymous queries

**Files:** Create `packages/backend/convex/mediaKits.ts`, `packages/backend/tests/media-kits.test.ts`, and a focused in-memory Convex test fixture under `packages/backend/tests/helpers/`; regenerate `_generated/api.d.ts` using Convex codegen.

**Interfaces:** Public `getEditor({})`, `saveSettings({settings})`, `setPublished({published})`, `addAccount({handle})`, `setAccountDisplay({accountId, isVisible, metricVisibility})`, `removeAccount({accountId})`, `requestRefresh({accountId})`, and `getPublic({slug})`. Internal helpers resolve job context, enqueue imports, persist run IDs, and finish only a current generation. Public functions derive ownership from authenticated creator membership.

- [ ] Write failing tests invoking registered handlers with a bounded in-memory fixture, following existing backend test conventions.
- [ ] Cover unauthenticated requests, deleted creators, foreign account IDs, unique-slug collisions, five-account limits, duplicate handles, draft/public transitions, and backend projection of rates/contacts.
- [ ] Implement transactional ownership checks and bounded indexed account loading. Enforce uniqueness inside save, not merely through a UI availability check.
- [ ] Preserve child switch settings and invalidate obsolete jobs on account hide/removal. Reject foreign primary-account selections and DM contact references.
- [ ] Ensure public queries construct explicit DTOs and resolve storage URLs only for permitted visible data. Test hidden metrics, enabled total audience with hidden individual counts, and hidden rates/contacts absent from serialized responses.
- [ ] Run targeted tests and typechecks; commit this task's files.

### Task 3: Apify import lifecycle, cached images, and daily cron

**Files:** Create `packages/backend/convex/mediaKitActions.ts`, `packages/backend/convex/lib/mediaKitImages.ts`, `packages/backend/tests/media-kit-imports.test.ts`; modify `mediaKits.ts` and `packages/backend/convex/crons.ts`.

**Interfaces:** Internal actions `startImport({importId,generation})`, `pollImport({importId,generation})`, `refreshDaily({cursor})`; internal queries/mutations in `mediaKits.ts` provide account pagination, current-generation checks, run status, and idempotent enqueue. Image helper `cacheInstagramImage(ctx, url): Promise<Id<'_storage'> | null>`.

- [ ] Write failing tests for one enqueue across repeated requests, fresh/active skips, missing-token failures, private/incorrect-account output, poll status transitions, stale completions, and preservation of the last successful snapshot.
- [ ] Implement paid start through existing `scrapePool` with action retries disabled and the installed client using options-based total-charge caps. Recheck job/account/owner before starting; persist run ID before scheduled polls.
- [ ] Bound polls to ten minutes, handle every terminal status, and fetch dataset items only after success. Allow safe read retries without restarting the Actor; request abort when the tracked run times out or becomes obsolete.
- [ ] Cache permitted avatars/thumbnails with HTTPS CDN allowlists, manual redirect validation, response-size/content-type/timeout limits, and graceful fallbacks. Test oversized/redirected/non-image responses and reference-aware cleanup; prune newly uploaded files if the result becomes stale.
- [ ] Implement paginated daily account sweep and register its 24-hour interval. Tests must include hidden accounts, drafts, deleted owners, independent failures, recent manual refreshes, active jobs, and cooldown behavior.
- [ ] Verify refresh preserves rates, contacts, identity, visibility, slug, and publication. Run targeted tests and backend typecheck; commit task files.

### Task 4: Shared public media kit presentation

**Files:** Create `apps/web/src/components/media-kit/MediaKitView.tsx`, `apps/web/src/components/media-kit/MediaKitContactLinks.tsx`, `apps/web/src/pages/public/MediaKit.tsx`, and focused presentation helper tests where needed; modify `apps/web/src/main.tsx`.

**Interfaces:** `MediaKitView({kit: PublicMediaKit, preview?: boolean})` consumes the public DTO from Task 2. Public route reads `api.mediaKits.getPublic` using `slug` and renders loading, missing/unpublished, or published states.

- [ ] Test safe contact URL construction and formatting of unknown metrics and minor-unit prices.
- [ ] Implement warm white/amber HeroUI layout: identity hero, audience summary, account cards with sample labels/timestamps, six recent thumbnails, visible rate rows, and enabled contact links.
- [ ] Render no empty sections; provide accessible photo fallbacks and external links. Add `/kit/:slug` outside authenticated creator/business layouts and update document metadata with cleanup on unmount.
- [ ] Verify signed-out and signed-in public access, mobile layout, keyboard focus, hidden sections, and image failure states. Run app TypeScript/build checks; commit task files.

### Task 5: Creator editor and per-item switches

**Files:** Create `apps/web/src/pages/creator/CreatorMediaKit.tsx` and focused editor components in `apps/web/src/components/media-kit/`; modify `CreatorLayout.tsx` and `main.tsx`.

**Interfaces:** Editor consumes Task 2 functions and uses Task 4 presentation for the live preview. `VisibilitySwitch` wraps HeroUI v3 Switch with a visible label and controlled state. Account panels edit each account independently; kit settings use local unsaved state until Save.

- [ ] Inspect installed HeroUI v3 type definitions for Switch, Button, Input, Card, and disclosure primitives before using their APIs.
- [ ] Add **Media Kit** sidebar navigation for expanded, collapsed, and mobile layouts and register the authenticated route.
- [ ] Implement first-profile import, reactive queue/run/error status, primary-account selection, visibility controls, refresh eligibility, and account removal.
- [ ] Implement identity/slug editor, per-rate visibility and pricing fields, per-contact visibility and safe values, overall section switches, and total-audience control.
- [ ] Implement save/unsaved state, preview updates, publish/unpublish, copy URL with failure feedback, and open-public-page action. Avoid query updates clobbering in-progress local edits.
- [ ] Verify different account switch settings persist, toggling a parent preserves children, disabled mutation buttons prevent accidental duplicates, and failures leave user input intact. Run app typecheck/build; commit task files.

### Task 6: Verification, review, documentation, and PR

**Files:** Update `packages/backend/README.md`, feature testing documentation, the spec status, and this plan's progress checkboxes.

**Interfaces:** Deliver a feature branch with the complete creator/public flow and daily cron; include exact verification outcomes and release prerequisites in the PR.

- [ ] Document `APIFY_API_TOKEN` reuse, the configurable charge ceiling, daily-refresh behavior, and frontend/backend coordinated release requirements.
- [ ] Run all media kit tests, relevant creator/auth tests, backend and app TypeScript checks, frontend build, and `git diff --check`. Separate known baseline failures from regressions.
- [ ] Generate API types and validate against a safe development/local deployment when available. Avoid activating recurring paid production work as a validation shortcut; report any unavailable deployment check.
- [ ] Review the complete feature diff for public data leaks, stale jobs, duplicate charging, invalid HeroUI usage, ownership bypasses, and missing acceptance criteria. Resolve substantive findings and repeat relevant checks.
- [ ] Create a `codex/creator-media-kit` branch, commit only feature files, push to origin, and open a PR against current main. If native worktree is detached, establish the feature branch before pushing.
- [ ] Attach the created PR to this chat with `attach_artifact` and report its URL with the checks and any live-scrape/deployment limitations.


## Implementation status

Tasks 1–5 are implemented in the feature branch. Task 6 automated checks and
independent review are complete; PR publication is the remaining integration
step. Exact evidence and unavailable development deployment/browser checks are
recorded in `docs/media-kit-verification.md`. API types were updated locally
because codegen requires a configured Convex deployment. Tests use mocked Apify
responses; no production deployment or paid Actor invocation was performed.
