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
