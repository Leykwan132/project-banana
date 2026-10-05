# Instagram provider rollout

Spec: ../specs/2026-10-05-instagram-official-insights-design.md
Execution: implement in the current session. User approved the written design and explicitly requested the Convex environment setting.

## Tasks

1. Provider/model: add tests for strict provider selection, source snapshot projection, safe errors and official metric normalization; implement pure helpers and optional validators. Preserve legacy scraping by default.
2. OAuth: test ownership, state expiry/replay, account mismatch and connection invalidation using the existing backend test context. Add private connection/state tables, login-start mutation, callback action, code exchange, long-lived tokens, and disconnect. Never expose credentials in public queries.
3. Import routing: test captured provider, separate snapshots and stale-generation rejection. Dispatch official imports through the existing scheduling boundary; fetch bounded profile/media data and thirty-day insights. Refresh eligible tokens before expiry.
4. Editor: show provider, Connect/Reconnect/Disconnect, official private insights and source timestamps; preserve existing scraping input and public visibility controls. Return OAuth outcomes to the Accounts tab.
5. Release: configure Convex `INSTAGRAM_DATA_PROVIDER=SCRAPING`, run relevant tests/full suite, backend and frontend type checks, web build, self-review, deploy development functions, and smoke-test the callback. Real successful login requires the account owner to authorize in Instagram.

## Review focus

Replay and account mismatch; connection replacement during fetch; switching providers during queued work; invalid/empty metrics represented as unavailable; public projection never exposing private data or secrets.

## Ledger

- Setup: current branch is `codex/creator-media-kit`; preserve unrelated dirty files and existing generated API changes.
- Ruling: work in the existing feature checkout to preserve the user's current media kit work. No new worktree, branch, commits or shared publication requested.
- Ruling: implement directly after the approved written design and explicit setup instruction; avoid another permission round for the same authorized integration.
- Progress: baseline tests and Convex environment setup started.
- Provider/model, OAuth, provider-aware refresh, and editor tasks implemented with behavioral tests. Independent review findings fixed.
- Ruling: preserve scraping's existing cooldown field and give official imports a separate cooldown, preventing provider switches from changing the other integration's refresh schedule.
- Verification: 21 new tests pass; full suite returns 99 pass and the four original failures. Backend types and web build pass; inherited unused-code errors remain in the strict web check.
- Convex setting successfully configured as SCRAPING. Credentials confirmed present, callback smoke test returns a safe invalid-state redirect. No signed-in browser creator session was available for actual Meta authorization.
- Release documentation: `docs/instagram-official-verification.md`. No production frontend publish requested or performed.
