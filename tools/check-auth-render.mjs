import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const workspace = mkdtempSync(path.join(os.tmpdir(), 'interdead-auth-'));
try {
  for (const enabled of [false, true]) {
    const output = path.join(workspace, String(enabled));
    const result = spawnSync(process.execPath, ['tools/build-site.mjs', '--destination', output], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, HUGO_INTERDEAD_AUTH_ENABLED: String(enabled) },
    });
    assert.equal(result.status, 0, result.stderr || result.error?.message || result.stdout);
    for (const locale of ['', 'ru/', 'uk/', 'ja/']) {
      const home = readFileSync(path.join(output, locale, 'index.html'), 'utf8');
      const article = readFileSync(
        path.join(output, locale, 'blog/lullaby-archive-pogost-sequence/index.html'),
        'utf8',
      );
      assert.equal(
        home.includes('data-auth-button='),
        enabled,
        `Header/hero: ${locale}/${enabled}`,
      );
      assert.equal(
        home.includes('data-auth-badge='),
        enabled,
        `Mini-profile: ${locale}/${enabled}`,
      );
      assert.equal(
        home.includes('data-auth-helper'),
        enabled,
        `Profile hint: ${locale}/${enabled}`,
      );
      const profile = readFileSync(path.join(output, locale, 'profile/index.html'), 'utf8');
      assert.equal(
        profile.includes('data-local-profile-export'),
        !enabled,
        `Local export: ${locale}/${enabled}`,
      );
      assert.equal(
        profile.includes('data-local-profile-import'),
        !enabled,
        `Local import: ${locale}/${enabled}`,
      );
      assert.equal(
        profile.includes('data-local-completed-count'),
        !enabled,
        `Completion summary: ${locale}/${enabled}`,
      );
      const mount = article.match(/<div[^>]*data-minigame-mount[^>]*>/)?.[0];
      assert.ok(mount, `Missing real artifact: ${locale}`);
      assert.equal(/\bhidden\b/.test(mount), enabled, `Artifact access: ${locale}/${enabled}`);
      assert.ok(home.includes('https://noir.zhovten.games'), 'Prototype launcher URL');
      assert.ok(home.includes('https://interdead.zhovten.games'), 'Canonical site URL');
      assert.ok(
        !home.includes('phantom-draft.com') && !article.includes('phantom-draft.com'),
        'Legacy deployment URL',
      );
    }
  }
  process.stdout.write(
    'PASS Hugo auth matrix: two modes × four locales, headers, profiles and real artifact\n',
  );
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
