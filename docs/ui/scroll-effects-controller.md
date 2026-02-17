# Scroll effects controller

The scroll effects controller consolidates reusable scroll-driven behaviors in one place. It currently supports intersection-based reveal scenes and in-container pin scenes under a shared lifecycle.

## Key class

- **ScrollEffectsController**: initializes, updates, and disposes all configured scroll scenes.

## Scene types

- **Intersection scene**: toggles visibility classes or triggers callbacks when elements enter or leave the viewport.
- **Pin scene**: keeps an element visually pinned inside a container while preserving container bounds.

## Home vs non-home header logo behavior

The header logo visibility is now configured through the same controller contract:

- On the home page, the logo is hidden while the hero logo block is visible and appears once the hero leaves the viewport.
- On non-home pages (without hero media), the logo is forced to stay visible at all times.

This keeps logic centralized while preserving the previous UX exception for inner pages.

## Data hooks and integration

- `data-scroll-reveal`: marks elements for intersection reveal scenes.
- `data-header-logo`: points to the header logo element controlled by scene callbacks.
- `data-hero-media`: defines the home-page trigger element for header logo visibility transitions.
- `data-scoreboard`: identifies the slider stamp/scoreboard element used in pin scenes.

## Usage guidance

When adding new scroll-driven behavior:

1. Add a new scene configuration instead of introducing another global scroll listener.
2. Keep visual rules in CSS classes and use scene callbacks only for state transitions.
3. Prefer reusable scene options (`threshold`, `rootMargin`, offsets) over page-specific branching.
4. Ensure every new scene remains safe for `init()` / `dispose()` lifecycle usage.
