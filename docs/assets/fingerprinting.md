# Asset fingerprinting

InterDeadIT relies on Hugo Pipes to fingerprint assets for cache busting and integrity checks.

## Global assets

In `themes/InterDead/layouts/partials/head.html`, the pipeline fingerprints:

- Core CSS (`resources.Get "css/styles.css" | resources.Minify | fingerprint`).
- Main JS bundle (`resources.Get "js/app.js" | js.Build ... | fingerprint`).
- Favicons and the manifest.
- The default Open Graph image (logo) when no page-specific image is provided.

Use the resulting `RelPermalink` and `Data.Integrity` values when rendering `<link>` or `<script>` tags.

## Shortcode assets

Shortcodes can fingerprint their own assets. For example, the `efbd-poll` shortcode fingerprints its CSS, map image, and JS bundle before injecting them and queuing the mini-game configuration.
