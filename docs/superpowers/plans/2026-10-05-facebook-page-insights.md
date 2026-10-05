# Facebook Page insights addition

The original request included official Meta data for Instagram and Messenger. The creator confirmed that the Messenger portion means Facebook Page insights only, not conversations or sending messages.

Add a separate private Facebook Pages section to Media Kit → Accounts. Use Facebook Login, `/oauth/facebook/callback`, `META_APP_ID`, `META_APP_SECRET`, and the configured `SITE_URL`. Request `pages_show_list`, `pages_read_engagement`, and `read_insights`. No messaging permissions or webhook are needed. Instagram retains its own credentials, callback and provider switch; Pages have no existing scraper and always use official data.

Store single-use ten-minute OAuth states. Exchange codes and list manageable Pages server-side with bounded cursor pagination. Keep Page choices and credentials private; let the owner select up to five Pages. Choices expire after ten minutes. Every public operation resolves the authenticated creator and checks ownership. Never return tokens, codes or raw upstream errors to the frontend.

Fetch current follower/Page-like counts and daily media views for a labeled thirty-day window. Sum only additive daily views; preserve daily values and unavailable metrics. Legacy reach/impression metrics from the supplied example are deprecated and are not requested. Preserve the last successful snapshot after failure; expired/revoked permissions require reconnect. Refresh daily with paginated scans and atomic generation/job checks; disconnect prevents late results restoring data or credentials.

Execution: add behavioral tests, implement backend and editor, regenerate API types, review ownership/privacy/race behavior, run tests/types/build, verify the deployed callback where configuration allows, and update PR #8 and its production commands. Live owner authorization remains an account-owner verification step.
