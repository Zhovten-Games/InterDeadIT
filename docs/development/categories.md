# Categories in Hugo

## Overview

The site uses section-scoped categories for the blog only. Categories are defined as a dedicated
taxonomy so they live under the blog section and keep breadcrumbs and ownership correct.

## Taxonomy configuration

The taxonomy is declared in `config/_default/config.toml`:

```toml
[taxonomies]
  blogcategory = "blog/categories"
```

This produces URLs like `/blog/categories/<slug>/` and prevents categories from being published at
the root.

## Front matter usage

Use the `blogcategory` key in blog content:

```yaml
---
title: "Example"
blogcategory:
  - "artifacts"
---
```

Only blog content should define `blogcategory`. Other sections do not use categories.

## Term pages

Term pages live under the blog section for each locale:

```
content/<locale>/blog/categories/<slug>/_index.md
```

Example:

```
content/en/blog/categories/artifacts/_index.md
```

## Rendering and links

The templates resolve category links using a shared helper to map the section to the correct
taxonomy path. For blog pages, this ensures category chips and lists link to `/blog/categories/...`
instead of the root.
