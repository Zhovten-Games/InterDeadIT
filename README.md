<pre>
╔═════════════════════════════════════════════════════════════════════╗
║                     INTERDEAD :: REPOSITORIES                       ║
╠═════════════════════════════════════════════════════════════════════╣
║ ○ <a href="https://github.com/Zhovten-Games/InterDeadReferenceLibrary">InterDead Reference Library (public)</a>                              ║
║   Public reference library: documents and notes that are safe       ║
║   to share outside the private workspace.                           ║
║                                                                     ║
║ > InterDeadIT (website / entry point)                               ║
║   The website: the public entry point into the InterDead meta-verse.║
║   Hosts the “About” and related public-facing materials.            ║
║                                                                     ║
║ ○ <a href="https://github.com/Zhovten-Games/InterDeadCore">InterDeadCore</a> (identity + EFBD core)                              ║
║   Core modules used by the website: identity/auth and EFBD logic.   ║
║   Published as packages and consumed by InterDeadIT.                ║
║                                                                     ║
║ ○ <a href="https://github.com/Zhovten-Games/PsyFramework">PsyFramework</a> (research / tooling)                                 ║
║   Research and tooling repo referenced by the project; supporting   ║
║   framework work that may be mentioned from public docs.            ║
╠═════════════════════════════════════════════════════════════════════╣
║                            INTERDEADIT                              ║
║═════════════════════════════════════════════════════════════════════║
║ InterDeadIT is the Hugo-powered entry point for the InterDead       ║
║ universe and the game’s public-facing surface. It ships the         ║
║ landing experience, localized content, UI controllers, and          ║
║ mini-game shortcodes, while delegating identity, EFBD scoring,      ║
║ and persistence to shared core packages and platform services.      ║
║═════════════════════════════════╦═══════════════════════════════════║
║    ECHO OF AN UNFADING MEMORY   ║   INTERDEAD WIKI (ALL LANGUAGES)  ║
╠═════════════════════════════════╬═══════════════════════════════════╣
║ <a href="https://interdead.phantom-draft.com/about/">READ (EN)</a>                       ║ <a href="https://interdead.fandom.com/wiki/InterDead_Wiki">READ (EN)</a>                         ║
╠═════════════════════════════════╬═══════════════════════════════════╣
║ <a href="https://interdead.phantom-draft.com/ru/about/">READ (RU)</a>                       ║ <a href="https://interdead.fandom.com/ru/wiki/Interdead_%D0%92%D0%B8%D0%BA%D0%B8">READ (RU)</a>                         ║
╠═════════════════════════════════╬═══════════════════════════════════╣
║ <a href="https://interdead.phantom-draft.com/uk/about/">READ (UK)</a>                       ║ <a href="https://interdead.fandom.com/uk/wiki/Main_Page">READ (UK)</a>                         ║
╠═════════════════════════════════╬═══════════════════════════════════╣
║ <a href="https://interdead.phantom-draft.com/ja/about/">READ (JA)</a>                       ║ <a href="https://interdead.fandom.com/ja/wiki/InterDead_Wiki">READ (JA)</a>                         ║
║═════════════════════════════════╩═══════════════════════════════════║
║                            CONTACT                                  ║
╠═════════════════════════════════════════════════════════════════════╣
║ <a href="https://www.linkedin.com/company/zhovten-games/">Zhovten Games — LinkedIn</a>                                            ║
╚═════════════════════════════════════════════════════════════════════╝
</pre>

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

## Conventions

- Keep adapters thin and use ports for cross-boundary contracts.
- Prefer `data-*` hooks and BEM class naming for UI controllers.

## Engineering standards
Canonical project-wide engineering ideals and development standards are maintained in the InterDead Reference Library (public): https://github.com/Zhovten-Games/InterDeadReferenceLibrary/tree/main/standards/development
. This repository follows that canon; local notes here must not override or fork the shared standards.

## Docs index

Start here: [docs/index.md](docs/index.md)

Key references:

- [Architecture overview](docs/architecture/overview.md)
- [Ports and events](docs/architecture/ports-and-events.md)
- [Deployment overview](docs/deployment/overview.md)
