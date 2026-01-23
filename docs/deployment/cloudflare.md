# Cloudflare configuration

## Worker location

The auth + EFBD Worker lives in `workers/interdead-auth/`. Its entry point and Cloudflare bindings are defined in `wrangler.toml`.

## Required bindings and variables

The Worker expects the following bindings and environment variables to be configured in Cloudflare:

- `INTERDEAD_CORE`: D1 binding to the shared `interdead_core` database.
- `IDENTITY_KV`: KV binding for EFBD trigger logs and session state (when enabled).
- `IDENTITY_DISCORD_CLIENT_ID`, `IDENTITY_DISCORD_CLIENT_SECRET`, `IDENTITY_DISCORD_REDIRECT_URI`: Discord OAuth credentials.
- `IDENTITY_JWT_SECRET`: Secret used to sign OAuth state and session cookies.
- `EFBD_API_BASE`: Optional override if EFBD is hosted elsewhere.

## Wrangler highlights

- `name`: `interdead-auth`
- `main`: `src/worker.js`
- `routes`: custom domain route for `api.interdead.phantom-draft.com`
- `d1_databases`: binds `INTERDEAD_CORE` to the shared `interdead_core` database

Secrets such as `IDENTITY_DISCORD_CLIENT_SECRET` are set in Cloudflare, not in the repo.

## Deploy command

Run deployments from the Worker directory:

```bash
npx wrangler deploy --config wrangler.toml
```

## Runtime configuration

The Hugo site provides API base URL defaults in `config/_default/config.toml`, which are selected at runtime in `themes/InterDead/layouts/partials/head.html` and exposed as `window.__INTERDEAD_CONFIG__`. This is how the frontend knows where the Worker lives per environment.
