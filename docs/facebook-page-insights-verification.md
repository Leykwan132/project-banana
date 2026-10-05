# Facebook Page insights verification

The creator clarified that the requested Messenger integration means Facebook
Page insights only. This adds Page authorization and private insights to the same
PR as Instagram. Message reading/sending is outside that clarified scope.

## Automated checks

- Thirteen new tests cover Facebook callback/scopes, creator authentication,
  single-use state expiry/replay, Page selection, token privacy, declined
  permissions, cursor pagination, unsupported metrics, revoked access, refresh
  deduplication, reconnect generations and disconnect races.
- Full backend/web suite: 112 pass and the same four pre-existing failures recorded
  in `instagram-official-verification.md`.
- Backend types and frontend type compatibility checks pass. The frontend check
  disables the existing unused-code diagnostics described in that same document.
- Web build passes with existing bundle-size warnings.

## Account-owner verification

Development functions and schema deployed successfully to `basic-mule-595`.
The internal configuration check confirmed Meta app ID and secret are present
without printing their values, and the frontend origin is `http://localhost:5173`.
An invalid-state callback returned HTTP 303 to the fixed media-kit route with
`facebook=invalid_state`, `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.
Production configuration and deployment were not performed.

The owner must configure `META_APP_ID` and `META_APP_SECRET` for the main Meta app,
register `/oauth/facebook/callback` in Facebook Login, and enable the three Page
permissions. The backend never returns Page access tokens through public queries.

1. Sign in to the creator editor and save pending changes.
2. In Accounts → Facebook Pages, select Connect Facebook.
3. Authorize Page list, engagement and insights access.
4. Select a Page you can analyze; verify its profile counts and reported daily
   media views. Legacy deprecated reach/impression metrics are not requested.
5. Verify Refresh, reconnect after revocation, and Disconnect. Previous snapshots
   should survive fetch failures; disconnected Pages must not reappear from jobs.

Live authorization, app-review access and real `page_media_view` availability remain
unverified. Unsupported or empty metrics show Unavailable. There is no webhook for
this polling integration. Production commands are in `packages/backend/README.md`.
