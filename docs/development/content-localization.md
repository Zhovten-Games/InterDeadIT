# Content and localization

InterDeadIT uses Hugo's multi-language setup, with content and translations organized by locale.

## Content structure

- Each locale has its own `content/<lang>/` directory (for example: `content/en`, `content/ru`, `content/ja`, `content/uk`).
- Default language settings live in `config/_default/config.toml` under `[languages]` and `defaultContentLanguage`.

## Translation strings

- UI strings are stored in `i18n/<lang>.toml`.
- Templates reference translations using `i18n` keys (e.g., `{{ i18n "profile.unauthenticated" }}`).

## Workflow guidelines

1. Add new pages under every locale directory to keep navigation consistent.
2. Add or update translation keys in each `i18n/<lang>.toml` file.
3. Use `data-i18n` attributes in templates and JS-generated markup to keep localization hooks visible for scripts and QA.
