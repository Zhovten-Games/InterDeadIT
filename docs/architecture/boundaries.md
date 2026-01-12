# Boundaries: InterDeadIT vs Core

InterDeadIT is responsible for the public-facing web experience. Core packages (InterDeadCore and shared libraries) supply identity, EFBD scale logic, and persistence workflows. Keep the boundary clean so the site stays a thin adapter and the core remains the source of truth for domain rules.

## InterDeadIT owns

- Hugo content, layouts, and shortcodes (`content/`, `themes/InterDead/layouts/`).
- UI controllers and DOM adapters (`themes/InterDead/assets/js/presentation/`, `themes/InterDead/assets/js/infrastructure/`).
- Site configuration, localization, and feature flags (`config/_default/config.toml`, `i18n/`).
- Wiring ports and exposing runtime configuration to the browser (`themes/InterDead/layouts/partials/head.html`, `themes/InterDead/assets/js/app.js`).

## Core owns

- Identity workflow (OAuth, profile canonicalization, session semantics).
- EFBD scale logic and validation.
- Persistence rules, guardrails, and cleanup policies.

## Practical rules of thumb

1. If a change requires a new domain rule, it belongs in Core.
2. If a change is purely about rendering or UI state, it belongs in InterDeadIT.
3. When in doubt, add a port contract and let Core provide the implementation so InterDeadIT stays lightweight.
