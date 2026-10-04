# Lumina backend

Convex is the shared backend for the web app and the existing mobile app. Functions and schema live in `convex/`; authentication uses Better Auth. The backend also integrates Resend, Stripe, Billplz, R2, PostHog, and the existing processing components.

This is a Convex project. Running the Bun-generated `index.ts` file does not start its backend.

## Development

Install dependencies from the repository root:

```sh
bun install --frozen-lockfile
```

From `packages/backend`:

```sh
bunx convex dev
```

On first setup, select a development deployment using the CLI prompts. Keep this command running while developing: it watches functions, pushes development changes, and updates generated types. The selection is saved in `.env.local`.

The standard development flow uses a Convex cloud development deployment. To run the backend on your computer instead:

```sh
bunx convex deployment select local
bunx convex dev
```

Use the client and HTTP actions URLs printed by the selected deployment as `VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL` in `apps/web/.env.local`. Local, cloud development, and production deployments have separate data and settings.

## Deployment environment variables

Set backend variables on the selected Convex deployment with `bunx convex env set NAME 'value'`, or through its dashboard. For local web development:

```sh
bunx convex env set SITE_URL http://localhost:5173
```

Authentication needs the existing Better Auth secret and Google provider configuration. Keep `SITE_URL` aligned with the web origin and configure the Google OAuth callback for that deployment's HTTP actions URL. Convex provides `CONVEX_SITE_URL` for the backend; it is separate from the web origin.

Creator invitation settings:

| Variable | Purpose |
| --- | --- |
| `ADMIN_USER_IDS` | JSON array of allowed admin **email addresses**, despite the variable name |
| `RESEND_API_KEY` | Resend credential for this deployment |
| `RESEND_FROM_EMAIL` | Sender authorized by the Resend account |
| `RESEND_WEBHOOK_SECRET` | Signing secret for the `/webhooks/resend` endpoint |
| `INVITATION_EMAIL_TEST_MODE` | `true` restricts invitation email to Resend test addresses; false or unset permits real recipients |

Invitation management also requires the admin account's email to be verified. Existing financial, storage, analytics, and processing integrations need their own deployment settings when exercised; configuring invitations alone does not configure those services. Keep all service secrets out of Git and out of `VITE_*` frontend values.

## Test invitations

Follow [the invitation testing guide](../../docs/testing/creator-invitations.md) for a separate development deployment, admin access, real email-link acceptance, simulated delivery, webhook setup, and negative cases.

The signed Resend webhook is served at `<Convex HTTP actions URL>/webhooks/resend`. A local deployment needs a publicly reachable tunnel for Resend callbacks. Without the webhook, provider confirmations and later bounces cannot update admin history.

## Verify backend changes

From the repository root:

```sh
bun test
bun apps/web/node_modules/typescript/bin/tsc --noEmit -p packages/backend/convex/tsconfig.json
```

The web app imports the generated Convex API types. Keep `convex dev` running to regenerate them as functions change.

## Deploy the backend

From `packages/backend`:

```sh
bunx convex deploy
```

By default, this publishes to the project's production backend. A preview deployment key in CI targets its preview deployment instead. Configure the production deployment's environment variables first; dev settings and data do not carry over automatically. Review local backend changes before deploying.

The root `bun run deploy` command deploys only the website to Cloudflare. Release new backend functions with the web pages that call them, and build the production website using that backend's public URLs.

## Creator media kits

Creators edit `/creator/media-kit`; published kits are anonymous at `/kit/{slug}`.
The feature adds `media_kits`, `media_kit_accounts`, and `media_kit_imports` (see
`convex/mediaKitValidators.ts`). Public queries explicitly filter each account,
metric, contact, and rate before returning data. Combined followers can include
people following multiple accounts and are not a deduplicated audience count.
Engagement and averages use sampled recent public posts, not Instagram Insights.

The editor has Profile, Accounts, Rates and Contact tabs. Add account opens a
platform picker and queues import immediately after submission. Imports reuse
`APIFY_API_TOKEN` and the existing scrape Workpool: Instagram uses
`apify/instagram-profile-scraper`; TikTok uses `clockworks/tiktok-scraper` with a
profile username and at most 12 recent results. Stored platform is optional for
backward compatibility; existing accounts remain Instagram. New public snapshots
include platform-specific links and icons. TikTok slideshows are excluded from
video-only view averages. Set `MEDIA_KIT_MAX_CHARGE_USD` to override the default **USD 0.05
per Actor run** (allowed range: greater than zero, at most USD 1). Paid starts never
automatically retry. An atomic backend lease limits active remote imports to three;
runs expire after ten minutes. Successful refresh cooldown is 24 hours; failed
refresh cooldown is ten minutes. Last successful data remains available on failure.

A Convex interval runs every 24 hours and paginates saved accounts, including
hidden accounts and drafts. It skips fresh data, current imports, and deleted
owners. Scraped snapshots never overwrite saved rates, contacts, visibility,
publication, or edited identity. Avatars and up to six thumbnails are cached from
allowlisted Instagram and TikTok CDNs; previous assets are removed on replacement/removal.

Release backend/schema and web together. Configure the token on the target Convex
deployment before enabling the feature. Deploying the backend activates recurring
paid scraping for eligible saved accounts. This PR does not deploy or run a paid
Actor. Regenerate API declarations using `convex codegen` on a configured development
deployment; the isolated checkout has no `CONVEX_DEPLOYMENT`.

Verification: `bun test packages/backend/tests`, backend TypeScript, web TypeScript,
and `bun --bun run --cwd apps/web build`. Mocked tests never use live Apify data.

Past partnerships are manually authored in the Partnerships tab (up to ten).
Each entry has a brand name, short description, optional HTTPS link and visibility
switch; the section also has its own switch. Only enabled entries in an enabled
section reach the public query. These fields are optional on existing kits;
older editors omitting them preserve stored partnerships. Account imports never
replace partnerships. Removing an entry requires confirmation and Save changes.
