# Local Auth Overlay (isolated Hugo output)

This test-only helper lets you run Hugo locally with a pseudo-authenticated UI state **without touching production configs or source files**.

## Why this exists

When `--local-auth-key` is provided, this runner:

- builds/serves Hugo into `tests/local-auth-overlay/public`;
- injects a generated runtime overlay script only into that isolated output;
- simulates authenticated state in header/profile/mini-game visibility for local rendering checks.

When `--local-auth-key` is not provided, the command is passed to Hugo as-is.

## Files

- `scripts/local-auth-overlay.js` — main runner (proxy + injector + local package workflow).
- `scripts/smoke-local-package-workspace.js` — smoke verification for workspace prepare/link/restore flow across all known packages.
- `config/default-session.json` — default pseudo-session values.
- `packages-workspace/` — reusable workspace where prepared local package copies are stored (runtime/generated; gitignored).
- `public/` — generated isolated output (created at runtime; gitignored).

## Local package default pipeline

For our team, the default behavior is optimized for reliable local integration checks:

1. resolve package source from `--local-packages-root` (default `../InterDeadCore`) and `--local-package-map` overrides;
2. prepare package inside `tests/local-auth-overlay/packages-workspace` (the same pipeline is used for default root and overrides);
3. capture source artifact snapshot **before workspace copy** to preserve real staleness signal (`dist` presence + outdated status from source tree);
4. evaluate preparation policy per package using that source snapshot and workspace dependency state:
   - detect whether `dist/` exists,
   - detect whether `dist/` is outdated compared to source files,
   - apply explicit flags (`--skip-local-package-build`, `--force-local-package-build`);
5. run `npm install`/`npm ci` only when policy requires install;
6. run `npm run build` only when policy requires build;
7. validate build artifacts (`dist` or entry points from `exports`/`main`/`module`);
8. run local package security audit according to mode (`off`/`report`/`strict`) without auto-fixes;
9. only after that create temporary link into `InterDeadIT/node_modules`;
10. restore original `node_modules` package state on exit/error.

This artifact-aware pipeline avoids unnecessary installs for already prepared packages and keeps workspace copies for debugging.

Outdated artifact detection ignores obvious non-build inputs (for example, docs/tests markdown/text files) to reduce noisy rebuilds.

Dependency readiness check is heuristic: the policy verifies that `node_modules` exists, but this does not guarantee full dependency correctness across all platforms or lockfile changes.

When `--local-packages-prepare-mode link` is used, the runner uses directory symlink first and automatically falls back to Windows junctions on `EPERM` to support environments without symlink privileges.

## Install/build decision matrix

| Condition                                                                  | Install step                                                      | Build step                                                 |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| `--force-local-package-build`                                              | run (`install required: forced rebuild`)                          | run (`build required: forced rebuild`)                     |
| `--skip-local-package-build` + `dist/` exists                              | skip (`skip install: dist exists and build not required`)         | skip (`skip build: flag enabled and dist exists`)          |
| `--skip-local-package-build` + `dist/` missing                             | fail fast (policy error)                                          | fail fast (`build skipped but dist artifacts are missing`) |
| no force/skip flags + `dist/` missing                                      | run (`install required: dist missing`)                            | run (`build required: dist missing`)                       |
| no force/skip flags + `dist/` exists and outdated + dependencies missing   | run (`install required: build required and dependencies missing`) | run (`build required: dist outdated`)                      |
| no force/skip flags + `dist/` exists and outdated + dependencies present   | skip (`skip install: dist exists and dependencies are available`) | run (`build required: dist outdated`)                      |
| no force/skip flags + `dist/` exists and up-to-date + dependencies missing | skip (`skip install: dist exists and build not required`)         | skip (`skip build: dist exists and up-to-date`)            |
| no force/skip flags + `dist/` exists and up-to-date + dependencies present | skip (`skip install: dist exists and dependencies are available`) | skip (`skip build: dist exists and up-to-date`)            |

Use `--force-local-package-build` when you need deterministic rebuilds. Use `--skip-local-package-build` only when artifacts already exist and you intentionally want to trust them.

## CLI options

- `--local-packages all`
- `--local-packages @interdead/framework,@interdead/identity-core`
- `--local-packages-root <path>`
- `--local-packages-workspace <path>` — custom workspace path (default `tests/local-auth-overlay/packages-workspace`).
- `--local-packages-prepare-mode <copy|link>` — package preparation mode (default `copy`).
- `--skip-local-package-build` — skip package build step only when `dist/` artifacts already exist; otherwise the runner fails fast with a policy error.
- `--force-local-package-build` — always run install and build for deterministic rebuilds.
- `--cleanup-local-packages-workspace` — remove workspace directory after run.
- `--local-package-audit <off|report|strict>` — audit mode (default `off`).
- `--local-package-audit-level <moderate|high|critical>` — threshold for strict mode (default `moderate`).
- `--local-package-map <name>=<path>`

## Local package audit modes

The overlay runner includes a dedicated package audit policy layer that runs `npm audit --json` in workspace copies only. It is intentionally non-destructive: the runner never calls `npm audit fix` or `npm audit fix --force`.

- `off` (default): skip audit completely.
- `report`: run audit, print structured vulnerability summary, never block prepare flow.
- `strict`: run audit and block package preparation only when findings at/above the configured threshold are present.

Threshold is controlled by `--local-package-audit-level` and is evaluated for severities `moderate`, `high`, and `critical`.

### Recommended safe remediation workflow

1. Run overlay in `report` mode to inspect findings during local integration checks.
2. Open the source package repository (for example in `InterDeadCore/<package>`), review advisories, and update dependencies manually.
3. If you choose to run `npm audit fix --force`, do it manually in the source package repository, not in overlay workspace copies.
4. Rebuild and validate package tests in the source package repository.
5. Re-run overlay in `strict` mode to verify policy compliance before broader testing.

This keeps overlay behavior predictable and avoids hidden dependency mutations.

## Usage

Run from `InterDeadIT` root. You do not need to `cd` into `tests/local-auth-overlay`.

### 1) Standard Hugo behavior (no overlay)

```bash
node tests/local-auth-overlay/scripts/local-auth-overlay.js server -D
```

### 2) Enable local auth overlay for server mode

```bash
node tests/local-auth-overlay/scripts/local-auth-overlay.js server -D --local-auth-key dev-local-auth
```

### 3) Enable local auth overlay for build mode

```bash
node tests/local-auth-overlay/scripts/local-auth-overlay.js --minify --local-auth-key dev-local-auth
```

### 4) Default local packages workflow (recommended for our team)

```bash
node tests/local-auth-overlay/scripts/local-auth-overlay.js server -D \
  --local-auth-key dev-local-auth \
  --local-packages all
```

### 5) Custom workspace and cleanup

```bash
node tests/local-auth-overlay/scripts/local-auth-overlay.js server -D \
  --local-auth-key dev-local-auth \
  --local-packages @interdead/framework \
  --local-packages-workspace .tmp/local-overlay-workspace \
  --cleanup-local-packages-workspace
```

### 6) Custom mapping with manual preparation (alternative workflow)

For other users, manual package prep can be more convenient. In that case use explicit mapping and optionally skip build:

```bash
node tests/local-auth-overlay/scripts/local-auth-overlay.js server -D \
  --local-auth-key dev-local-auth \
  --local-package-map @interdead/framework=/absolute/path/to/prebuilt/framework \
  --skip-local-package-build
```

### 7) Run smoke verification (all known packages)

```bash
node tests/local-auth-overlay/scripts/smoke-local-package-workspace.js
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
