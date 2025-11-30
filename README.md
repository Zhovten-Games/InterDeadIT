# InterDead Landing

## Приступая к работе

### Архитектура
- We follow a hexagonal (ports and adapters) layout: domain entities stay pure and unaware of the browser, application services orchestrate domain logic, infrastructure adapters talk to the DOM, storage, or other external APIs, and presentation controllers wire everything together.
- When extending the app, introduce new domain types for business rules, keep adapters thin and replaceable, and favour dependency injection through constructors so that layers remain decoupled.

### ООП
- Prefer class-based modules with single responsibilities and explicit public methods; compose behaviour instead of letting controllers grow monolithic.
- Share cross-cutting behaviour via small base classes or interfaces (ports) and keep state private to each instance unless it must be shared through services.

### БЭМ
- Stick to Block-Element-Modifier naming (`gm-block__element--modifier`) for any new styles or DOM hooks so that JavaScript can target predictable classes.
- Avoid using `id` selectors in new markup and scripts; rely on BEM classes or `data-*` attributes to keep components reusable and styles collision-free.

### Auth visibility guard
- Use `AuthVisibilityService` as the single source of truth for authenticated/unauthenticated UI states (hero countdown, profile page, shortcodes).
- Subscribe through the shared event bus or via `window.InterdeadPorts.authVisibility.onChange` to ensure components switch without flicker.
- Query `getSnapshot()`/`isAuthenticated()` instead of re-checking session payloads in controllers or shortcode wrappers.
