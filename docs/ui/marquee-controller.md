# Marquee controller

The marquee controller unifies overflow-running text behavior under a single controller.

> ⚠️ Evolution note: this mechanism is expected to keep changing while InterDead UI widgets converge on shared primitives.

## Key classes

- **MarqueeController**: discovers marquee roots and coordinates lifecycle updates on resize and `prefers-reduced-motion` changes.
- **BaseTextMarquee**: common lifecycle abstraction for text marquee entities.
- **OverflowTextMarquee**: applies marquee animation class only when text width overflows the viewport.

## Data attributes

Use data hooks to declare marquee intent:

- `data-marquee="text"`: overflow text marquee. Requires `data-marquee-track`. The root can be the viewport or provide `data-marquee-viewport`.
- `data-marquee-media`: optional media query string for enabling text marquees on specific breakpoints.

## Behavior notes

- Text marquees are disabled when `prefers-reduced-motion` is enabled.
- Marquee class is applied only when `track.scrollWidth > viewport.clientWidth`.
- Typical use case: post-page TOC current-section label, where long headings need horizontal movement on narrow screens.

## Usage guidance

1. Use `data-marquee="text"` for single-line dynamic labels.
2. Keep content updates reactive (update label text, then let marquee recalculate metrics).
3. Keep `data-marquee-viewport` and `data-marquee-track` hooks stable when adjusting markup.
4. Avoid custom timers; rely on the shared controller and observers.
