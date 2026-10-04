# Creator Media Kit

Date: 2026-10-04
Status: Proposed design, awaiting written-spec review

## Purpose

Give every active Lumina creator a public media kit that potential brand partners can view without signing in. Creators enter Instagram handles, import their public profiles and stats through the existing Apify integration, choose what to disclose, and optionally publish rates and contact methods.

The public presentation should feel minimal and clean, using the installed HeroUI v3 components and Lumina's existing typography and restrained amber accent. The July reference at https://july.bio/kkk informs the content hierarchy: identity, audience, social accounts, recent content, rates, and contact.

## Existing foundation

- React/Vite frontend in `apps/web`, with HeroUI 3.2.6 already installed.
- Authenticated creator workspace and responsive sidebar in `CreatorLayout.tsx`.
- Convex backend with authenticated creator records and unique Lumina usernames.
- Existing Instagram integration uses `apify/instagram-profile-scraper` and the backend `APIFY_API_TOKEN` environment variable.
- `apify-client` is already installed in `packages/backend`.
- Existing scrape workpool limits parallel work to three actions.

Reuse this provider, token, dependency, and queue infrastructure. Application scraping uses the backend token, independently of the Codex MCP connection. Media kit importing must authenticate the creator and validate inputs before scheduling paid external work.

## Product decisions

1. Add **Media Kit** to the creator sidebar, linking to `/creator/media-kit`.
2. Give each creator one kit, initially a draft. The creator explicitly publishes or unpublishes it.
3. Serve published kits at `/kit/{slug}` on the current Lumina origin. Default the slug to the creator's existing Lumina username; allow editing with uniqueness validation.
4. Support up to five Instagram accounts per kit. This is an assumption based on the request to show creators' pages; the first input remains a simple single-handle import.
5. Accept a plain handle, `@handle`, or an Instagram profile URL. Normalize, deduplicate, and reject post/reel URLs and other domains.
6. Import when adding an account. Register a Convex cron job that runs every 24 hours and enqueues a fresh import for each saved Instagram account belonging to an active creator, including accounts hidden from the public kit and accounts in draft kits. Skip accounts with an active import or a successful import within the preceding 24 hours. Keep manual refresh available with the same 24-hour successful-import cooldown and a 10-minute retry delay after failure, and show when it becomes available.
7. Creators choose a primary account to seed their editable name, photo, and bio. Later refreshes update account snapshots without overwriting edited kit content, rates, or contact details.
8. Influencer category means an editable description of the creator's niche, such as Athlete, Beauty, Food, or Lifestyle. Do not infer a niche from follower counts or present it as verified.
9. Rates and contact methods are manually supplied and explicitly opted into public display.

## Creator editor

Use a responsive editor with a live public-page preview: two columns on wide screens, stacked on mobile. The preview uses the same presentation component as the public route, with the current local edits and visibility settings.

### Profile and public link

- Display name, short bio, category, primary imported profile photo, and public slug.
- Slug validation: lowercase ASCII letters, numbers, and hyphens; 3–40 characters; no leading/trailing hyphen; reserve service names such as admin, support, login, and lumina.
- Save button, published/draft status, publish/unpublish action, open-public-page action, and copy-link feedback.
- Publish requires a display name, valid unique slug, and at least one successfully imported visible account.
- Editing fields creates unsaved changes; Save persists them. Import and refresh status remain independently reactive through Convex.

### Instagram accounts

- Simple handle/URL input and **Import profile** button.
- Account cards with avatar, handle, public profile link, last successful update, import status, and useful error messages.
- Each account has its own **Show account** switch, its own metric switches, primary-account selection, refresh action, and removal action.
- A hidden or removed account is excluded from public account cards, recent content, and the combined audience calculation.
- Removing or hiding an account invalidates in-flight results for it, so a late job cannot restore it or publish its data.

### Display controls

Use HeroUI Switch components for all public-display controls. Each account stores independent switches for followers, post count, engagement rate, average likes, average comments, available average video views, and recent posts. Changing a metric on one account must not change any other account. A creator can, for example, show engagement for account A and hide it for account B.

