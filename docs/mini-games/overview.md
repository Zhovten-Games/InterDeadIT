# Mini-games overview

Mini-games are Hugo shortcodes backed by scoped assets. Each game is responsible for its own UI while relying on shared ports for auth visibility and EFBD scale writes.

## Canonical structure

- **Shortcode templates:** `themes/InterDead/layouts/shortcodes/mini-games/` or root shortcodes such as `themes/InterDead/layouts/shortcodes/efbd-poll.html`.
- **Assets:** `themes/InterDead/assets/mini-games/<game>/` for CSS, JS, and media.
- **Runtime loader:** `themes/InterDead/assets/js/application/minigame/runtime.js` handles asset injection and port wiring.

## Runtime flow

1. The shortcode injects fingerprinted assets and pushes a config object into `window.InterdeadMiniGamesQueue`.
2. The runtime registers each queued game and resolves ports (`authVisibility`, `emitScaleTrigger`).
3. When `interdead:ports-ready` fires, the runtime refreshes port references and rebinds auth checks.

## Auth and visibility

Mini-games must defer rendering until the auth visibility port reports an authenticated state. Unauthenticated visitors should see a fallback block that reuses existing localization keys.

## EFBD triggers

Mini-games should write EFBD answers through the scale write port so the Worker can normalize and persist the data. Do not call network endpoints directly from mini-game code; keep the write path centralized.
