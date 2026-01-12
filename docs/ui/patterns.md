# UI patterns

These conventions keep the UI consistent and make controllers predictable.

## BEM class naming

Use `gm-` prefixed BEM classes (`gm-modal`, `gm-modal--open`, `gm-slider__dot`) so templates and JS adapters share a stable contract.

## Controller hooks

Controllers discover DOM nodes using data attributes, not hard-coded class selectors. Examples include:

- `data-modal`, `data-modal-trigger`, `data-modal-close`
- `data-auth-button`, `data-auth-helper`, `data-auth-badge`
- `data-profile-*` hooks for profile UI state

Add new hooks using `data-*` attributes, then map them in the relevant controller or adapter.

## Localization hooks

When rendering translatable text in templates or JS-generated markup, add `data-i18n` attributes so translators can keep track of keys.

## DOM boundary guidelines

- Keep DOM queries inside presentation controllers or view adapters.
- Services should operate on plain data structures rather than DOM elements.
- When a feature needs to talk across domains, add a port rather than importing a controller directly.