Kit-level switches control total audience, the rates section, and the contact section. Each rate also has its own **Show rate** switch; each configured contact method has its own visibility switch. Turning off a section hides all of its entries while preserving their individual switch settings for when the section is enabled again. Turning off an account similarly preserves its metric settings.

Default public content: profile identity, visible account links, followers, total audience, and recent posts. Calculated engagement metrics are off until the creator chooses to display them. Rates and contacts are off until configured and enabled.

A creator may intentionally show a combined audience while hiding individual follower counts. Explain this relationship beside the total-audience switch. The public response still omits the hidden per-account counts.

### Optional rates

- Up to ten services, each with a name, optional description, nonnegative price, currency, optional **Starting from** indicator, and its own **Show rate** switch.
- Default currency MYR; offer MYR, USD, and SGD.
- Use integer minor currency units in storage and locale-aware formatting in the UI.
- Hide the whole section when disabled or when no rate is enabled. Public responses omit disabled rate entries entirely.

### Contact methods

- Optional email, WhatsApp number including country code, HTTPS website URL, and Instagram DM for a visible imported account.
- Creator explicitly enables the contact section and selects each method with its own switch; do not automatically publish contact information found in a scrape or from their Lumina login account.
- Validate values and construct safe `mailto:`, `https://wa.me/`, website, and Instagram links.
- Label contact actions clearly; external links use safe new-tab attributes.

## Public page

A self-contained page outside authenticated workspace layouts, with a subtle Lumina brand link and **Media kit by Lumina** footer.

1. **Identity hero:** profile photo, large display name, category, concise bio, and available contact action. Use a compact editorial layout with generous spacing, avoiding a large empty banner.
2. **Audience summary:** one prominent combined audience number when enabled, followed by a small number of relevant enabled metrics. Combined audience is the sum of known follower counts across visible accounts; it is not a count of unique people. Label that limitation.
3. **Instagram accounts:** clean account cards with profile links, enabled stats, the sample size for calculated engagement, and last update timestamps.
4. **Recent content:** up to six recent posts per visible account, with thumbnails and Instagram links. Show public engagement counts only when their corresponding display setting is enabled.
5. **Rates:** compact service rows, easy to scan on mobile.
6. **Contact:** enabled contact methods and a direct collaboration call to action.

Avoid empty sections, made-up testimonials, unverifiable benchmark claims, and unavailable metrics. Missing/private/unpublished kits return a clear unavailable-page state without exposing whether the creator has a draft. Public page data must load for signed-out visitors and creators/businesses who are signed in.

## Stats and data accuracy

Use the existing official Apify Instagram Profile Scraper. Its documented output includes follower counts, bio, profile photo, post counts, category, and up to 12 recent posts with public metrics.

- Followers and post counts are imported values when valid, not defaulted to zero when missing.
- Average likes/comments use valid nonnegative counts only and carry their sample sizes.
- Engagement rate = mean likes plus comments over posts where both counts are known, divided by the current follower count, multiplied by 100. A zero/missing follower count or no complete post observations makes the rate unavailable.
- Average video views use only video posts with an available, valid public view/play count. Show its sample size separately.
- Scraping is a recent-post snapshot. Do not label it as 7-, 14-, 30-, or 60-day Insights or infer trends from a single snapshot.
- Reach, saves, private shares, audience demographics, and unique combined audience are outside this public-data version.
- Private profiles and missing accounts return an actionable import failure. Retain the previous successful snapshot after a failed refresh and mark it with its original timestamp.

## Backend design

### Stored records

Add focused media kit tables rather than extending campaign analytics:

- `media_kits`: owner creator ID, unique slug, editable identity, primary account ID, kit-level visibility settings (total audience, rates section, contact section), rates with individual `is_visible` flags, contact methods with individual visibility flags, publication state, and timestamps. Index by creator and slug.
- `media_kit_accounts`: kit ID, normalized Instagram handle, account `is_visible` flag, per-account `metric_visibility` settings (followers, post count, engagement rate, average likes, average comments, average video views, recent posts), normalized snapshot, cached image references, latest successful import time, current job reference, and refresh eligibility. Index by kit and normalized handle.
- `media_kit_imports`: account ID, immutable job generation, queue/run status, Apify run ID, start/finish time, and safe error code/message. Index by account and active status as needed.

