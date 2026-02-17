# Tabs shortcode

The `tabs` shortcode renders progressive-enhancement tabs for long article fragments (for example, multilingual lullaby archives).

## Shortcode location

- `themes/InterDead/layouts/shortcodes/tabs.html`
- `themes/InterDead/assets/js/presentation/controllers/TabsController.js`

## Usage

```md
{{< tabs >}}
[[tab id="motherless" label="Sometimes I Feel Like a Motherless Child"]]
Tab content in Markdown.
[[/tab]]

[[tab id="mexico" label="Canción de cuna para dormir a un niño"]]
Any block-level Markdown, including tables.
[[/tab]]
{{< /tabs >}}
```

## Notes

- Do not use nested shortcodes inside `tabs`.
- Each tab must include an explicit `id` and `label` in the marker. Tab rendering is based on these attributes, not on headings.
- JavaScript builds the interactive tablist at runtime.
- If JavaScript is disabled, the shortcode falls back to stacked sections (all tab contents remain visible one under another).
- For bilingual poetry rows, use a standard Markdown table; striped rows are applied automatically inside tab panels.
