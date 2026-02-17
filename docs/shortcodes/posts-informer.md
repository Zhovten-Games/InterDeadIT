# Posts informer shortcode

The `posts-informer` shortcode renders a reusable grid of post cards. It is intended to be a shared content informer layer, not only for the homepage.

> ⚠️ Evolution note: this informer is expected to evolve significantly. Keep integrations thin and prefer passing explicit parameters from calling pages.

## Template and shared core

- `themes/InterDead/layouts/shortcodes/posts-informer.html`
- `themes/InterDead/layouts/partials/helpers/posts-informer-feed.html`

The helper partial is the shared feed-building core. It owns section/category filtering and date/limit selection.

## Card media behavior

Informer cards now render post cover images when `image` is defined in post front matter.
The rendering path and visual style reuse the same card media pattern as the blog collection cards on the homepage/blog section.

## Parameters

- `noteKey` / `note`: optional helper text above the informer.
- `section`: content section to pull pages from (`blog` by default).
- `category`: category slug (or path) used for blog filtering (`artifacts` by default).
- `limit`: number of posts to render (`6` by default).

## Default behavior

If no parameters are provided, the informer renders:

- posts from `section="blog"`
- filtered by `category="artifacts"`
- sorted by latest date first
- first `6` entries

## Example

```md
{{< posts-informer noteKey="ticker.note" section="blog" category="/blog/artifacts/" limit="6" />}}
```
