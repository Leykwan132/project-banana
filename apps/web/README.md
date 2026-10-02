# Lumina web

React, TypeScript, and Vite app for the business, creator, and admin website. The app lives directly in `apps/web` and uses the shared backend in `packages/backend`.

## Run locally

Install dependencies from the repository root:

```sh
bun install --frozen-lockfile
cp apps/web/.env.example apps/web/.env.local
```

Configure the values in `.env.local`, including:

- `VITE_CONVEX_URL`: the selected Convex deployment's client URL.
- `VITE_CONVEX_SITE_URL`: the same deployment's HTTP actions URL, used by Better Auth.
- `VITE_PUBLIC_POSTHOG_KEY` and `VITE_PUBLIC_POSTHOG_HOST`: frontend analytics settings.
- `VITE_ADMIN_CODE`: the existing admin portal unlock code when using admin pages.

All `VITE_*` values are compiled into public frontend code. The admin unlock code is a UI gate; backend admin authorization uses the Convex email allowlist. Never put backend API secrets in these values.

Start the [Convex backend](../../packages/backend/README.md) in a separate terminal, then run from `apps/web`:

```sh
bun --bun run dev --port 5173
```

Use the same origin in the backend's `SITE_URL`, and restart Vite after changing environment values.

## Workspaces and invitations

Business login is `/business/login`; creator login is `/creator/login`. Both use the shared Better Auth account system and membership attached to the authenticated account.

Existing active creators can browse campaigns and campaign briefs. New creators join through magic-link invitations managed at `/admin/invitations`. The remaining creator submission, analytics, bank-account, and withdrawal pages still need to move to web.

See the [creator invitation testing guide](../../docs/testing/creator-invitations.md) for development configuration, real-inbox acceptance, simulated email delivery, and revoked/expired link checks. Frontend and backend must be released together.

## Build and check

From `apps/web`:

```sh
bun --bun run build
bun --bun run preview
bun run lint
bun node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json
```

Install dependencies from the root before building. Build output is `dist`. The existing `check-types` script runs the root TypeScript configuration; use the explicit app configuration above to check application code. Pre-existing unused-variable diagnostics in imported backend files can be excluded with `--noUnusedLocals false --noUnusedParameters false`.

## Deploy with Wrangler

From the repository root or `apps/web`:

```sh
bun run deploy --dry-run
bun run deploy
```

The script builds with Vite and deploys the static assets to the Cloudflare Worker `lumina-web`. Configuration lives at the repository root in `wrangler.jsonc`, points to `apps/web/dist`, and enables single-page application fallback. Existing Worker variables are preserved by `--keep-vars`.

The script runs Vite and Wrangler with Bun. To authenticate interactively, run from `apps/web`:

```sh
bunx --bun wrangler login
```

In CI, supply `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. If invoking Wrangler with Node.js directly, use Node.js 22 or newer.

Vite's `VITE_*` settings must exist during the build. Worker runtime variables do not replace values already compiled into the frontend. This command releases the web app only; [Convex has a separate deployment flow](../../packages/backend/README.md#deploy-the-backend).

### Cloudflare Workers Builds

Use these hosted build settings:

| Setting | Value |
| --- | --- |
| Root directory | `apps/web` |
| Build command | `bun install --cwd ../.. --frozen-lockfile && bun --bun run build` |
| Deploy command | `bunx --bun wrangler deploy --config ../../wrangler.jsonc --keep-vars` |
| Preview/version-upload command | `bunx --bun wrangler versions upload --config ../../wrangler.jsonc` |

The build command installs the full monorepo from the committed Bun lockfile, including when automatic dependency installation is disabled. Ensure Bun is available in the build environment, the configured branch contains the deployment files, and the `VITE_*` build variables are set in Cloudflare; ignored `.env.local` files are not uploaded.

Reference: [Cloudflare static assets](https://developers.cloudflare.com/workers/static-assets/).
