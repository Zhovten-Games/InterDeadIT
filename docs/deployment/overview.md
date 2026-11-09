# Deployment overview

InterDeadIT ships as a static Hugo site with a Cloudflare Worker for auth and EFBD triggers. The main flow:

1. Hugo builds the static site from `content/`, `themes/InterDead/`, and `config/_default/config.toml`.
2. Static assets are served by Cloudflare Pages.
3. The `interdead-auth` Worker handles Discord OAuth and EFBD write endpoints, and talks to D1 for persistence.
4. The frontend loads API configuration from Hugo params and injects them into `window.__INTERDEAD_CONFIG__`.

Keep the HTML/JS bundle free of secrets: all credentials stay inside the Worker configuration.

## 2026-11-07 canonical deployment configuration

Cloudflare Pages uses `npm run check && node tools/build-site.mjs` (output `public`). `config/endpoints.json` supplies the site/API/Proto defaults. HUGO_BASEURL, HUGO_INTERDEAD_API_BASE_URL and HUGO_INTERDEAD_PROTO_URL may override them. HUGO_INTERDEAD_AUTH_ENABLED=false is the shared public mode; true restores identity UI and session requests. Local auth overlay with a key uses this same flag and a diagnostic session.
