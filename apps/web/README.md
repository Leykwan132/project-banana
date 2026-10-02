# React + TypeScript + Vite

The web app lives directly in `apps/web`. Set the hosting build root to
`apps/web` and the build output directory to `dist`.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is currently not compatible with SWC. See [this issue](https://github.com/vitejs/vite-plugin-react/issues/428) for tracking the progress.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Deploy with Wrangler

Run `bun run deploy` from the repository root or `apps/web`. The command builds
with Vite and deploys `dist` to the Cloudflare Worker named `lumina-web`.
The Worker serves this React app with single-page application fallback routing.
Existing dashboard variables are preserved during deployment.

The script runs Vite and Wrangler with Bun. Install dependencies from the
repository root with `bun install --frozen-lockfile`. If running Wrangler directly
with Node.js instead, use Node.js 22 or newer. Authenticate once with `bunx wrangler login`
from `apps/web`, or provide `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in CI.
Vite's `VITE_*` settings must be present during the build; Worker variables do not
replace values compiled into the frontend.

Validate without publishing using `bun run deploy --dry-run`.
This command deploys the web app only; the Convex backend has its own release flow.

Reference: [Cloudflare static assets](https://developers.cloudflare.com/workers/static-assets/).

### Cloudflare Workers Builds

Wrangler configuration lives at the repository root (`wrangler.jsonc`) and
points to `apps/web/dist`. The web deploy script references it explicitly, so
running from either the repository root or `apps/web` works.

For Cloudflare's hosted build settings, use:

- Root directory: `apps/web`
- Build command: `bun --bun run build`
- Deploy command: `bunx --bun wrangler deploy --config ../../wrangler.jsonc --keep-vars`
- Preview/version-upload command: `bunx --bun wrangler versions upload --config ../../wrangler.jsonc`

Ensure the configured deployment branch contains these changes. Build-time
`VITE_*` settings must be configured in Cloudflare because ignored `.env.local`
files are not in the repository.
