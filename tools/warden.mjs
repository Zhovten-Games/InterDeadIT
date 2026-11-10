// SPDX-License-Identifier: MIT
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (name) => readFileSync(path.join(root, name), 'utf8');
const json = (name) => JSON.parse(read(name));
const digest = (name) =>
  createHash('sha256')
    .update(readFileSync(path.join(root, name)))
    .digest('hex');
const gates = [];
function gate(id, check) {
  try {
    check();
    gates.push({ id, status: 'passed' });
  } catch (error) {
    gates.push({ id, status: 'failed', reason: error.message });
  }
}
function assert(value, message) {
  if (!value) throw new Error(message);
}
const registry = json('governance/ecosystem.json');
gate('governance.adoption', () => {
  const profile = read('governance/PROFILE.md');
  for (let number = 1; number <= 18; number++) {
    const id = 'P' + String(number).padStart(2, '0');
    assert(new RegExp(`(?:^## ${id}\\.|\\| ${id} )`, 'm').test(profile), `Missing ${id}`);
  }
  assert(!/UNRESOLVED|ratification_record=null/.test(profile), 'Incomplete founding authority');
  assert(registry.status === 'operative', 'Governance is not operative');
  const record = json(registry.adoption);
  assert(
    record.authority === 'Sam Starling' &&
      ['owner-instruction-2026-11-07', 'owner-instruction-2026-11-10'].includes(record.basis),
    'Unknown adoption authority',
  );
  for (const [name, hash] of Object.entries(record.documents)) {
    assert(digest(name) === hash, `Adoption hash mismatch: ${name}`);
  }
  for (const control of record.verificationControls || []) {
    assert(digest(control.path) === control.after, `Verification control drift: ${control.path}`);
  }
  assert(read(registry.constitution.path).length > 50000, 'Universal corpus unavailable');
  assert(
    digest(registry.constitution.path) === registry.constitution.sha256,
    'Universal corpus drift',
  );
});
gate('ecosystem.links', () => {
  const readme = read('README.md');
  for (const name of registry.repositories)
    assert(readme.includes(`Zhovten-Games/${name}`), `Missing repository link: ${name}`);
  assert(registry.endpoints.site === 'https://interdead.zhovten.games', 'Wrong public site');
  assert(registry.endpoints.api === 'https://api.interdead.zhovten.games', 'Wrong API origin');
  assert(registry.endpoints.proto === 'https://noir.zhovten.games', 'Wrong prototype origin');
});
if (registry.interop)
  gate('interop.source-snapshot', () => {
    const receipt = json(registry.interop.receipt);
    assert(
      receipt.localPath === registry.interop.module && receipt.wireVersion === 1,
      'Interop source identity differs',
    );
    assert(
      digest(registry.interop.module) === receipt.sha256,
      'Interop snapshot differs from its source receipt',
    );
  });
gate('guest.documentation', () => {
  const body = read('README.md');
  assert(
    !body.includes('The operator runbook and variable registry accompany'),
    'Retired private-operations paragraph',
  );
  const pre = body.match(/<pre>([\s\S]*?)<\/pre>/)?.[1];
  if (pre) {
    const widths = pre
      .trim()
      .split('\n')
      .map((line) => Array.from(line.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&')).length);
    assert(new Set(widths).size === 1, 'Pseudographic frame has inconsistent visible widths');
  }
  for (const match of body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^(?:https?:|mailto:|\/)/.test(target)) continue;
    assert(
      existsSync(path.resolve(root, decodeURIComponent(target))),
      `Missing README target: ${target}`,
    );
  }
});
const documentationOnly = process.argv.includes('--docs');
if (!process.argv.includes('--governance') && !documentationOnly) {
  for (const task of registry.checks) {
    const result = spawnSync(
      task.command[0] === '$node' ? process.execPath : task.command[0],
      task.command.slice(1),
      {
        cwd: path.join(root, task.cwd || '.'),
        encoding: 'utf8',
        shell: false,
        timeout: task.timeoutMs || 300000,
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    gates.push({
      id: task.id,
      status:
        result.error?.code === 'ENOENT' ? 'unavailable' : result.status === 0 ? 'passed' : 'failed',
      exitCode: result.status,
      reason: result.error?.message || (result.status === 0 ? null : 'Command failed'),
    });
  }
}
const gitResult = (args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
const revision = gitResult(['rev-parse', 'HEAD']);
const worktree = gitResult(['status', '--porcelain']);
gate('source.provenance', () => {
  assert(
    revision.status === 0 && worktree.status === 0,
    revision.stderr?.trim() || worktree.stderr?.trim() || 'Git source identity unavailable',
  );
});
const passed = gates.length > 0 && gates.every((row) => row.status === 'passed');
const report = {
  schemaVersion: 1,
  project: registry.project,
  mode: documentationOnly
    ? 'documentation'
    : process.argv.includes('--governance')
      ? 'governance'
      : 'full',
  sourceSha: revision.status === 0 ? revision.stdout.trim() : null,
  dirty: worktree.status === 0 ? !!worktree.stdout.trim() : null,
  toolchain: { node: process.version },
  governanceRevision: registry.revision,
  gates,
  status: passed ? 'passed' : 'failed',
  scope: documentationOnly
    ? 'README, adopted profile and ecosystem links only; no runtime or release acceptance'
    : 'Repository checks; deployment and game acceptance have separate evidence',
  finishedAt: new Date().toISOString(),
};
mkdirSync(path.join(root, '.warden'), { recursive: true });
writeFileSync(path.join(root, '.warden/report.json'), JSON.stringify(report, null, 2) + '\n');
for (const row of gates)
  process.stdout.write(
    `${row.status.toUpperCase()} ${row.id}${row.reason ? ': ' + row.reason : ''}\n`,
  );
process.exitCode = passed ? 0 : 1;
