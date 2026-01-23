# Architecture overview

InterDeadIT is the Hugo-based entry point for the InterDead universe. It owns the web experience (content, templates, and UI controllers) while delegating identity, EFBD scoring, and persistence concerns to shared services. The intent is a thin-adapter, hexagonal-style split: the site renders content and wires ports, while core packages supply domain behavior.

## Design principles

- **Separation of responsibilities.** UI controllers focus on DOM orchestration, leaving cross-cutting logic in application services and adapters.
- **Ports and adapters.** Ports define the contracts that the UI can depend on, while adapters bridge to infrastructure (Cloudflare, storage, browser APIs).
- **OOP layering through inheritance.** UI adapters extend port base classes (e.g., modal and slider view ports, EFBD write ports) so we can replace implementations without changing application services.

## How the layers map

| Layer          | Purpose                        | Examples                                                             |
| -------------- | ------------------------------ | -------------------------------------------------------------------- |
| Presentation   | DOM wiring and UI controllers  | `*Controller` classes created in `themes/InterDead/assets/js/app.js` |
| Application    | Stateless or stateful services | `ModalService`, `SliderService`, `AuthVisibilityService`             |
| Ports          | Contracts for adapters         | `ModalViewPort`, `SliderViewPort`, `IEfbdScaleWritePort`             |
| Infrastructure | Browser and network adapters   | `ModalView`, `SliderView`, `EfbdScaleTriggerPort`                    |

Keep this split in mind when introducing new features: add or extend a port when a new boundary is required, implement it in infrastructure, and keep presentation logic focused on DOM boundaries rather than domain rules.
