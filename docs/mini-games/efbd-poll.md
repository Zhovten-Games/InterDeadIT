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
- `strings`: localized strings for title, prompt, submit, success, error, and required messages.
- `locale`: current Hugo locale.

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
