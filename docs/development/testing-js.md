# JavaScript test map

This page documents current JavaScript test coverage so new modules can be matched with existing specs.

## Test runtime

InterDeadIT JavaScript tests are implemented as Node.js unit/integration tests under `tests/`.

## Current test files

### Auth and session flow

- `tests/auth-visibility.service.test.js`
- `tests/interdead-auth-worker.test.js`

### Information panel and content rendering

- `tests/info-content-adapter.test.js`
- `tests/info-panel-service.test.js`
- `tests/markdown-renderer.test.js`

### Modal and menu behavior

- `tests/menu-modal-active-state.test.js`
- `tests/modalServiceResume.test.js`

### Mini-game and external integration

- `tests/efbd-api-adapter.test.js`
- `tests/efbd-scale-bridge.test.js`
- `tests/mini-games-runtime.test.js`

### Browser fixture for local auth overlay

- `tests/local-auth-overlay/scripts/local-auth-overlay.js`

## Rules for new modules

- New service-level module: add at least one happy-path and one boundary-path test.
- DOM-heavy module: prefer adapter tests with mocked HTML containers.
- Bridge/integration module: include fallback-path coverage (failed network, missing host API, or missing DOM marker).
- If a test is removed, remove or update the corresponding item in this file in the same change set.
