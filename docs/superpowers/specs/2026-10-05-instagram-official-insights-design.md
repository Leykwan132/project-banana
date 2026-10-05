# Instagram official insights alongside scraping

Date: 2026-10-05
Status: Written specification approved and implemented; account-owner authorization check remains.

## Intent and approved direction

Connect creators' Instagram professional accounts through Instagram Login and retrieve official insights. Keep the existing Apify integration available. Select the active Instagram provider through a Convex backend environment variable. The user has configured the Instagram App ID and App Secret in Convex and the redirect URI in Meta.

This specification develops the approved Media Kit → Accounts connection flow. Messenger is a separate integration. Campaign tracking and payouts continue their existing behavior in this release; changing their metric source requires a separate change because official views and scraped play counts can affect earnings.

## Provider selection

`INSTAGRAM_DATA_PROVIDER` accepts exactly `SCRAPING` or `META_OFFICIAL`. When unset, use `SCRAPING` to preserve existing behavior. Reject unsupported values with a configuration error rather than choosing a provider silently.

The setting governs Instagram media kit profile imports and insights refreshes. TikTok keeps its current provider. Read the setting server-side; expose only the selected provider and configuration readiness to the authenticated editor.

Both implementations remain installed and usable. Switching providers does not delete accounts, connection credentials, snapshots, or public visibility settings. Retain separate source snapshots so a later scrape does not destroy the official snapshot, or vice versa. Record the provider on jobs and snapshots; an in-flight job may update its source snapshot but cannot relabel data as the other source.

Official mode requires an authorized connection for the exact account. Do not fall back automatically to scraping after an official request fails. Show connection required, permission missing, temporarily unavailable, or reconnect required as appropriate. Retain previous successful data with its original source and timestamp; never present it as a new official refresh.

## Configuration

- `INSTAGRAM_APP_ID`: Instagram App ID (`1451111847122256`, supplied by the user).
- `INSTAGRAM_APP_SECRET`: configured only in the backend.
- `CONVEX_SITE_URL`: used to construct the exact registered callback.
- `SITE_URL`: allowlisted frontend origin used for returning to the editor.
- `INSTAGRAM_DATA_PROVIDER`: `SCRAPING` by default; `META_OFFICIAL` selects official media kit fetching.
- `INSTAGRAM_GRAPH_API_VERSION`: pin to an explicitly supported Graph API version; initial implementation uses the v25.0 contract in the supplied insights documentation.

Callback: `https://basic-mule-595.convex.site/oauth/instagram/callback` for the current development deployment. Production uses its own registered backend callback and credentials.

No Instagram webhook or webhook verify token is required for insights polling. Request only `instagram_business_basic` and `instagram_business_manage_insights`. The app constructs authorization URLs dynamically with an unpredictable OAuth state; the static dashboard link is not the app connection flow.

## Creator experience

1. Media Kit → Accounts displays the active data source.
2. In official mode, Add Instagram Account starts Instagram Login. Existing Instagram cards offer Connect or Reconnect where needed.
3. The creator signs in and authorizes access. Match the returned account ID and username to the intended account. A mismatch must not attach credentials to a different existing card; show a useful error and permit retry.
4. Add a new authorized account through the existing five-account limit and duplicate checks. Preserve kit settings and the primary-account selection.
5. On success, return to the Accounts tab and queue the first official import. Show Connecting/Updating, Connected, last successful refresh, and a safe error or reconnect action when needed.
6. Provide a Disconnect action that removes local credentials and invalidates pending official refreshes without deleting the card or scrape data. Explain that revoking the app's authorization can also be done in Instagram settings.

Keep the existing scraping add-account experience and daily refresh cadence. Maintain existing public metric switches and explicit public disclosure choices. Official insights beyond those switches remain private to the creator until matching public display controls exist.

## OAuth and ownership

Resolve the creator from the authenticated identity when starting login. Store a short-lived, random state hash with the creator, intended account, fixed return destination, and expiry. Make state single-use with transactional consumption. Reject missing, expired, tampered, already-consumed, or mismatched state before accepting credentials. OAuth callbacks are public HTTP routes but never accept a caller-supplied creator ID as authority.

