import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const endpoints = JSON.parse(readFileSync(new URL('../config/endpoints.json', import.meta.url)));
const site = process.env.HUGO_BASEURL || endpoints.site;
const api = process.env.HUGO_INTERDEAD_API_BASE_URL || endpoints.api;
const proto = process.env.HUGO_INTERDEAD_PROTO_URL || endpoints.proto;
for (const value of [site, api, proto]) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid endpoint protocol');
}
const result = spawnSync(
  process.env.HUGO_BINARY || 'hugo',
  ['--baseURL', site.replace(/\/$/, '') + '/', ...process.argv.slice(2)],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, HUGO_INTERDEAD_API_BASE_URL: api, HUGO_INTERDEAD_PROTO_URL: proto },
  },
);
if (result.error) process.stderr.write(result.error.message + '\n');
process.exitCode = result.status ?? 1;
