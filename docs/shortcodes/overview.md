# Shortcodes overview

InterDeadIT uses a small set of Hugo shortcodes to keep content logic reusable. Each shortcode lives in `themes/InterDead/layouts/shortcodes/` (unless noted) and should be documented before new usage is introduced.

## Available shortcodes

- **info-trigger** → [Info trigger](info-trigger.md)
- **posts-informer** → [Posts informer](posts-informer.md)
- **ticker** / **ticker-item** → [Running-line ticker](ticker.md)
- **emoji-protocol** → [Emoji protocol](emoji-protocol.md)
- **efbd-poll** → documented in [Mini-games: EFBD poll](../mini-games/efbd-poll.md)
- **efbd-poll-2** → documented in [Mini-games: EFBD poll](../mini-games/efbd-poll.md)
- **tabs** → [Tabs](tabs.md)

When a shortcode depends on a UI service (for example, the ticker uses the marquee controller or info-trigger uses the info panel modal), make sure the related UI documentation stays in sync.
