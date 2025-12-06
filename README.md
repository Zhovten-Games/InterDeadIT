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
- D1 persistence relies on a unified `profiles` table: `profile_id TEXT PRIMARY KEY`, `data TEXT NOT NULL` (JSON identity payload plus guard metadata like `completedGames`), `last_cleanup_at TEXT`, `last_cleanup_timezone TEXT`, and `delete_count INTEGER DEFAULT 0`.

## Window API (modal lifecycle)

- `ModalService` owns modal registration and coordinates open/close flows. It accepts a `ModalInstance` when you call `register({ entity, view })` and keeps the latest active modal plus a resume stack when one modal temporarily replaces another.
- Each `ModalInstance` couples a `ModalEntity` with a UI adapter implementing `ModalViewPort`. `open()` will delegate to the view and wire overlay clicks to `ModalService.close(id)` when `closeOnOverlay` is set on the entity; `close()` remembers dismissals in the injected storage adapter when `remember: true` is passed.
- The service exposes `open(id, { resume })` to switch focus, optionally suspending the previous modal in a stack so `resume` flows can restore it, and `close(id, { remember })` to unlock scroll and replay the stack. The internal `_resumePrevious` helper automatically reopens the last suspended modal after a close, while `autoShow(predicate)` picks modals whose entities allow auto-open.
- The default `ModalView` toggles the `gm-modal--open` class and `aria-hidden` flag, handles overlay clicks when provided, and prevents double-open operations. It keeps the current state in `isOpen` so `ModalInstance.close()` can return true even if the adapter already transitioned.

## Slider API

- `SliderService` coordinates slide collections and the UI adapter that implements `SliderViewPort`. `init()` normalizes the ordered `SliderCollection`, renders slides through the view mapper, binds navigation/swipe callbacks, hydrates scoreboard templates, and sets the initial transform/dots before syncing fade timers.
- `SliderCollection` wraps raw slide inputs into `SlideEntity` items, exposes `sortByMediums()` and `normalizeMediums()` to ensure every slide has a numeric medium count, and provides helper getters such as `get(index)` and `getDisplayCount()` to surface `+N` overlays.
- Implementations of `SliderViewPort` are responsible for DOM binding: `prepareSlides` appends mapped elements, `renderDots` wires navigation dots, `bindNavigation` and `bindSwipe` connect gestures, while `setTransform` moves the track with percentage offsets. Scoreboard helpers (`getScoreboardBaseText`, `updateScoreboard`, `syncFade`) keep the count/announcement text in sync and fade it on inactivity.
- To drive the widget, construct a `SliderService` with a prepared collection and a `SliderView` instance (which already implements pointer tracking, fade timers, and scoreboard animation) and call `init()` once the DOM is ready.

## Asset fingerprinting examples

- Header and hero assets use Hugo Pipes directly. The header logo resolves via `resources.Get "images/logo_png.png" | fingerprint`, passing the resulting `RelPermalink` and `Data.Integrity` into the `<img>` element so browsers can cache-bust and verify the content hash automatically.
- Favicons and manifests follow the same pattern in `head.html`, keeping Hugo-managed fingerprints in link tags. When a page provides `.Params.image` Hugo uses that value as-is; otherwise the logo fingerprint becomes the fallback `og:image`/`twitter:image`, avoiding the deprecated `utils/image-asset.html` helper.
- The same fingerprinting pipeline powers hashed CSS/JS bundles elsewhere in the theme: Hugo Pipes emits cache-safe URLs while templates simply read the `RelPermalink` or `Permalink` from the processed resource.

## Mini-game integration (planning notes)

- Mini-games live in dedicated subfolders within a new `mini-games/` directory, one folder per game, holding its Hugo shortcode plus scoped CSS/JS assets that load only when the shortcode is rendered.
- Shortcodes must perform the shared authorization check before rendering; unauthenticated visitors see the same alternative content block used by the mini-profile guest view, reusing existing locale keys.
- Each game must be fully localized and rely on the currently active locale for its UI strings and EFBD-scale option labels.
- Assets load lazily per game rather than through the global stylesheet; Hugo should inject the game’s CSS/JS only when the shortcode appears on a page.
- EFBD-scale interactions must call the standardized trigger/write flow used for Cloudflare/D1 so poll submissions remain consistent across games; document any payload shape in the corresponding game folder.
- Place the first mini-game shortcode immediately after the text of the first blog post to validate the pipeline.

## Mini-game infrastructure

- Mini-games live under `themes/InterDead/assets/mini-games/<game>` with scoped CSS/JS and a matching shortcode template in `themes/InterDead/layouts/shortcodes/mini-games/`. Assets load lazily per shortcode instance instead of the global bundle.
- Place the shortcode after the prose body where the game should appear (for the first poll: `{{< efbd-poll >}}` appended to the initial blog post across all locales).
- Authorization is enforced through the shared `InterdeadPorts.authVisibility` snapshot; unauthenticated visitors see the existing `profile.unauthenticated` fallback and no game assets or markup initialize for them.
- Localization uses the current locale’s i18n keys for prompts and the `profile.efbd.axes.*` labels so every poll option mirrors the EFBD scale naming.
- EFBD trigger writes flow through the `IEfbdScaleWritePort` contract, implemented by `EfbdScaleTriggerPort` which forwards normalized payloads to `window.InterdeadPorts.emitScaleTrigger` (Cloudflare trigger adapter). A `interdead:ports-ready` event fires when ports are available so lazy mini-games can bind safely.
