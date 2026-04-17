const { describe, it } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function runCommand(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    ...options,
  });
}

function hasHugoBinary() {
  const result = runCommand('hugo', ['version']);
  return result.status === 0;
}

describe('SEO policies for section-level exclusions', () => {
  it('defines reusable informers policy in config', () => {
    const configPath = path.join('config', '_default', 'config.toml');
    const config = fs.readFileSync(configPath, 'utf8');

    assert.ok(config.includes('[params.seo.sectionPolicies.informers]'));
    assert.ok(config.includes('robots = "noindex,follow"'));
    assert.ok(config.includes('sitemap_exclude = true'));
  });

  it('resolves robots meta via shared SEO policy helper in head template', () => {
    const headPath = path.join('themes', 'InterDead', 'layouts', 'partials', 'head.html');
    const head = fs.readFileSync(headPath, 'utf8');

    assert.ok(head.includes('partial "helpers/seo-policy.html" .'));
    assert.ok(head.includes('<meta name="robots" content="{{ . }}" />'));
  });

  it('filters sitemap pages using shared SEO policy helper', () => {
    const sitemapPath = path.join('themes', 'InterDead', 'layouts', 'sitemap.xml');
    const sitemap = fs.readFileSync(sitemapPath, 'utf8');

    assert.ok(sitemap.includes('partial "helpers/seo-policy.html" .'));
    assert.ok(sitemap.includes('(in $robots "noindex")'));
    assert.ok(sitemap.includes('(not $sitemapExclude)'));
  });

  it(
    'build output excludes informers from sitemap and adds noindex robots to informer page',
    { skip: !hasHugoBinary() },
    () => {
      const outputDir = path.join('tests', '.tmp', 'seo-policy-build');
      fs.rmSync(outputDir, { recursive: true, force: true });

      const build = runCommand('hugo', ['--cleanDestinationDir', '--destination', outputDir]);
      const buildOutput = `${build.stdout ?? ''}\n${build.stderr ?? ''}`.trim();
      assert.strictEqual(build.status, 0, `Hugo build failed:\n${buildOutput}`);

      const informerPagePath = path.join(outputDir, 'informers', 'niro', 'index.html');
      const sitemapPath = path.join(outputDir, 'sitemap.xml');

      assert.ok(fs.existsSync(informerPagePath), `Expected informer page at ${informerPagePath}`);
      assert.ok(fs.existsSync(sitemapPath), `Expected sitemap at ${sitemapPath}`);

      const informerPage = fs.readFileSync(informerPagePath, 'utf8').toLowerCase();
      const sitemap = fs.readFileSync(sitemapPath, 'utf8').toLowerCase();

      assert.ok(
        informerPage.includes('<meta name="robots" content="noindex,follow"'),
        'Informer page must contain noindex,follow robots meta',
      );
      assert.ok(!sitemap.includes('/informers/'), 'Sitemap must not contain any /informers/ entries');
    },
  );
});
