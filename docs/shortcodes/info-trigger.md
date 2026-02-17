# Info trigger shortcode

The `info-trigger` shortcode renders a small button that opens the info panel modal. It supports two content sources:

1. **Inline body content** (preferred for short notes and localized footnotes).
2. **Remote content** (via `source` + `selector`) for pulling a fragment from another page.

## Template location

- `themes/InterDead/layouts/shortcodes/info-trigger.html`

## Parameters

- `icon` (optional): character displayed inside the trigger button. Defaults to `?`.
- `label` / `labelKey` (optional): accessible label for the trigger button.
- `title` / `titleKey` (optional): title for the info panel modal.
- `source` (optional): URL to load content from (used with `selector`).
- `selector` (optional): CSS selector inside the `source` page to extract.
- `format` (optional): content format override for the panel (defaults to `html`).
- `modal` (optional): modal id to open instead of the default info panel.
- `resume` (optional): `true` to restore the previous modal after closing the info panel.

## Inline content example

```md
{{< info-trigger icon="?" >}}
[Niro](https://interdead.fandom.com/wiki/Niro) – is an in-system support assistant in the messenger, instantiated after Incident NERO-01 on the basis of an emergency capture of a partial moment snapshot.
{{< /info-trigger >}}
```

Inline content is rendered through Markdown, so links and emphasis are allowed. Always keep the text in localization files and inject it through the shortcode body when you need a translated footnote.

## Remote content example

```md
{{< info-trigger
  titleKey="mediums.typology.title"
  labelKey="mediums.typology.openLabel"
  source="/blog/medium-typology/"
  selector=".gm-mediumsTypologyContent"
  icon="?"
/>}}
```

This mode relies on the info panel service and the `InfoContentAdapter` to fetch and extract content. Ensure the target page is stable and the selector remains valid.
