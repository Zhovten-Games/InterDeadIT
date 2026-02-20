# Local Auth Overlay (isolated Hugo output)

This test-only helper lets you run Hugo locally with a pseudo-authenticated UI state **without touching production configs or source files**.

## Why this exists

When `--local-auth-key` is provided, this runner:

- builds/serves Hugo into `tests/local-auth-overlay/public`;
- injects a generated runtime overlay script only into that isolated output;
- simulates authenticated state in header/profile/mini-game visibility for local rendering checks.

When `--local-auth-key` is not provided, the command is passed to Hugo as-is.

## Files

- `scripts/local-auth-overlay.js` — main runner (proxy + injector).
- `config/default-session.json` — default pseudo-session values.
- `public/` — generated isolated output (created at runtime).

## Usage

Run from `InterDeadIT` root. You do not need to `cd` into `tests/local-auth-overlay`.

### 1) Standard Hugo behavior (no overlay)

```bash
node tests/local-auth-overlay/scripts/local-auth-overlay.js server -D
```

This is equivalent to running Hugo directly.

### 2) Enable local auth overlay for server mode

```bash
node tests/local-auth-overlay/scripts/local-auth-overlay.js server -D --local-auth-key dev-local-auth
```

### 3) Enable local auth overlay for build mode

```bash
node tests/local-auth-overlay/scripts/local-auth-overlay.js --minify --local-auth-key dev-local-auth
```

## Custom pseudo-session

You can provide your own JSON file:

```bash
node tests/local-auth-overlay/scripts/local-auth-overlay.js server -D \
  --local-auth-key dev-local-auth \
  --local-auth-config tests/local-auth-overlay/config/default-session.json
```

Expected schema:

```json
{
  "profileId": "LOCAL-TEST-PROFILE",
  "displayName": "NIRO Operator",
  "username": "niro_local",
  "avatarUrl": ""
}
```

## Notes

- The overlay is for local QA and visual checks only.
- The runner requires `hugo` available in `PATH`.
- The runner checks whether your Hugo version supports `--renderToDisk` and only adds it when available.
- In server mode the injector runs periodically, so regenerated pages stay patched in the isolated output.
