<pre>
╔════════════════════════════════════════════════════════════════════════════╗
║ INTERDEAD :: REPOSITORIES                                                  ║
╠════════════════════════════════════════════════════════════════════════════╣
║ ○ <a href="https://github.com/Zhovten-Games/InterDeadReferenceLibrary">InterDeadReferenceLibrary</a>                                                ║
║ ○ <a href="https://github.com/Zhovten-Games/InterDeadProto">InterDeadProto</a>                                                           ║
║ ▶ <a href="https://github.com/Zhovten-Games/InterDeadIT">InterDeadIT</a>                                                              ║
║ ○ <a href="https://github.com/Zhovten-Games/InterDeadCore">InterDeadCore</a>                                                            ║
║ ○ <a href="https://github.com/Zhovten-Games/PsyFramework">PsyFramework</a>                                                             ║
║ ○ <a href="https://github.com/Zhovten-Games/InterDead">InterDead</a> (private)                                                      ║
║ ○ <a href="https://github.com/Zhovten-Games/SPIDER">SPIDER</a>                                                                   ║
╚════════════════════════════════════════════════════════════════════════════╝
</pre>

# InterDeadIT

Public website and Cloudflare identity / EFBD Worker.

[Governance](governance/README.md) · [Technical registry](governance/ecosystem.json)

## Stack

- Hugo (static site generation)
- JavaScript UI layer (controllers + services)
- Cloudflare Pages + Workers + D1

## Local dev

- Run `hugo server` from the repository root.
- Use `npm run format` for formatting (Prettier).

## Deployment (high-level)

- Hugo builds static assets for Cloudflare Pages.
- The `interdead-auth` Worker handles OAuth + EFBD triggers and talks to D1.

### Tests

Before every deployment and before manual end-to-end website validation, run the `InterDeadIT/tests/local-auth-overlay` suite as a mandatory gate: [InterDeadIT/tests/local-auth-overlay](InterDeadIT/tests/local-auth-overlay).

## Conventions

- Keep adapters thin and use ports for cross-boundary contracts.
- Prefer `data-*` hooks and BEM class naming for UI controllers.

## Engineering standards

Canonical project-wide engineering ideals and development standards are maintained in the InterDead Reference Library (public): https://github.com/Zhovten-Games/InterDeadReferenceLibrary/tree/main/standards/development
. This repository follows that canon; local notes here must not override or fork the shared standards.

## Docs

Start here: [docs/README.md](docs/README.md)

Key references:

- [Architecture overview](docs/architecture/overview.md)
- [Ports and events](docs/architecture/ports-and-events.md)
- [Deployment overview](docs/deployment/overview.md)

## Emoji rendering

The site uses [Twemoji](https://github.com/jdecked/twemoji) for consistent emoji rendering across platforms.

## Verification and domain migration

Run `node tools/warden.mjs` for the complete declared repository check corpus. The operator runbook and variable registry accompany the 2026-11-07 local migration delivery. Public site: https://interdead.zhovten.games/; prototype: https://noir.zhovten.games/. Cloudflare and Discord settings are applied separately from repository edits.
