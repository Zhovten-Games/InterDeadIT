# Ports and events

InterDeadIT exposes a small set of browser-level ports that UI components and mini-games can subscribe to. These ports are initialized in `themes/InterDead/assets/js/app.js` and are made available via the `window.InterdeadPorts` namespace.

## InterdeadPorts contract

`window.InterdeadPorts` is a shared object that exposes:

- `emitScaleTrigger(axis, value, context)`: forwards EFBD scale triggers to the EFBD bridge service.
- `authVisibility`: an object with `getSnapshot()`, `onChange(listener)`, and `isAuthenticated()` helpers.

These ports are created after the EFBD bridge and auth visibility services are initialized in `app.js`, and then broadcast via the `interdead:ports-ready` event.

### `interdead:ports-ready`

After ports are attached, the runtime dispatches a DOM event:

```js
window.dispatchEvent(
  new CustomEvent('interdead:ports-ready', {
    detail: { ports: window.InterdeadPorts },
  }),
);
```

Mini-games listen for this event so they can refresh their port references once the main app finishes bootstrapping.

## Auth visibility payload shape

`AuthVisibilityService` normalizes auth state into a minimal payload that presentation controllers can consume. The snapshot returned by `authVisibility.getSnapshot()` follows this shape:

```ts
{
  status: 'authenticated' | 'unauthenticated' | 'pending',
  authenticated: boolean,
  session: {
    authenticated: true,
    profileId: string | null,
    displayName: string | null,
    avatarUrl: string | null,
    username: string | null,
  } | null,
}
```

Use `onChange(listener)` to react to updates instead of polling.

## EFBD write port

The EFBD write contract is represented by `IEfbdScaleWritePort` (a base class with a `recordAnswer` method). The concrete browser implementation is `EfbdScaleTriggerPort`, which extends the base port and forwards data to `window.InterdeadPorts.emitScaleTrigger`.

### EFBD payload

Mini-games call `recordAnswer` with:

```json
{
  "axis": "EBF-SOCIAL",
  "value": 1,
  "context": {
    "source": "efbd-poll",
    "answerKey": "EBF-SOCIAL",
    "locale": "en",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

The port returns a status object (e.g., `ok`, `disabled`, `invalid`, `unsupported`, `error`) so the UI can provide immediate feedback.

## Event bus

Inside the app, `EventBus` is the lightweight pub/sub layer used by services like auth visibility and EFBD. Prefer `EventBus` for internal communication and `window.InterdeadPorts` for cross-boundary (external) access.
