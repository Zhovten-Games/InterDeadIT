# Marquee controller

The marquee controller unifies all running-line interactions under a single controller. It supports both scrolling tickers (carousel-like lists) and text marquees (single-line text that animates when it overflows).

## Key classes

- **MarqueeController**: discovers marquee roots, tracks animation state, and updates on resize or `prefers-reduced-motion` changes.
- **ScrollMarquee**: powers horizontally scrolling lists such as the sponsor ticker. It clones track items for seamless looping and supports drag-to-scroll.
- **TextMarquee**: handles short text rows that only animate when the content overflows their viewport, using CSS variables for the distance.

## Data attributes

Use data hooks to declare marquee intent:

- `data-marquee="scroll"`: scrolling ticker. Requires `data-marquee-viewport` and `data-marquee-track` inside the root.
- `data-marquee="text"`: overflow text marquee. Requires `data-marquee-track`. The root can be the viewport or provide `data-marquee-viewport`.
- `data-marquee-media`: optional media query string for enabling text marquees on specific breakpoints.

## Behavior notes

- Scroll marquees pause when `prefers-reduced-motion` is enabled.
- Dragging a scroll marquee pauses auto-scroll briefly before resuming.
- Text marquees compute the scroll distance only when the content is wider than the viewport.
- The controller runs a single animation loop for all scroll marquees to keep timing consistent.

## Usage guidance

When adding a new running-line feature:

1. Choose the marquee type (`scroll` for lists, `text` for a single line).
2. Provide the required data hooks in the template.
3. Avoid custom timers; rely on `MarqueeController` for animation timing.
4. Keep any layout changes in CSS so metrics can be recalculated via resize observers.
