# Emoji protocol shortcode

The `emoji-protocol` shortcode renders a six-line protocol block with fixed labels and emoji values. It reuses the same visual convention as InterDeadProto protocol rows: labels on the left, values on the right.

## Template location

- `themes/InterDead/layouts/shortcodes/emoji-protocol.html`

## Parameters

- `mode`
- `intent`
- `target`
- `range`
- `policy`
- `output`

Each parameter should contain the emoji payload (or short token + emoji) for its line.

## Example

```md
{{< emoji-protocol mode="🎭E" intent="🚫🛑" target="👤" range="🧊🧯" policy="🚫🧯" output="🧯" > }}
```

## Notes

- Labels are localized through `i18n` keys `emojiProtocol.*`.
- Styling is defined in `themes/InterDead/assets/css/styles.css` under `.gm-emojiProtocol*` classes.
