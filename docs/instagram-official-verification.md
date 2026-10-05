# Instagram provider verification

Verified on 2026-10-05 against the development deployment `basic-mule-595`.

## Configuration and delivery

- Convex environment: `INSTAGRAM_DATA_PROVIDER=SCRAPING` set and confirmed at runtime.
- `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET` are present; their values were not printed. Actual credential validity requires an owner-authorized Meta exchange.
- Registered callback implemented: `https://basic-mule-595.convex.site/oauth/instagram/callback`.
- Callback smoke test with an invalid state returned HTTP 303 to `http://localhost:5173/creator/media-kit?instagram=invalid_state`, with `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.
- Current `SITE_URL` is `http://localhost:5173`.
- Backend functions and schema deployed successfully through Convex's development deployment workflow. Frontend changes are in the local workspace; no production website release was performed.

## Automated checks

- New integration suite: 21 tests pass. Covers provider validation, independent snapshots/cooldowns, private public projection, OAuth URL/state/replay/ownership, flat and nested token responses, safe redirects/errors, stale connection jobs, disconnect, claim deduplication, reconnect refresh and unsupported metrics.
- Full backend/web suite: 99 pass, four failures also present before this task:
  - `public queries exclude drafts and independently hidden accounts, metrics, contacts and rates` (`media-kits.test.ts`): existing test expects draft defaults that differ from current implementation.
  - `paid start claims a remote concurrency lease and caps charges` (`media-kit-imports.test.ts`).
  - `successful poll normalizes the expected profile and persists its snapshot` (`media-kit-imports.test.ts`).
  - `poll scheduling failure aborts the Actor before releasing its lease` (`media-kit-imports.test.ts`).
  - The three import test fixtures target the earlier Apify client implementation; current imports use direct HTTP requests. No live paid Actor was intentionally invoked for verification.
- Backend TypeScript check passes.
- Frontend type compatibility check passes with inherited unused-code diagnostics disabled. The full strict frontend check reports pre-existing unused declarations in `analytics.ts` (`userRecord`, two locations), `crons.ts` (`api`), `financials.ts` (`v`), and `payouts.ts` (`ctx`). No new integration type errors remain.
- Production web build passes; existing large-bundle warnings remain.
- Independent code review completed; its reconnect, token-shape, and runtime-budget findings were fixed and covered by tests.

## Remaining account-owner check

The browser preview reaches creator login. No signed-in creator session was available, so a real Instagram authorization and real insights response remain unverified.

1. Sign in at `http://localhost:5173/creator/media-kit`.
2. In Accounts, open an Instagram card and choose Connect Instagram. Existing public scraping can remain active while the connection is tested.
3. Authorize the professional Instagram account and verify the private thirty-day account insights and lifetime post insights.
4. To select official data for media kits, set `INSTAGRAM_DATA_PROVIDER=META_OFFICIAL` in Convex. New Instagram accounts then use login instead of the username import flow.
5. Set it back to `SCRAPING` to use existing scraped snapshots/imports. TikTok and campaign tracking keep their current implementations.

Before production rollout, configure the production backend credentials, frontend origin and registered callback, confirm Meta permission access, and release the frontend.
