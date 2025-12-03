# InterDead Auth + EFBD Worker

A dedicated Cloudflare Worker for Discord OAuth hand-off and EFBD trigger ingestion. It keeps secrets server-side and talks to the shared `interdead_core` D1 database through the `INTERDEAD_CORE` binding.

## Endpoints

- `GET /auth/discord/start` – builds the Discord OAuth URL from `IDENTITY_DISCORD_CLIENT_ID`, `IDENTITY_DISCORD_CLIENT_SECRET`, and `IDENTITY_DISCORD_REDIRECT_URI`, then redirects to Discord.
- `GET /auth/discord/callback` – exchanges the OAuth code, persists the profile via `@interdead/identity-core`, and issues a session token (placeholder JWT handling shown).
- `POST /efbd/trigger` – forwards EFBD triggers to `@interdead/efbd-scale` using the configured API adapter and writes snapshots to D1.

## Environment

- `INTERDEAD_CORE`: D1 binding to the shared `interdead_core` database.
- `IDENTITY_DISCORD_CLIENT_ID`, `IDENTITY_DISCORD_CLIENT_SECRET`, `IDENTITY_DISCORD_REDIRECT_URI`: Discord OAuth credentials per environment.
- `IDENTITY_JWT_SECRET`: Secret used to sign OAuth state and session cookies.
- `EFBD_API_BASE`: Optional override for EFBD upstream if not co-located.

## Session and state handling

- The `/auth/discord/start` route issues a signed `discord_oauth_state` cookie (10-minute lifetime) and redirects to Discord with
  the same state token.
- `/auth/discord/callback` validates the state from both the query and cookie, exchanges the code for a Discord access token,
  persists the profile in `profiles`, and returns a signed `interdead_session` cookie.

Deploy the Worker from this folder (`workers/interdead-auth/`) to avoid leaking credentials into the frontend bundle. The Hugo site reads the Worker base URL from `params.api.*` and exposes it via `window.__INTERDEAD_CONFIG__`.