Keep records bounded: five accounts, up to 12 posts per snapshot, ten rates, limited field lengths, and whitelisted normalized Apify fields. Do not persist the entire raw Actor response.

### Authenticated operations

Provide creator-owned queries/mutations for editor loading, settings save, publish/unpublish, account addition/removal, account visibility, and refresh requests. Resolve the authenticated creator on the backend and enforce ownership on every operation; never accept a caller-supplied user ID as authority.

Slug availability is advisory in the UI, with uniqueness enforced atomically during save. Successful imports remain draft content unless the kit is already published. Every authenticated operation rejects deleted creator records.

### Import execution

1. An authenticated mutation validates the account limit, normalized handle, job lock, and cooldown, records the import generation, and enqueues an internal action in the existing scrape pool.
2. Use the installed `apify-client` to start the existing Actor with a single normalized username and optional paid add-ons disabled. The token stays in the backend environment and is never put in URLs or returned to the browser.
3. Disable automatic retries for the paid Actor-start action. Store the Apify run ID and schedule bounded polling, rather than sleeping or blocking the browser request. Retry a failed read/poll safely without starting another paid run.
4. Apply a configurable per-run total-charge ceiling, default USD 0.05. Pass it in the client's run options, not Actor input. Disable extra profile-information add-ons.
5. On `SUCCEEDED`, retrieve the run dataset, validate the requested profile and normalize the snapshot. Only write results if the account still exists and its job generation remains current.
6. Handle `FAILED`, `TIMED-OUT`, `ABORTED`, invalid output, missing token, and excessive polling duration explicitly. Bound the overall import to ten minutes and request remote abort when necessary.
7. On completion, clear the active job lock and set refresh eligibility. Creator settings are never overwritten by refresh results.

Anonymous public-page reads never call Apify. A repeated creator request during an active import returns the existing job instead of scheduling another run. Manual and scheduled requests use the same atomic job-lock and freshness checks so concurrent requests cannot create duplicate paid runs.

### Daily automatic refresh

Register a `cronJobs().interval` job in the existing `crons.ts` with `{ hours: 24 }`. The scheduled internal action paginates through saved accounts and requests imports through the same internal enqueue mutation used by manual refresh. The existing scrape pool controls execution concurrency; do not launch all Actor runs directly from the cron action.

Refresh visible and hidden accounts in published and draft kits so creators have current data when they choose to show an account or publish. Skip removed accounts and deleted creators. Before each paid Actor start, recheck account existence, active owner, job generation, and freshness so queued obsolete work is discarded. Successful refreshes replace only the scraped account snapshot and cached assets; they preserve creator-authored identity, account/metric visibility, rates, contacts, slug, and publication settings.

An account refreshed manually within the preceding 24 hours is skipped by that day's cron to avoid duplicate charges. This is a daily batch schedule, not a guarantee that every account is refreshed at an exact rolling 24-hour deadline; queue time and failed runs can make data older. Show the last successful update time instead of claiming real-time data.

If an account refresh fails, retain its previous successful snapshot and timestamp, record the safe error for the creator editor, and continue processing other accounts. The next daily sweep retries eligible failed accounts; creators can request a manual retry after the failure cooldown. Keep the configured charge ceiling on every scheduled Actor run as well as every manual run.

### Public projection

The anonymous query looks up only a published slug with an active owner, then constructs an explicit public DTO containing only visible accounts, permitted identity fields, each account's individually enabled metrics, individually enabled rates when the rates section is enabled, and individually enabled contact methods when the contact section is enabled. Recent-post likes, comments, and views follow their account's corresponding metric visibility switches; the recent-post switch controls the entire account's post gallery.

