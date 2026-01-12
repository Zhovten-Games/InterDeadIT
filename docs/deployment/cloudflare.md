# Cloudflare configuration

## Worker location

The auth + EFBD Worker lives in `workers/interdead-auth/`. Its entry point and Cloudflare bindings are defined in `wrangler.toml`.

## Wrangler highlights

- `name`: `interdead-auth`
- `main`: `src/worker.js`
- `routes`: custom domain route for `api.interdead.phantom-draft.com`
- `d1_databases`: binds `INTERDEAD_CORE` to the shared `interdead_core` database

Secrets such as `IDENTITY_DISCORD_CLIENT_SECRET` are set in Cloudflare, not in the repo.

## Runtime configuration

The Hugo site provides API base URL defaults in `config/_default/config.toml`, which are selected at runtime in `themes/InterDead/layouts/partials/head.html` and exposed as `window.__INTERDEAD_CONFIG__`. This is how the frontend knows where the Worker lives per environment.