Exchange the authorization code server-side using the Instagram App Secret and exact registered redirect URI. Obtain a long-lived Instagram User access token and store its expiry privately. Read the authorized Instagram identity from the API rather than trusting a client handle or callback parameters. Verify the creator and intended account still exist and remain eligible before saving.

Canceling login returns to the editor with a safe message. Code exchange failures permit restarting login with new state; never reuse a consumed state. Redirect only to the configured frontend origin and fixed media-kit route. Tokens, secrets, authorization codes, and raw upstream errors must not enter browser responses or logs. Responses containing OAuth results use no-store headers and avoid rendering third-party content.

Store connections in a dedicated private table indexed by creator and Instagram account ID. Public and editor queries project explicit safe fields; they never return connection documents or tokens. Internal actions obtain credentials through internal queries. Every creator-facing operation checks ownership and rejects deleted creator accounts.

## Official data fetching

Use `graph.instagram.com` with the Instagram User access token for authenticated identity, owned media, account insights, and media insights. Keep this implementation separate from Apify requests and normalize both sources into the media kit presentation contract where the meanings match.

Fetch a bounded recent-media sample compatible with the current twelve-post snapshot. Store stable media IDs, permalink, caption, media type, timestamp, available profile fields, and supported official media metrics. Use current views metrics rather than deprecated impressions. Do not fabricate verification status, category, or other metadata absent from the official response.

Store account insights for an explicit rolling thirty-day window: views, reach, accounts engaged, and total interactions, subject to permission and metric availability. Preserve window start/end, aggregation type, source, and fetched timestamp. Counts unavailable from Meta remain unavailable, not zero. Audience demographics are deferred until dedicated display controls and threshold handling exist.

Derived recent-post averages retain their sample sizes and stay distinct from thirty-day account insights. Reach represents unique accounts within Meta's defined window; do not sum it as a unique combined audience across social accounts.

Avoid incompatible metric batches. A metric unsupported for a media type must not discard otherwise valid profile or post data. Bound request timeouts, pagination, and concurrency. Sanitize errors into actionable categories without exposing raw response bodies.

## Refresh lifecycle

Reuse the existing daily scheduling and job/cooldown behavior through provider-aware dispatch. Capture the selected provider and connection generation when creating a job. Official actions do not acquire Apify run leases or start paid actors. A connection deletion, replacement, or account removal invalidates late results.

Refresh eligible long-lived tokens before expiry using Meta's supported refresh flow. Store refreshed expiry and token only if the connection generation still matches. Revoked or expired credentials require reconnect; rate limits and temporary upstream errors preserve the previous snapshot and retry on the next eligible run. No automatic scraping fallback.

Paginate scheduled scans and index all connection lookups. Cleanup expired OAuth states in bounded batches. Do not add required fields to existing populated tables; new metadata is optional until backfilled.

## Alternatives considered

- **Selected:** one backend provider switch, two preserved implementations, and separate source snapshots. Gives a reversible rollout and makes the active source explicit.
- **Per-account selection:** useful for mixed rollout, but adds settings beyond the requested environment switch.
- **Automatic fallback:** improves apparent availability but can conceal loss of official authorization and mix metric meanings. Excluded from this design.

## Verification and acceptance

- Unset provider preserves existing scraping behavior; both explicit values select the correct importer; invalid values fail visibly.
- Official mode never calls Apify, including failures and accounts lacking authorization.
- OAuth state expiry, replay, cancellation, mismatched account, and unauthorized ownership are covered by behavioral tests.
- Tokens and secrets cannot appear in editor/public results or safe errors.
- Switching providers preserves account settings and source snapshots; in-flight results cannot contaminate the other source.
- Unsupported metrics, empty responses, permission errors, rate limits, expired tokens, and token-refresh races are exercised with representative API fixtures.
- Disconnect and account deletion prevent late jobs from restoring credentials or data.
- Existing media kit import tests, backend/frontend type checks, and web build pass.
- Deploy the callback to the configured development backend and complete one real Instagram connection to validate the App Secret, permissions, and API responses. A successful build alone does not establish successful Meta authorization.

## Implementation boundary

Implemented in the existing feature checkout and deployed to the configured development backend. See `docs/instagram-official-verification.md` for verification evidence and the remaining real-account authorization check. Unrelated local files were preserved.
