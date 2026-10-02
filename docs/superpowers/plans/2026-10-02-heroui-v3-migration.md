# HeroUI v3 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the web app from HeroUI v2 to HeroUI v3.2.6 while preserving current workflows, appearance, Google Sans as the sole web font, and the app-wide letter spacing.

**Architecture:** Replace v2 components with v3 compound components across the existing web app, then switch the dependency set and global CSS configuration to HeroUI v3. Keep application data flow and navigation unchanged; use React Aria item identity (`id`, `textValue`) where collection components require it.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind CSS 4, HeroUI React 3.2.6, Bun.

**Spec:** `docs/superpowers/specs/2026-10-02-heroui-v3-migration-design.md`

## Global Constraints

- Migrate `apps/web` only; do not change backend behavior, mobile app dependencies, or introduce product features.
- Preserve current page behavior and visible design, including sorting, navigation, loading placeholders, popovers, dropdown options, pagination, and campaign budget progress.
- Keep React `key` props and add v3 collection `id` and `textValue` values where required.
- Keep React 19 and Tailwind CSS 4; target HeroUI `3.2.6`.
- Remove v2 provider/plugin/theme setup and remove direct Framer Motion only if the web app has no remaining direct use.
- Use Google Sans for all web text and preserve global `letter-spacing: 0.01em`.
- Do not stage or change unrelated existing working-tree files.

## Review Focus

- Creator menu collection items retain stable IDs and accessible text; manually verify opening the menu, switching workspace, and signing out.
- Submission table sorting and row navigation remain intact; run the existing submission-sort test and manually verify a sorted column and detail navigation.
- Amount breakdown popovers still open and dismiss correctly; manually verify a withdrawal and campaign amount breakdown.
- Skeletons remain visible during loading and do not replace empty/error states; manually inspect creator and business campaign loading, empty, and loaded states.
- Campaign progress handles zero or missing budget values without invalid output; verify those cases in the existing campaign fixtures/data if available.

---

### Task 1: Migrate the web app from HeroUI v2 to v3

**Files:**
- Modify: `apps/web/src/components/CreatorLayout.tsx`
- Modify: `apps/web/src/components/CampaignImage.tsx`
- Modify: `apps/web/src/components/analytics/TopPostCard.tsx`
- Modify: `apps/web/src/lib/submission-status.tsx`
- Modify: `apps/web/src/pages/creator/CreatorCampaigns.tsx`
- Modify: `apps/web/src/pages/creator/CreatorSubmissions.tsx`
- Modify: `apps/web/src/pages/Withdrawals.tsx`
- Modify: `apps/web/src/pages/CampaignDetails/index.tsx`
- Modify: `apps/web/src/pages/CreateCampaign.tsx`
- Modify: `apps/web/src/pages/Credits.tsx`
- Modify: `apps/web/src/pages/Subscription.tsx`
- Modify: `apps/web/src/pages/Campaigns.tsx`
- Modify: `apps/web/src/pages/ReviewSubmission.tsx`
- Modify: `apps/web/src/pages/Overview.tsx`
- Modify: `apps/web/src/pages/ApprovalDetails.tsx`
- Modify: `apps/web/src/pages/Approvals.tsx`
- Modify: `apps/web/src/pages/admin/AdminBankApprovals.tsx`
- Modify: `apps/web/src/pages/admin/AdminSubmissions.tsx`
- Modify: `apps/web/src/pages/admin/AdminPayouts.tsx`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/index.css`
- Delete: `apps/web/src/hero.ts`
- Modify: `apps/web/package.json`
- Modify: `bun.lock`

**Interfaces:**
- Consumes: the v3 component APIs and migration instructions for Avatar, Button, Card, Chip, Dropdown, Pagination, Popover, ProgressBar, Skeleton, and Table.
- Produces: the same application props, event handlers, table sort state, routes, campaign progress values, and overlay behavior, implemented with HeroUI v3 compound components.

- [ ] **Step 1: Migrate creator and shared component call sites.** Update `CreatorLayout.tsx`, `CreatorCampaigns.tsx`, `CreatorSubmissions.tsx`, `submission-status.tsx`, `CampaignImage.tsx`, and `TopPostCard.tsx` to the v3 Avatar/Dropdown, ProgressBar, Table, Chip, and Skeleton APIs. Preserve menu actions, row sort/navigation behavior, status presentation, and all loading states; add stable `id` and `textValue` to collection items where required.
- [ ] **Step 2: Migrate business and admin component call sites.** Update the remaining listed pages to the v3 Card, Button, Popover, Pagination, and Skeleton APIs. Keep withdrawal/campaign breakdown content, pagination state, approval navigation, and existing empty/loading/error states unchanged.
- [ ] **Step 3: Switch the dependency and global configuration after all component code is migrated.** Set `@heroui/react` and `@heroui/styles` to `3.2.6`; update component imports to `@heroui/react`; remove v2-only HeroUI component packages and unused direct `framer-motion`; update `bun.lock`; remove the `HeroUIProvider` wrapper; remove the `heroui()` Tailwind plugin and v2 theme source; import `@heroui/styles` after `tailwindcss`; delete `src/hero.ts`.
- [ ] **Step 4: Migrate any remaining renamed, removed, or styling APIs reported by typecheck and lint.** Use native HTML elements for any v2-only component still found, without changing its user-visible behavior.
- [ ] **Step 5: Run the web test suite.** Run `bun test apps/web/tests`; expected: all existing tests pass, including submission sorting and withdrawal validation.
- [ ] **Step 6: Run type checking and lint.** Run `bun run --cwd apps/web check-types` and `bun run --cwd apps/web lint`; expected: both pass with no HeroUI v2 imports or API types remaining.
- [ ] **Step 7: Build the production web app.** Run `bun run --cwd apps/web vite build`; expected: Vite completes successfully. Record existing Node-version or chunk-size warnings separately.
- [ ] **Step 8: Smoke-test migrated routes.** Verify creator campaigns, submissions and details, withdrawal, business campaigns and approvals, credits, and admin pagination. Exercise the five Review Focus cases above and confirm Google Sans remains the only font and the `.01em` global spacing remains applied.

### Task 2: Review and finalize the migration change

**Files:**
- Review: all Task 1 files

**Interfaces:**
- Consumes: the migrated HeroUI v3 app and successful checks from Task 1.
- Produces: a focused final change containing only the web migration and required lockfile updates.

- [ ] **Step 1: Search for leftover v2 setup.** Confirm no `HeroUIProvider`, `heroui()` plugin, `@heroui/theme` source, v2 component package import, or direct Framer Motion usage remains in `apps/web`.
- [ ] **Step 2: Inspect the staged diff.** Confirm existing user changes in web/root package scripts and unrelated mobile/backend files are not included.
- [ ] **Step 3: Commit the migration.** Stage only the migration files and commit as `chore(web): migrate HeroUI to v3`.
