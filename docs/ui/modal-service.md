# Modal service

The modal system is built around `ModalService`, which orchestrates modal instances and delegates view operations to a `ModalViewPort` implementation. This keeps modal behavior reusable and testable.

## Key classes

- **ModalService**: registers modal instances, opens/closes them, and manages the resume stack.
- **ModalInstance**: binds a `ModalEntity` to a view adapter and handles persistence (`remember` flags).
- **ModalViewPort**: contract for UI adapters (open/close methods).
- **ModalView**: default DOM adapter that toggles classes/attributes.

## Lifecycle highlights

- Modals are registered at boot by scanning `[data-modal]` elements in `themes/InterDead/assets/js/app.js`.
- `open(id, { resume })` either replaces the active modal or suspends it so it can resume later.
- `close(id, { remember })` unlocks scroll, updates the resume stack, and reopens the previous modal if needed.
- The default view adapter toggles `gm-modal--open` and `aria-hidden` and can wire overlay clicks to `ModalService.close()`.

## Usage guidance

When adding a new modal:

1. Add a DOM node with `data-modal` and the BEM class naming (`gm-modal`, modifiers as needed).
2. Define the entity attributes used by `ModalDomMapper` so the service can map behavior.
3. Avoid embedding business logic in the view; keep it in the service or controller layer.
