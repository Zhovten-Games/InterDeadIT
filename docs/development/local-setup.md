# Local setup

InterDeadIT is a Hugo site with a small JavaScript layer. Local development focuses on running the Hugo server and, when needed, formatting assets.

## Prerequisites

- **Hugo Extended** for asset pipelines (`resources`, `fingerprint`, `js.Build`).
- **Node.js + npm** for formatting tools and worker deployments.

## Quick start

1. Install Hugo Extended (version matching your toolchain).
2. From the repository root, run:

```bash
hugo server
```

3. Use `config/_default/config.toml` to review the active base URL and API endpoint defaults.

## Environment overrides

The API base URL can be overridden at runtime through the environment variable configured in `config/_default/config.toml` (`HUGO_INTERDEAD_API_BASE_URL`). Use this when pointing the local site at a dev Worker instance.
