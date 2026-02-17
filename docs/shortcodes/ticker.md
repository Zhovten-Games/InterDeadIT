# Running-line ticker shortcodes

The ticker shortcodes render a running-line text marquee that reuses the shared `MarqueeController` UI service.

> ⚠️ Evolution note: the ticker mechanism is being simplified and will likely change further. Keep usage focused on manual inserts and avoid coupling content flow to ticker internals.

## Template locations

- `themes/InterDead/layouts/shortcodes/ticker.html`
- `themes/InterDead/layouts/shortcodes/ticker-item.html`

## Ticker parameters

- `noteKey` / `note`: optional helper text displayed above the ticker.
- `limit`: optional integer limit for the number of rendered manual items.

## Data source

Ticker now supports **manual items only** via nested `ticker-item` shortcodes.

## Manual items example

```md
{{< ticker note="Featured artifacts" >}}
{{< ticker-item text="Artifact A" url="/blog/artifact-a/" >}}
{{< ticker-item text="Artifact B" url="/blog/artifact-b/" >}}
{{< /ticker >}}
```

## Running-line behavior

The ticker markup is wired for `data-marquee="text"`, so the marquee controller applies overflow scrolling only when the line does not fit into the viewport. Keep `data-marquee-viewport` and `data-marquee-track` hooks intact.
