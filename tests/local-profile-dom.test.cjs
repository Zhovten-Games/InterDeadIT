const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { readFileSync, mkdtempSync, rmSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const output = mkdtempSync(path.join(os.tmpdir(), 'interdead-local-profile-'));
let API;
before(async () => {
  API = await import(
    pathToFileURL(
      path.join(root, 'themes/InterDead/assets/js/application/profile/poll-progress.mjs'),
    )
  );
  const build = spawnSync(process.execPath, ['tools/build-site.mjs', '--destination', output], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, HUGO_INTERDEAD_AUTH_ENABLED: 'false' },
  });
  assert.equal(build.status, 0, build.stderr || build.stdout);
});
after(() => rmSync(output, { recursive: true, force: true }));
async function controllerClass(dom, downloads) {
  const window = dom.window;
  window.URL.createObjectURL = (blob) => {
    downloads.push(blob);
    return 'blob:local-profile-test';
  };
  window.URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = function () {};
  const context = vm.createContext({
    window,
    document: window.document,
    console,
    URL: window.URL,
    Blob,
    TextEncoder,
    TextDecoder,
    structuredClone,
    AbortController: window.AbortController,
    setTimeout,
    clearTimeout,
  });
  const cache = new Map();
  async function load(file) {
    if (cache.has(file)) return cache.get(file);
    const module = new vm.SourceTextModule(readFileSync(file, 'utf8'), {
      context,
      identifier: file,
    });
    cache.set(file, module);
    await module.link((specifier, parent) =>
      load(path.resolve(path.dirname(parent.identifier), specifier)),
    );
    return module;
  }
  const entry = await load(
    path.join(
      root,
      'themes/InterDead/assets/js/presentation/controllers/LocalProfileController.js',
    ),
  );
  await entry.evaluate();
  return entry.namespace.default;
}
async function choose(window, input, bytes) {
  const encoded = new TextEncoder().encode(bytes);
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [{ size: encoded.length, arrayBuffer: async () => encoded.buffer }],
  });
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(setImmediate);
  await new Promise(setImmediate);
}
for (const prefix of ['', 'ru/', 'uk/', 'ja/']) {
  test(`real Hugo local profile: ${prefix || 'en'} imports, displays, exports and clears`, async () => {
    const html = readFileSync(path.join(output, prefix, 'profile/index.html'), 'utf8');
    const dom = new JSDOM(html, { url: 'https://interdead.zhovten.games/' + prefix + 'profile/' });
    const { window } = dom,
      page = window.document.querySelector('[data-profile-page-root]');
    const downloads = [],
      Controller = await controllerClass(dom, downloads);
    const profile = new API.PollProfile({
      storage: window.localStorage,
      onChange: () =>
        window.dispatchEvent(new window.CustomEvent('interdead:poll-progress-updated')),
    });
    const controller = new Controller({ profile, root: page, windowRef: window });
    window.confirm = () => true;
    controller.init();
    assert.equal(page.querySelector('.gm-profile__layout--hidden'), null);
    assert.equal(
      page.querySelector('[data-profile-display-name]').textContent,
      page.dataset.localVisitor,
    );
    const input = page.querySelector('[data-local-profile-import]');
    const game = new API.PollProfile();
    game.complete('1-efbd-poll');
    await choose(window, input, API.withGameProgress('{"schema_version":20}', game));
    assert.equal(page.querySelector('[data-local-completed-count]').textContent, '1');
    assert.equal(page.querySelector('[data-axis-value]').textContent, '—');
    profile.complete('2-efbd-poll', 'EBF-MIND');
    assert.equal(
      page.querySelector('[data-axis-code="EBF-MIND"] [data-axis-value]').textContent,
      '1',
    );
    page.querySelector('[data-local-profile-export]').click();
    assert.deepEqual(API.parseProgress(await downloads[0].text()).completedPolls, [
      '1-efbd-poll',
      '2-efbd-poll',
    ]);
    const previous = profile.exportBytes();
    await choose(window, input, '{"format":"other"}');
    assert.equal(profile.exportBytes(), previous);
    assert.equal(
      page.querySelector('[data-local-profile-feedback]').textContent,
      page.dataset.localInvalid,
    );
    page.querySelector('[data-profile-delete]').click();
    assert.deepEqual(profile.exportObject().completedPolls, []);
    controller.dispose();
    dom.window.close();
  });
}
