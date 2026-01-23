# EFBD poll mini-game

The EFBD poll is the canonical mini-game implementation and the reference for new mini-games.

## Shortcode location

- `themes/InterDead/layouts/shortcodes/efbd-poll.html`

The shortcode fingerprints its CSS and JS, injects the mini-game runtime, and queues configuration into `window.InterdeadMiniGamesQueue`.

## Assets

- `themes/InterDead/assets/mini-games/efbd-poll/styles.css`
- `themes/InterDead/assets/mini-games/efbd-poll/poll.js`
- `themes/InterDead/assets/mini-games/efbd-poll/The-Tower.webp`

## Configuration payload

The shortcode sends:

- `assets`: URLs + integrity hashes for CSS/JS.
- `options`: EFBD axis options (axis code, label, `i18nKey`).
- `strings`: localized strings for title, prompt, submit, success, completed, profile link label, error, and required messages.
- `locale`: current Hugo locale.

The poll uses `strings.profileLink` to build the mini-profile link in completion notifications. The link is not rendered when `strings.profileLink` is empty, so always provide it when initializing the poll. A safe default is:

```js
profileLink: "Open mini-profile"
```

Add a short note in `poll.js` near `buildProfileMessage` to emphasize the dependency on `strings.profileLink` if you adjust the mini-game runtime.

Ensure that the page body includes `data-profile-url` (defaults to `/profile/` when missing).

The current `{ text, link }` structure supports additional contextual actions (journal, history, scale profile) without changing the renderer.

## Payload shape for EFBD writes

The poll calls `scalePort.recordAnswer` with the following payload:

```json
{
  "axis": "EBF-SOCIAL",
  "value": 1,
  "context": {
    "source": "efbd-poll",
    "answerKey": "EBF-SOCIAL",
    "locale": "en",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

The `recordAnswer` call resolves to a status object so the UI can show success or error feedback.
