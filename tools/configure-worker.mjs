import { readFileSync, writeFileSync } from 'node:fs';
const endpoints = JSON.parse(readFileSync(new URL('../config/endpoints.json', import.meta.url)));
const target = new URL('../workers/interdead-auth/wrangler.toml', import.meta.url);
let config = readFileSync(target, 'utf8');
const api = new URL(endpoints.api);
const site = new URL(endpoints.site);
const studioDomain = site.hostname.split('.').slice(-2).join('.');
config = config.replace(
  /routes = \[[\s\S]*?\]/,
  `routes = [\n  { pattern = "${api.hostname}", zone_name = "${studioDomain}", custom_domain = true }\n]`,
);
config = config.replace(
  /^IDENTITY_DISCORD_REDIRECT_URI = .*$/m,
  `IDENTITY_DISCORD_REDIRECT_URI = "${api.origin}/auth/discord/callback"`,
);
config = config.replace(
  /^INTERDEAD_SITE_BASE_URL = .*$/m,
  `INTERDEAD_SITE_BASE_URL = "${site.origin}"`,
);
writeFileSync(target, config);
process.stdout.write(
  'Worker domain configuration updated from config/endpoints.json; bindings and secrets preserved.\n',
);
