---
domains: []
emits: []
implements: []
imports: []
listens: []
owns: []
schemaVersion: 1
source: InterDeadIT/themes/InterDead/static/js/interdead-proto-loader.js
used_by: []
source_exists: true
runtime_role: interdead_proto_loader
contour_primary: FPN-COMMAND
contour_secondary: none
role_group: executive_control
narrative_role: 'embedded proto launch orchestrator'
---

# InterDead Embed Camera Requirements

This document describes how camera access works for InterDeadProto when it is opened in an inline iframe.

## Camera requirements for embedded mode

To make camera access work inside an iframe, all of the following conditions should be satisfied:

- The page is served in a **secure context** (`https://`), or from `localhost` during local development.
- The browser-level camera permission is granted for the current origin.
- The iframe has the expected **Permissions Policy** via the `allow` attribute.
- Server headers do not deny required features (for example restrictive `Permissions-Policy` headers).

InterDead loader defaults to:

- `camera`
- `microphone`
- `geolocation`
- `fullscreen`
- `clipboard-read`
- `clipboard-write`

## Marker configuration

Configure permissions in the launcher marker (`baseof.html`) with:

- `data-interdead-iframe-allow="camera; microphone; geolocation; fullscreen; clipboard-read; clipboard-write"`

If the attribute is missing, loader falls back to the safe default allow list above.

You can optionally configure referrer policy using:

- `data-interdead-iframe-referrer-policy="strict-origin-when-cross-origin"`

## Expected behavior: localhost vs production

### Localhost

- Browsers usually treat `http://localhost` as secure for camera APIs.
- Camera can work without TLS certificate setup.
- Permission prompts may still require explicit user approval.

### Production

- HTTPS is required for camera APIs.
- Any mismatch in iframe `allow` policy, browser permission settings, or server headers can block camera access.
- Embedded app origin and host page origin must both satisfy browser security requirements.

## Diagnostics checklist: "camera does not open"

1. Confirm launcher is opened in **inline mode** (not external tab mode).
2. Check browser permission prompt result for camera/microphone.
3. Inspect generated iframe element and verify `allow` contains `camera`.
4. Verify marker attribute `data-interdead-iframe-allow` is present and valid.
5. Check browser DevTools Console for loader diagnostics (`[InterDead][LauncherLoader] ...`).
6. Verify response headers (`Permissions-Policy`, CSP) on host/app do not block camera.
7. Re-test in latest Chrome/Firefox and in private window to exclude extension interference.
