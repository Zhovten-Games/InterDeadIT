# CI/CD

InterDeadIT uses a focused workflow to deploy the Cloudflare Worker.

## Worker deployment workflow

`/.github/workflows/interdead-auth.yml` deploys the Worker when changes land on `main` in either:

- `workers/interdead-auth/**`
- `.github/workflows/interdead-auth.yml`

The workflow installs Node dependencies, installs Wrangler globally, and runs `wrangler deploy` from the Worker directory. The deploy step uses `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets.
