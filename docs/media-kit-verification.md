# Creator media kit verification

## Automated checks

- `bun test packages/backend/tests`: 37 passing tests, 0 failures.
- `bun apps/web/node_modules/typescript/bin/tsc --noEmit -p packages/backend/convex/tsconfig.json`: passes.
- `bun apps/web/node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.app.json`: five existing TS6133 errors, in analytics.ts (two), crons.ts, financials.ts and payouts.ts. No new feature type errors.
- `bun --bun run --cwd apps/web build`: passes; existing large-chunk warning remains.
- `git diff --check`: passes.

Tests cover ownership, draft publication, independent public visibility, hidden
account audience exclusion, duplicate jobs, stale completion, failed snapshot
preservation, remote run leases, cooldowns, hidden/draft daily refreshes, safe image
hosts/redirects/sizes/types, paid start budget, missing token, successful polling,
and aborting remote runs when scheduling fails. All external Apify responses are
mocked. Existing creator invitation, auth and campaign tests are also included.

## Review

A separate reviewer checked auth/validators, public data projection, lifecycle,
cron and editor. Findings were addressed with an atomic three-run lease,
time-based recovery, persistent latest-job feedback, per-account cron failure
handling, cache cleanup, primary selection, copy-link and image preview controls,
initial identity seeding, and independent sample labels for each average.

## Release checks still needed

- `convex codegen` could not run: isolated checkout has no `CONVEX_DEPLOYMENT`.
  API module declarations were updated locally and type checked. Regenerate them
  against the configured development deployment before coordinated release.
- No backend deployment, signed-in browser integration check, or live paid Actor
  invocation was performed. Verify those on the development deployment with its
  configured token before production release.
- Deploying the backend registers the 24-hour paid refresh cron. Per-run cap is
  USD 0.05 by default, configurable through `MEDIA_KIT_MAX_CHARGE_USD`.
