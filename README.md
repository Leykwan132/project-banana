# Lumina

Lumina connects businesses with creators through paid content campaigns. This repository, `project-banana`, contains the web app and its shared Convex backend.

Web is the primary product. Mobile development is on hold, and the Expo app remains in the repository for reference.

## Repository layout

| Path | Purpose |
| --- | --- |
| `apps/web` | React, TypeScript, and Vite website for businesses, creators, and admins |
| `packages/backend` | Convex functions, schema, Better Auth, and service integrations |
| `apps/mobile/project-banana-rn` | Existing Expo app; currently on hold and outside the root Bun workspaces |
| `docs/testing` | Development testing guides |
| `wrangler.jsonc` | Cloudflare Worker configuration for the web app |

The web app lives directly in `apps/web`; there is no nested `project-banana-web` directory.

## Current web access

- Businesses use `/business/login` and the existing business dashboard.
- Existing active creators use `/creator/login` and can browse campaigns and campaign briefs.
- New creators require an admin invitation. Admins manage invitation emails, resends, and revocations at `/admin/invitations`.
- Businesses and creators share Better Auth accounts. Access comes from the records attached to that authenticated account; an account can have both workspaces.

The remaining creator submission, analytics, bank-account, and withdrawal pages have not yet been migrated to web. Their existing backend methods remain available for the migration.

## Local development

Use Bun to install dependencies and run the scripts. The documented Bun runtime commands also avoid relying on an older system Node.js for Vite or Wrangler.

Install dependencies from the repository root:

```sh
bun install --frozen-lockfile
```

Start Convex in one terminal:

```sh
cd packages/backend
bunx convex dev
```

On first setup, follow the CLI prompts to select a development deployment. `convex dev` watches and updates the selected development backend; it does not necessarily run the database on your computer. For an actual local backend, see the [backend setup guide](packages/backend/README.md).

Copy the web environment example and configure its public URLs and other required settings:

```sh
cp apps/web/.env.example apps/web/.env.local
```

Set `VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL` to the URLs for the same backend deployment. Configure the backend's `SITE_URL` to match the website origin, normally `http://localhost:5173`. Backend authentication and email settings are described in the [backend README](packages/backend/README.md).

Start the website in another terminal:

```sh
cd apps/web
bun --bun run dev --port 5173
```

Open [localhost:5173](http://localhost:5173). Environment files and credentials stay out of Git. All `VITE_*` values are public frontend settings; keep service secrets in the Convex deployment.

## Test creator invitations

Use a separate Convex development deployment. The [creator invitation testing guide](docs/testing/creator-invitations.md) covers admin configuration, real-inbox acceptance, delivery simulation, resend/revoke/expiry checks, and the signed Resend webhook.

`INVITATION_EMAIL_TEST_MODE=true` restricts invitation email to Resend's simulated test addresses. With the flag false or unset and valid Resend credentials, a development deployment can send real invitation emails. Simulated addresses do not replace testing the magic link with an inbox you control.

## Checks and builds

Run from the repository root:

```sh
bun test
bun apps/web/node_modules/typescript/bin/tsc --noEmit -p packages/backend/convex/tsconfig.json
bun apps/web/node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.app.json
bun --bun run --cwd apps/web build
```

The explicit app TypeScript command checks the application project. Its current unused-variable diagnostics include pre-existing backend issues; `--noUnusedLocals false --noUnusedParameters false` checks types without those diagnostics. Build output is `apps/web/dist`.

## Deployment

The website deploys as static assets to the Cloudflare Worker `lumina-web`:

```sh
bun run deploy --dry-run
bun run deploy
```

Install dependencies first, configure the build-time `VITE_*` settings, and authenticate Wrangler before deploying. The root `wrangler.jsonc` points to `apps/web/dist` and enables single-page application fallback. See the [web deployment guide](apps/web/README.md) for authentication and Cloudflare Workers Builds settings.

Convex is released separately with `bunx convex deploy` from `packages/backend`. Frontend changes that depend on new backend functions must be released with those functions. Deployment environment variables and development data do not automatically carry into production.
