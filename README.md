╭────────────────────────╮ ╭────────────────────────╮ ╭────────╮
│ [Proto](../InterDeadProto) │ │ [Core](../InterDeadCore) │ │ IT │
╰────────────────────────╯ ╰────────────────────────╯ ╰════════╯

## Introduction

InterDeadIT is the entry point into the metaverse: a Hugo-powered landing that introduces the narrative, hosts playable mini-games, and bridges visitors into the identity and EFBD cores. It keeps content and UI controllers thin while delegating authentication, profile rendering, and scoring to the shared services.

## Installation

No local installation is required for players. For contributors, clone the repository and use the Hugo toolchain defined in `config/` and `themes/`. Dependency management follows the site’s Hugo modules plus the shared Prettier configuration described below.

## Usage Examples

- Home and profile pages subscribe to `AuthVisibilityService` from the shared ports to toggle CTAs, countdowns, and profile snapshots for authenticated and guest visitors.
- Shortcodes and controllers reference shared event buses so new sections can reuse the same auth visibility stream without duplicating session parsing.
- Content authors can add new localized pages under `content/` and `i18n/`, keeping BEM-friendly hooks in templates for JS controllers.

## Additional Notes

- Deployment flow: Hugo site builds from this repository, ships static assets to Cloudflare, and binds to a Worker that integrates D1 (for EFBD and identity persistence) alongside role bindings to the Core packages and Discord application callbacks.
- Prettier is included as a formatting tool to keep Markdown, templates, and scripts consistent with the core packages. Run `npm run format` or `npm run format:check` from this directory after installing dependencies.
- Architecture reminder: stay aligned with the hexagonal pattern used across the metaverse — keep adapters thin, reuse the shared event bus, and avoid leaking DOM specifics into domain logic.
- Cloudflare Workers auto-deploy only when files inside the workflow directory change; if you need to redeploy without workflow edits, run `npx wrangler deploy` from that workflow directory.
