---
domains: []
emits: []
implements: []
imports: []
listens: []
owns: []
schemaVersion: 1
source: InterDeadIT/themes/InterDead/assets/mini-games/efbd-poll/poll.js
used_by: []
source_exists: true
runtime_role: efbd_poll_widget
contour_primary: BG-SELECT
contour_secondary: none
role_group: executive_control
narrative_role: 'poll choice and submission flow runtime'
---

# EFBD poll mini-game

The EFBD poll is the canonical mini-game implementation and the reference for new mini-games.

## Shortcode location

- `themes/InterDead/layouts/shortcodes/efbd-poll.html`
- `themes/InterDead/layouts/shortcodes/efbd-poll-2.html`

Both presets call `themes/InterDead/layouts/partials/mini-games/efbd-poll.html`. This shared renderer fingerprints CSS and JS, injects one mini-game runtime per page, and queues configuration into `window.InterdeadMiniGamesQueue`. It serializes the complete configuration once with HTML-safe JSON and emits that object as a JavaScript expression. Arrays and dictionaries retain their types; IDs, locale codes and asset URLs remain ordinary strings.

## Assets

- `themes/InterDead/assets/mini-games/efbd-poll/styles.css`
- `themes/InterDead/assets/mini-games/efbd-poll/poll.js`
- `themes/InterDead/assets/images/blog/ARTIFACT-THE_TOWER.webp`
- `themes/InterDead/assets/images/blog/ARTIFACT-THE_LULLABY/*.webp`

## Configuration payload

The shortcode sends:

- `assets`: URLs + integrity hashes for CSS/JS.
- `options`: EFBD axis options (axis code, label, `i18nKey`).
- `strings`: localized strings for submit, success, completed, profile link label, error, and required messages.
- `strings.title` and `strings.prompt` are optional; when omitted or empty they are not rendered.
- `media.images`: ordered list of image URLs for the poll media frame.
- `locale`: current Hugo locale.

The poll uses `strings.profileLink` to build the mini-profile link in completion notifications. The link is not rendered when `strings.profileLink` is empty, so always provide it when initializing the poll. A safe default is:

```js
profileLink: 'Open mini-profile';
```

Ensure that the page body includes `data-profile-url` (defaults to `/profile/` when missing).

## Media behavior

Video embedding is fully removed from EFBD poll media.

The header media now supports image-only rendering:

1. **One image**: rendered as a static image (`gm-poll__map-image`) exactly like the original first poll behavior.
2. **More than one image**: rendered as a `gm-slider` carousel with navigation arrows and bottom dots.

`poll.js` reuses the existing homepage slider stack (`SliderController` + `SliderService` + `SliderView`) to keep one navigation and swipe implementation across the site.

`efbd-poll-2` now resolves all images from `themes/InterDead/assets/images/blog/ARTIFACT-THE_LULLABY/` and sends them as `media.images`.

## Payload shape for EFBD writes

The poll calls `scalePort.recordAnswer` with the following payload:

```json
{
  "axis": "EBF-SOCIAL",
  "value": 1,
  "context": {
    "source": "1-efbd-poll",
    "answerKey": "EBF-SOCIAL",
    "locale": "en",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

The `recordAnswer` call resolves to a status object so the UI can show success or error feedback.

## Multiple poll instances

Use shortcode parameters to deploy independent polls with isolated replay guards:

```md
{{< efbd-poll gameId="1-efbd-poll" >}}
{{< efbd-poll-2 gameId="2-efbd-poll" >}}
```

- `gameId` is forwarded to EFBD trigger `context.source` and used by the replay guard. Every translation of a poll uses the same ID. `context.locale` records the display language; completion is shared across languages.

Local completion uses the existing origin-wide `PollProfile` storage key and canonical poll registry. The CF Worker uses that registry to validate poll IDs and options, accepts matching top-level or nested source fields, and rejects conflicting or unknown IDs. Previously JSON-quoted IDs in saved CF completion records resolve to their canonical IDs, preserving their replay guards.

Authenticated EFBD summaries include `completedGames`. The browser loads this state when the authenticated profile becomes available and shares it with the poll write port. Completed polls disable their controls on translated pages as well. Changing accounts clears the browser's remote completion cache and invalidates pending responses from the previous account.

The launcher shares one in-flight initialization per registered root, replaces its auth subscription when ports refresh, and preserves the current access state while assets load. The form allows one pending submission, restores submission after a rejected write, and checks completion before forwarding another answer.

Regression coverage is part of `tests/authorization.test.cjs` through `tests/mini-games-regression.test.cjs`. It builds real Hugo pages in public and authenticated modes, exercises both published polls in all supported locales, and runs the production CF Worker and Core adapters against an isolated SQLite database. Run it with the pinned Hugo binary available and locked dependencies installed:

```sh
node --experimental-vm-modules --test tests/authorization.test.cjs
```

`efbd-poll` and `efbd-poll-2` presets intentionally leave `title` and `prompt` empty while preserving support for those fields in the shared poll renderer. `efbd-poll-2` keeps a separate `gameId` (`2-efbd-poll`) and the MIND/SOCIAL/ABANDON axes.
