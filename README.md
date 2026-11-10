<pre>
╔═════════════════════════════════════════════════════════════════════════════╗
║                          INTERDEAD :: REPOSITORIES                          ║
╠═════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║ ○ <a href="https://github.com/Zhovten-Games/InterDeadReferenceLibrary">InterDead Reference Library (public)</a>                                      ║
║   Public reference library: research, engineering standards and notes.      ║
║   Materials are prepared for reuse outside the private workspace.           ║
║                                                                             ║
║ ○ <a href="https://github.com/Zhovten-Games/InterDeadProto">InterDeadProto (NOIR)</a>                                                     ║
║   Narrative interface prototype: Nectosphere-Oriented Interface Relay.      ║
║   A browser application with its own verified distribution pipeline.        ║
║                                                                             ║
║ > <a href="https://github.com/Zhovten-Games/InterDeadIT">InterDeadIT (website / entry point)</a>                                       ║
║   The public website: localized articles, artifacts and project entry.      ║
║   Connects visitors with InterDead and the shared web-side services.        ║
║                                                                             ║
║ ○ <a href="https://github.com/Zhovten-Games/InterDeadCore">InterDeadCore (identity + EFBD)</a>                                           ║
║   Shared identity, EFBD scoring and interface contracts for the web.        ║
║   Published packages are consumed by the website and related tools.         ║
║                                                                             ║
║ ○ <a href="https://github.com/Zhovten-Games/PsyFramework">PsyFramework (research / tooling)</a>                                         ║
║   Configurable research and scoring tools supporting the project.           ║
║   Browser presentation and methodology data retain separate roles.          ║
║                                                                             ║
║ ○ <a href="https://github.com/Zhovten-Games/InterDead">InterDead (private game repository)</a>                                       ║
║   Portable C++20 narrative core, playable projections and Workshop.         ║
║   Private production sources retain their own publication boundary.         ║
║                                                                             ║
║ ○ <a href="https://github.com/Zhovten-Games/SPIDER">SPIDER (methodology / contracts)</a>                                          ║
║   Literary pseudocode for attributed intent and consistent projections.     ║
║   Public contracts connect the method with reviewed project examples.       ║
║                                                                             ║
╠═════════════════════════════════════════════════════════════════════════════╣
║                                 INTERDEADIT                                 ║
╠═════════════════════════════════════════════════════════════════════════════╣
║ InterDeadIT is the Hugo-powered public surface of InterDead. It publishes   ║
║ localized articles and interactive artifacts, supports local visitor        ║
║ profiles and delegates connected identity and EFBD services to shared       ║
║ packages and the platform Worker.                                           ║
║                                                                             ║
╠═════════════════════════════════════════════════════════════════════════════╣
║                ECHO OF AN UNFADING MEMORY  /  INTERDEAD WIKI                ║
║                                                                             ║
║ <a href="https://interdead.zhovten.games/about/">ABOUT (EN)</a>                          <a href="https://interdead.fandom.com/wiki/InterDead_Wiki">WIKI (EN)</a>                               ║
║ <a href="https://interdead.zhovten.games/ru/about/">ABOUT (RU)</a>                          <a href="https://interdead.fandom.com/ru/wiki/Interdead_%D0%92%D0%B8%D0%BA%D0%B8">WIKI (RU)</a>                               ║
║ <a href="https://interdead.zhovten.games/uk/about/">ABOUT (UK)</a>                          <a href="https://interdead.fandom.com/uk/wiki/Main_Page">WIKI (UK)</a>                               ║
║ <a href="https://interdead.zhovten.games/ja/about/">ABOUT (JA)</a>                          <a href="https://interdead.fandom.com/ja/wiki/InterDead_Wiki">WIKI (JA)</a>                               ║
║                                                                             ║
╠═════════════════════════════════════════════════════════════════════════════╣
║                                   CONTACT                                   ║
║ <a href="https://www.linkedin.com/company/zhovten-games/">Zhovten Games — LinkedIn</a>                                                    ║
╚═════════════════════════════════════════════════════════════════════════════╝
</pre>

# InterDeadIT

Public website and Cloudflare identity / EFBD Worker.

[Governance](governance/README.md)

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

Before every deployment and before manual end-to-end website validation, run the `InterDeadIT/tests/local-auth-overlay` suite as a mandatory gate: [local-auth-overlay](tests/local-auth-overlay).

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

## Verification

Install the locked dependencies with `npm ci`, then run `npm run check` with Hugo 0.147.9 available on PATH. WARDEN checks both authorization modes, four locales, interactive artifacts and the local package overlay. Build the website with `node tools/build-site.mjs`.
