# HeroUI v3 migration design

## Goal

Upgrade the web app from HeroUI v2 to the current HeroUI v3 release while preserving existing page behavior and the established Lumina visual design. This migration covers `apps/web`; it does not change backend behavior, mobile app dependencies, or introduce new product features.

## Current state

- `apps/web` depends on HeroUI v2 packages, including the React aggregate and component packages for Card, Chip, Image, Modal, Navbar, Pagination, Popover, Skeleton, System, Theme, and Toast.
- HeroUI is initialized through `HeroUIProvider` in `src/main.tsx`, the Tailwind `heroui()` plugin in `src/hero.ts`, and a HeroUI theme source in `src/index.css`.
- Current HeroUI usage spans creator, business, and admin pages: Avatar/Dropdown, Button, Card, Chip, Pagination, Popover, Progress, Skeleton, and Table.
- The app already uses React 19 and Tailwind CSS 4, satisfying the major platform requirements called out in the migration guide.
- Framer Motion has no direct source imports in the web app and is currently a direct dependency; v3 no longer requires it.

## Recommended approach

Perform a full migration in one focused change, as requested. Migrate all existing HeroUI component call sites to v3 compound-component APIs before switching the dependency set. Then remove the v2 provider/plugin/theme setup, upgrade to the current v3 packages, remove v2-only component packages and Framer Motion, and update the stylesheet integration to the v3 configuration.

The app must not keep v2 and v3 component implementations side by side. Where v3 changes collection identity, keep React `key` values and add the v3 `id` and `textValue` properties needed for stable selection, focus, and assistive technology behavior.

## Component and behavior scope

Migrate every HeroUI call site currently found in `apps/web/src`, including:

- Creator: status Chip, account menu Avatar/Dropdown, campaign Progress, submission Table, and loading Skeletons.
- Business and shared pages: Cards, Buttons, Popovers, Pagination, and Skeletons.
- Admin: Pagination and loading Skeletons.

Preserve the visible status labels and icon colors, table sorting and row navigation, popover amount breakdown, dropdown choices, loading placeholders, pagination behavior, and current campaign budget progress display. Replace the v2 `Progress` component with the v3 `ProgressBar` API.

The provider is removed from `main.tsx` if v3 requires none. The old `src/hero.ts` configuration and v2-specific stylesheet source/plugin declarations are removed or replaced with the documented v3 setup. Preserve Google Sans as the sole font family across the web app and keep the app-wide letter spacing while making these styling changes.

## Dependencies and files

- Update HeroUI dependencies in `apps/web/package.json` to the current v3 package set and update `bun.lock` consistently.
- Remove obsolete v2 component packages and the unused direct Framer Motion dependency if no remaining app code needs it.
- Update component imports and APIs in all existing HeroUI call sites.
- Update `apps/web/src/main.tsx`, `apps/web/src/index.css`, and remove `apps/web/src/hero.ts` when no longer needed.
- Preserve pre-existing user changes in package scripts and root package manager version; preserve Google Sans as the sole web font and app-wide letter spacing.
- Leave unrelated mobile, Convex, credential, and generated files untouched.

## Validation

After the complete migration, run the web app's type check, lint, and production build. Resolve migration-related failures before considering the work complete. Inspect the final diff to confirm no unrelated dirty files were staged or modified. If the available Node version prevents a check, report that limitation separately from checks that do pass.

## Acceptance criteria

1. The web app uses HeroUI v3 only, with no v2 HeroUI packages or setup remaining.
2. All current HeroUI-backed screens type-check and build with their behaviors preserved.
3. HeroUI's v2 Tailwind plugin/provider setup and unnecessary Framer Motion dependency are removed.
4. Google Sans is the sole web font, app-wide letter spacing is preserved, and user-owned working-tree changes are preserved.
