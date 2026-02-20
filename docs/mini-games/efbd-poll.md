# EFBD poll mini-game

The EFBD poll is the canonical mini-game implementation and the reference for new mini-games.

## Shortcode location

- `themes/InterDead/layouts/shortcodes/efbd-poll.html`
- `themes/InterDead/layouts/shortcodes/efbd-poll-2.html`

The shortcode fingerprints its CSS and JS, injects the mini-game runtime, and queues configuration into `window.InterdeadMiniGamesQueue`.

## Assets

- `themes/InterDead/assets/mini-games/efbd-poll/styles.css`
- `themes/InterDead/assets/mini-games/efbd-poll/poll.js`
- `themes/InterDead/assets/images/blog/ARTIFACT-THE_TOWER.webp`
- `themes/InterDead/assets/images/blog/ARTIFACT-THE_LULLABY/*.webp`

## Configuration payload

The shortcode sends:

- `assets`: URLs + integrity hashes for CSS/JS.
- `options`: EFBD axis options (axis code, label, `i18nKey`).
- `strings`: localized strings for title, prompt, submit, success, completed, profile link label, error, and required messages.
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

- `gameId` is forwarded to EFBD trigger `context.source` and used by the replay guard.

`efbd-poll-2` is a dedicated second poll preset that keeps the same mechanics but uses a separate `gameId` (`2-efbd-poll`) and the MIND/SOCIAL/ABANDON axes.