Do not return full database records, owner IDs, raw Actor output, run IDs, hidden contacts, or hidden metrics and rely on CSS to hide them. Compute the combined audience on the backend from eligible visible accounts. Its presence is controlled by its own explicit switch.

### Image durability

Cache the primary avatar and up to six displayed post thumbnails per account in Convex file storage during import so the public kit does not rely entirely on expiring Instagram CDN URLs. Restrict fetches to HTTPS Instagram/Facebook CDN hosts, cap file size and fetch duration, validate image content types, and tolerate failures with a stable avatar or thumbnail placeholder. Delete replaced cached files after the new snapshot is safely recorded only when neither the current account snapshot nor the kit's chosen identity photo references them.

## Integration and scope

- Add creator navigation in `CreatorLayout.tsx` and routes in `main.tsx`.
- Add dedicated creator editor, public page, shared media kit presentation, form helpers, and Convex media kit modules.
- Generate Convex API types using the project's tooling, preserving existing unrelated changes.
- Keep existing campaign scraping behavior intact; use the same Actor/provider through a dedicated authenticated media kit orchestration layer.
- First version supports Instagram with manual import and a daily automatic refresh cron. Other platforms, PDF export, historical graphs, account-ownership verification, custom domains, and template selection are later additions.
- Imported accounts are not labeled ownership-verified. Instagram's verified badge, when shown, refers to Instagram verification only.
- Set browser document title/description for the public route. Creator-specific server-rendered social preview cards are outside this SPA version.

## Validation and acceptance

- Verify handle parsing, duplicate-account prevention, limits, and metric calculations with representative missing/hidden-count data.
- Verify owner isolation, slug collisions, unpublished/deleted-owner behavior, and public projections for every visibility control, including recent-post counts. Include two accounts with different metric switches, hidden accounts excluded from audience totals, mixed visible/hidden rates, individually hidden contacts, and section/account switches retaining their child settings when toggled off and on.
- Verify stale jobs cannot restore removed accounts, duplicate refresh requests do not start duplicate paid runs, and failed refreshes preserve successful snapshots.
- Verify the daily cron paginates through eligible accounts, includes hidden accounts and draft kits, excludes deleted owners and removed accounts, skips active/fresh imports, and respects the existing queue concurrency. Check that a failure for one account does not stop the remaining batch and that cron refreshes preserve all creator-authored settings.
- Check editor import/loading/error states, save/publish/unpublish, copy link, rate/contact validation, and signed-out public pages at desktop and mobile widths.
- Run targeted TypeScript and frontend build checks and relevant backend tests. Report pre-existing failures separately.
- Use simulated Apify responses for routine checks. A live paid Actor run requires the session's first-run pricing estimate and user go-ahead, as required by the Apify quickstart; it is not necessary to publish the implementation for review.
- Deploying backend/frontend is a separate release step after the implementation is concrete and reviewable.

## Sources

- July reference: https://july.bio/kkk
- Apify quickstart: https://apify.com/agents.md
- Existing Actor and public-output contract: https://apify.com/apify/instagram-profile-scraper
- Actor input schema: https://apify.com/apify/instagram-profile-scraper/input-schema

## Implementation

Implemented in the creator-media-kit feature branch. See `docs/media-kit-verification.md` for automated checks and development release prerequisites.

## Approved follow-up: editor navigation and platform selection

The editor uses Profile, Accounts, Rates and Contact tabs, vertical on desktop
and horizontal on mobile. Save/Publish remain above the tabs and the live preview
stays alongside the editor. Unsaved state survives tab changes. Accounts opens
first for a new kit; existing kits open Profile.

Accounts has one Add account action that opens a HeroUI modal. Creators choose
Instagram or TikTok, then enter the corresponding username/profile URL. Submission
queues the appropriate Actor immediately. Existing accounts default to Instagram;
TikTok profile imports use the existing Clockworks Actor, the same spending cap,
remote concurrency leases and daily refresh flow. Visibility remains per account
and per metric. Manual Refresh data and the Import queued banner are removed at
the user's request. Primary buttons are black and secondary buttons use ghost.
