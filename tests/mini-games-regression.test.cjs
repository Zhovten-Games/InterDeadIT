const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
  readFileSync,
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
} = require('node:fs');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { DatabaseSync } = require('node:sqlite');
const { buildSync } = require('esbuild');
const { JSDOM } = require('jsdom');
const vm = require('node:vm');
const path = require('node:path');
const os = require('node:os');

const root = path.resolve(__dirname, '..');
const assets = 'themes/InterDead/assets/';
const output = mkdtempSync(path.join(os.tmpdir(), 'interdead-poll-regression-'));
const locales = ['', 'ru/', 'uk/', 'ja/'];
const polls = [
  ['maria-arcana-blind-spot', '1-efbd-poll', ['EBF-SOCIAL', 'EBF-MIND', 'EBF-EXPOSURE']],
  ['lullaby-archive-pogost-sequence', '2-efbd-poll', ['EBF-MIND', 'EBF-SOCIAL', 'EBF-ABANDON']],
];
const quiet = { info() {}, warn() {}, error() {}, log() {} };
const bundles = new Map();
const turn = () => new Promise(setImmediate);
const waitFor = async (check) => {
  const deadline = Date.now() + 5000;
  while (!check() && Date.now() < deadline) await new Promise((done) => setTimeout(done, 5));
  assert.ok(check(), 'The asynchronous browser/API flow did not settle');
};
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
};
let Profile;

before(async () => {
  Profile = (
    await import(pathToFileURL(path.join(root, assets, 'js/application/profile/poll-progress.mjs')))
  ).PollProfile;
  for (const enabled of [false, true]) {
    const build = spawnSync(
      process.execPath,
      ['tools/build-site.mjs', '--destination', path.join(output, String(enabled))],
      {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, HUGO_INTERDEAD_AUTH_ENABLED: String(enabled) },
      },
    );
    assert.equal(build.status, 0, build.stderr || build.stdout);
  }
});
after(() => rmSync(output, { recursive: true, force: true }));

function page(prefix, slug, enabled = false) {
  const html = readFileSync(
    path.join(output, String(enabled), prefix, 'blog', slug, 'index.html'),
    'utf8',
  );
  const dom = new JSDOM(html, {
    url: `https://interdead.zhovten.games/${prefix}blog/${slug}/`,
    runScripts: 'outside-only',
  });
  dom.window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });
  const scope = { window: {} };
  vm.createContext(scope);
  for (const script of dom.window.document.querySelectorAll('script:not([src])')) {
    if (script.textContent.includes('InterdeadMiniGamesQueue.push')) {
      vm.runInContext(script.textContent, scope);
    }
  }
  return { dom, config: scope.window.InterdeadMiniGamesQueue[0] };
}

async function esm(code, globals = {}) {
  const module = new vm.SourceTextModule(code, {
    context: vm.createContext({
      console: quiet,
      URL,
      TextEncoder,
      TextDecoder,
      structuredClone,
      crypto: globalThis.crypto,
      Request,
      Response,
      Headers,
      btoa,
      atob,
      ...globals,
    }),
  });
  await module.link(() => {
    throw new Error('Regression modules must use the real bundled dependency graph');
  });
  await module.evaluate();
  return module.namespace;
}

async function productionModule(entry, dom) {
  if (!bundles.has(entry)) {
    bundles.set(
      entry,
      buildSync({
        absWorkingDir: root,
        entryPoints: [entry],
        bundle: true,
        format: 'esm',
        platform: 'browser',
        write: false,
      }).outputFiles[0].text,
    );
  }
  return esm(bundles.get(entry), dom ? { window: dom.window, document: dom.window.document } : {});
}

async function pollModule(config, dom, enabled = false) {
  return esm(readFileSync(path.join(output, String(enabled), config.assets.scriptUrl), 'utf8'), {
    window: dom.window,
    document: dom.window.document,
  });
}

const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

for (const enabled of [false, true]) {
  for (const prefix of locales) {
    for (const [slug, gameId, axes] of polls) {
      test(`Hugo poll contract: auth=${enabled}, ${prefix || 'en/'}${gameId}`, () => {
        const { dom, config } = page(prefix, slug, enabled);
        try {
          assert.equal(config.gameId, gameId);
          assert.equal(config.locale, prefix.replace('/', '') || 'en');
          assert.ok(Array.isArray(config.options));
          assert.deepEqual(
            Array.from(config.options, (option) => option.axis),
            axes,
          );
          for (const key of ['strings', 'stringKeys', 'media']) {
            assert.equal(typeof config[key], 'object', key);
          }
          assert.ok(config.strings.profileLink.length > 0);
          for (const url of [
            config.assets.styleUrl,
            config.assets.scriptUrl,
            ...config.media.images,
          ]) {
            assert.match(url, /^\/(?!\/)/);
            assert.ok(!url.includes('"'));
            assert.ok(readFileSync(path.join(output, String(enabled), url)).length > 0);
          }
          const document = dom.window.document;
          assert.equal(
            document.querySelectorAll('script[src*="/js/mini-games/runtime."]').length,
            1,
          );
          assert.equal(document.querySelector('[data-minigame-mount]').hidden, enabled);
          assert.equal(document.querySelector('[data-minigame-fallback]').hidden, !enabled);
        } finally {
          dom.window.close();
        }
      });
    }
  }
}

test('shared Hugo renderer escapes script text and injects one runtime for multiple polls', () => {
  const fixture = path.join(output, 'fixture');
  for (const directory of ['content', 'layouts/_default', 'layouts/shortcodes', 'themes']) {
    mkdirSync(path.join(fixture, directory), { recursive: true });
  }
  symlinkSync(path.join(root, 'themes/InterDead'), path.join(fixture, 'themes/InterDead'), 'dir');
  symlinkSync(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), 'dir');
  writeFileSync(
    path.join(fixture, 'hugo.toml'),
    [
      'baseURL="https://example.test/"',
      'theme="InterDead"',
      'disableKinds=["home","taxonomy","term","section","RSS","sitemap","robotsTXT","404"]',
    ].join('\n'),
  );
  writeFileSync(path.join(fixture, 'layouts/_default/single.html'), '{{ .Content }}');
  writeFileSync(
    path.join(fixture, 'content/probe.md'),
    [
      '+++',
      'title="Polls"',
      '+++',
      '{{< efbd-poll >}}',
      '{{< efbd-poll-2 >}}',
      '{{< probe >}}',
    ].join('\n'),
  );
  const hostile = '</script><script>window.pollInjection=true</script> "quoted" & text';
  writeFileSync(
    path.join(fixture, 'layouts/shortcodes/probe.html'),
    `
    {{ partial "mini-games/efbd-poll.html" (dict
      "shortcode" . "name" "probe" "gameId" "1-efbd-poll"
      "options" (slice (dict "axis" "EBF-MIND" "label" ${JSON.stringify(hostile)}))
      "strings" (dict "success" ${JSON.stringify(hostile)})
      "stringKeys" (dict) "mapUrl" "/image.webp" "media" (dict "images" (slice "/image.webp"))
    ) }}
  `,
  );
  const build = spawnSync(process.env.HUGO_BINARY || 'hugo', [], {
    cwd: fixture,
    encoding: 'utf8',
  });
  assert.equal(build.status, 0, build.stderr || build.stdout);
  const dom = new JSDOM(readFileSync(path.join(fixture, 'public/probe/index.html'), 'utf8'));
  try {
    const scope = { window: {} };
    vm.createContext(scope);
    for (const script of dom.window.document.querySelectorAll('script:not([src])')) {
      vm.runInContext(script.textContent, scope);
    }
    assert.equal(scope.window.pollInjection, undefined);
    const queue = scope.window.InterdeadMiniGamesQueue;
    assert.equal(queue.length, 3);
    assert.equal(queue[2].options[0].label, hostile);
    assert.equal(queue[2].strings.success, hostile);
    assert.equal(new Set(queue.map((config) => config.rootId)).size, 3);
    assert.equal(dom.window.document.querySelectorAll('script[src]').length, 1);
  } finally {
    dom.window.close();
  }
});

for (const [slug, gameId] of polls) {
  for (const first of locales) {
    test(`local completion survives every language transition: ${first || 'en/'}${gameId}`, async () => {
      const storage = memory();
      for (const prefix of [first, ...locales.filter((value) => value !== first)]) {
        const profile = new Profile({ storage });
        const { dom, config } = page(prefix, slug);
        try {
          dom.window.InterdeadPorts = { pollProgress: profile };
          const { default: Port } = await productionModule(
            assets + 'js/infrastructure/minigame/EfbdScaleTriggerPort.js',
            dom,
          );
          let submissions = 0;
          const port = new Port({
            emitScaleTrigger: (axis, value, context) => {
              submissions++;
              return profile.complete(context.source, axis);
            },
            logger: quiet,
          });
          const module = await pollModule(config, dom);
          const root = dom.window.document.getElementById(config.rootId);
          assert.equal(
            module.default({
              ...config,
              root,
              mount: root.querySelector('[data-minigame-mount]'),
              scalePort: port,
              logger: quiet,
            }),
            true,
          );
          const form = root.querySelector('form');
          const inputs = form.querySelectorAll('input');
          assert.equal(inputs.length, 3);
          assert.equal(inputs[0].disabled, prefix !== first);
          if (prefix === first) {
            const slider = form.querySelector('.js-slider-track');
            if (slider) {
              form.querySelector('.gm-slider__nav--next').click();
              assert.match(slider.style.transform, /-100%/);
            } else {
              assert.ok(form.querySelector('.gm-poll__map-image'));
            }
          }
          inputs[0].checked = true;
          form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
          await turn();
          assert.equal(submissions, prefix === first ? 1 : 0);
          assert.equal(profile.hasCompleted(gameId), true);
          assert.ok([...inputs].every((input) => input.disabled));
          assert.equal(
            profile.summary().axes.reduce((sum, axis) => sum + axis.value, 0),
            1,
          );
          if (prefix === first) {
            assert.equal(form.querySelector('[role="status"]').dataset.variant, 'success');
          }
        } finally {
          dom.window.close();
        }
      }
    });
  }
}

test('launcher shares initialization, replaces auth subscriptions and restores visibility', async () => {
  const { dom, config } = page('', polls[0][0], true);
  try {
    const { default: Launcher } = await productionModule(
      assets + 'js/application/minigame/MiniGameLauncher.js',
      dom,
    );
    const listeners = new Set();
    let visibility = { status: 'authenticated' };
    const moduleReady = deferred();
    let loads = 0,
      styles = 0,
      initialized = 0;
    const launcher = new Launcher({
      documentRef: dom.window.document,
      logger: quiet,
      authVisibilityPort: {
        getSnapshot: () => visibility,
        onChange(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      },
      assetLoader: {
        loadScriptModule() {
          loads++;
          return moduleReady.promise;
        },
        loadStyle() {
          styles++;
          return true;
        },
      },
    });
    const root = dom.window.document.getElementById(config.rootId);
    launcher.register(config);
    launcher.refreshAuthBindings();
    launcher.refreshAuthBindings();
    assert.equal(listeners.size, 1);
    assert.equal(loads, 1);
    assert.equal(styles, 1);
    visibility = { status: 'unauthenticated' };
    listeners.forEach((listener) => listener(visibility));
    moduleReady.resolve({ default: () => (++initialized, true) });
    await launcher.renderGame(root);
    assert.equal(initialized, 1);
    assert.equal(root.querySelector('[data-minigame-mount]').hidden, true);
    visibility = { status: 'authenticated' };
    listeners.forEach((listener) => listener(visibility));
    await turn();
    assert.equal(initialized, 1);
    assert.equal(root.querySelector('[data-minigame-mount]').hidden, false);
  } finally {
    dom.window.close();
  }
});

test('one pending submit is retried after rejection and completion prevents forged resubmits', async () => {
  const { dom, config } = page('', polls[0][0]);
  try {
    const module = await pollModule(config, dom);
    const root = dom.window.document.getElementById(config.rootId);
    const pending = deferred();
    let submissions = 0,
      complete = false;
    module.default({
      ...config,
      root,
      mount: root.querySelector('[data-minigame-mount]'),
      logger: quiet,
      scalePort: {
        isCompleted: () => complete,
        recordAnswer: async () => {
          submissions++;
          if (submissions === 1) {
            await pending.promise;
            throw Error('offline');
          }
          complete = true;
          return { status: 'ok' };
        },
      },
    });
    const form = root.querySelector('form');
    const submit = () => form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    submit();
    assert.equal(submissions, 0);
    form.querySelector('input').checked = true;
    submit();
    submit();
    assert.equal(submissions, 1);
    pending.resolve();
    await turn();
    assert.equal(form.querySelector('[type="submit"]').disabled, false);
    assert.equal(form.querySelector('[role="status"]').dataset.variant, 'error');
    submit();
    await turn();
    submit();
    await turn();
    assert.equal(submissions, 2);
    assert.equal(form.querySelector('[type="submit"]').disabled, true);
  } finally {
    dom.window.close();
  }
});

test('failed launcher load can retry and superseded registrations cannot initialize', async () => {
  const { dom, config } = page('', polls[0][0], true);
  try {
    const { default: Launcher } = await productionModule(
      assets + 'js/application/minigame/MiniGameLauncher.js',
      dom,
    );
    const root = dom.window.document.getElementById(config.rootId);
    let loads = 0,
      initialized = 0;
    const old = deferred(),
      current = deferred();
    const launcher = new Launcher({
      authEnabled: false,
      documentRef: dom.window.document,
      logger: quiet,
      assetLoader: {
        loadScriptModule() {
          loads++;
          if (loads === 1) return Promise.reject(Error('offline'));
          return loads === 2 ? old.promise : current.promise;
        },
        loadStyle: () => true,
      },
    });
    launcher.register(config);
    await launcher.renderGame(root);
    assert.equal(root.querySelector('[data-minigame-fallback]').hidden, false);
    const obsolete = launcher.renderGame(root);
    launcher.register(config);
    current.resolve({ default: () => (++initialized, true) });
    await launcher.renderGame(root);
    old.resolve({ default: () => assert.fail('An obsolete registration initialized') });
    await obsolete;
    assert.equal(initialized, 1);
    assert.equal(root.querySelector('[data-minigame-fallback]').hidden, true);
  } finally {
    dom.window.close();
  }
});

// Execute the production Worker and its published Core adapters against real SQLite SQL.
async function workerFixture(completedGames = []) {
  const { default: worker } = await productionModule('workers/interdead-auth/src/worker.js');
  const { CookieSessionStore } = await productionModule('workers/interdead-auth/src/session.js');
  const database = new DatabaseSync(':memory:');
  database.exec(`
    CREATE TABLE profiles (
      profile_id TEXT PRIMARY KEY, data TEXT, last_cleanup_at TEXT,
      last_cleanup_timezone TEXT, delete_count INTEGER DEFAULT 0
    );
    CREATE TABLE efbd_scale (
      profile_id TEXT, axis_code TEXT, score INTEGER, trigger_source TEXT, updated_at TEXT,
      PRIMARY KEY (profile_id, axis_code)
    );
  `);
  database
    .prepare('INSERT INTO profiles (profile_id, data) VALUES (?, ?)')
    .run('visitor', JSON.stringify({ metadata: { profileId: 'visitor' }, completedGames }));
  const binding = {
    prepare(sql) {
      const statement = database.prepare(sql);
      const bound = (params) => ({
        all: async () => ({ results: statement.all(...params) }),
        run: async () => statement.run(...params),
      });
      return { ...bound([]), bind: (...params) => bound(params) };
    },
  };
  const session = new CookieSessionStore('regression-secret', new Map());
  await session.issueSession({ profileId: 'visitor', displayName: 'Visitor' });
  await session.set('interdead_csrf', 'regression-csrf');
  const cookies = session
    .collectCookies()
    .map((value) => value.split(';')[0])
    .join('; ');
  const call = (body, prefix = '', method = 'POST') =>
    worker.fetch(
      new Request(
        `https://api.interdead.zhovten.games/efbd/${method === 'POST' ? 'trigger' : 'summary'}`,
        {
          method,
          headers: {
            Cookie: cookies,
            'X-CSRF-Token': 'regression-csrf',
            Origin: 'https://interdead.zhovten.games',
            Referer: `https://interdead.zhovten.games/${prefix}blog/${polls[0][0]}/`,
            'Content-Type': 'application/json',
          },
          ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
        },
      ),
      { INTERDEAD_CORE: binding, IDENTITY_JWT_SECRET: 'regression-secret' },
    );
  return { call, database };
}

for (const [, gameId] of polls) {
  for (const first of locales) {
    test(`CF completion survives all languages and request shapes: ${first || 'en/'}${gameId}`, async () => {
      const { call, database } = await workerFixture();
      try {
        for (const prefix of [first, ...locales.filter((value) => value !== first)]) {
          const locale = prefix.replace('/', '') || 'en';
          const response = await call(
            {
              axis: 'EBF-MIND',
              value: 1,
              context: { source: gameId, locale },
            },
            prefix,
          );
          assert.equal(response.status, prefix === first ? 204 : 409, await response.text());
          const topLevel = await call(
            { axis: 'EBF-SOCIAL', source: gameId, context: { locale } },
            prefix,
          );
          assert.equal(topLevel.status, 409);
        }
        const summary = await (await call(null, '', 'GET')).json();
        assert.deepEqual(Array.from(summary.completedGames), [gameId]);
        assert.equal(
          summary.axes.reduce((sum, axis) => sum + axis.value, 0),
          1,
        );
        assert.equal(database.prepare('SELECT COUNT(*) AS count FROM efbd_scale').get().count, 5);
        assert.equal((await call({ axis: 'EBF-MIND', source: gameId + ':ru' })).status, 400);
        assert.equal(
          (
            await call({
              axis: 'EBF-MIND',
              source: gameId,
              context: { source: gameId === '1-efbd-poll' ? '2-efbd-poll' : '1-efbd-poll' },
            })
          ).status,
          400,
        );
      } finally {
        database.close();
      }
    });
  }
}

test('CF preserves legacy quoted completion and keeps the other poll independently available', async () => {
  const { call, database } = await workerFixture(['"1-efbd-poll"']);
  try {
    assert.equal(
      (await call({ axis: 'EBF-MIND', context: { source: '1-efbd-poll', locale: 'ja' } }, 'ja/'))
        .status,
      409,
    );
    assert.equal(
      (await call({ axis: 'EBF-MIND', context: { source: '2-efbd-poll', locale: 'uk' } }, 'uk/'))
        .status,
      204,
    );
    const summary = await (await call(null, '', 'GET')).json();
    assert.deepEqual(Array.from(summary.completedGames).sort(), ['1-efbd-poll', '2-efbd-poll']);
    assert.equal(
      summary.axes.reduce((sum, axis) => sum + axis.value, 0),
      1,
    );
  } finally {
    database.close();
  }
});

test('remote progress disables a completed translated form and ignores stale account responses', async () => {
  const { dom, config } = page('ja/', polls[0][0], true);
  try {
    const { default: Bridge } = await productionModule(
      assets + 'js/application/efbd/EfbdScaleBridgeService.js',
      dom,
    );
    const { default: Port } = await productionModule(
      assets + 'js/infrastructure/minigame/EfbdScaleTriggerPort.js',
      dom,
    );
    const pending = deferred();
    let submissions = 0;
    const bridge = new Bridge({
      adapter: {
        fetchSummary: () => pending.promise,
        sendTrigger: async () => (++submissions, { status: 'ok' }),
      },
      eventBus: {
        emit: () =>
          dom.window.dispatchEvent(new dom.window.Event('interdead:poll-progress-updated')),
      },
    });
    bridge.setProfile('visitor');
    dom.window.InterdeadPorts = { pollProgress: bridge };
    const port = new Port({
      emitScaleTrigger: (axis, value, context) => bridge.emitTrigger({ axis, value, context }),
    });
    const module = await pollModule(config, dom, true);
    const root = dom.window.document.getElementById(config.rootId);
    module.default({
      ...config,
      root,
      mount: root.querySelector('[data-minigame-mount]'),
      scalePort: port,
      logger: quiet,
    });
    const fetching = bridge.fetchSummary();
    pending.resolve({
      status: 'ok',
      payload: { profileId: 'visitor', completedGames: ['1-efbd-poll'] },
    });
    await fetching;
    assert.equal(root.querySelector('[type="submit"]').disabled, true);
    assert.match(
      root.querySelector('[role="status"]').textContent,
      new RegExp(config.strings.completed),
    );
    assert.equal(
      (
        await bridge.emitTrigger({
          axis: 'EBF-MIND',
          context: { source: config.gameId, locale: 'ja' },
        })
      ).code,
      'replay_blocked',
    );
    assert.equal(submissions, 0);
    bridge.setProfile('next-visitor');
    const stale = deferred();
    bridge.adapter.fetchSummary = () => stale.promise;
    const staleFetch = bridge.fetchSummary();
    bridge.setProfile('third-visitor');
    stale.resolve({ status: 'ok', payload: { completedGames: ['1-efbd-poll'] } });
    await staleFetch;
    assert.equal(bridge.hasCompleted('1-efbd-poll'), false);
  } finally {
    dom.window.close();
  }
});

for (const enabled of [false, true]) {
  test(`built app and runtime preserve completion after language navigation: auth=${enabled}`, async () => {
    const backend = enabled ? await workerFixture() : null;
    const storage = new Map();
    try {
      for (const prefix of ['', 'ru/']) {
        const { dom } = page(prefix, polls[0][0], enabled);
        const { window } = dom;
        try {
          const errors = [];
          window.addEventListener('error', (event) => errors.push(event.error?.message));
          window.console = quiet;
          window.scrollTo = () => {};
          window.requestAnimationFrame = () => 1;
          window.cancelAnimationFrame = () => {};
          window.IntersectionObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
          };
          // Canvas/layout are outside this DOM test's scope; use the host's feature switches.
          window.document.body.dataset.frameworkMembrane = 'false';
          window.document.body.dataset.frameworkDecorativeTitle = 'false';
          for (const [key, value] of storage) window.localStorage.setItem(key, value);
          window.fetch = async (url, options = {}) => {
            const pathname = new URL(url, window.location.href).pathname;
            if (pathname === '/auth/csrf') return Response.json({ csrfToken: 'regression-csrf' });
            if (pathname === '/auth/session')
              return Response.json({ authenticated: true, profileId: 'visitor' });
            if (pathname.startsWith('/efbd/')) {
              assert.ok(backend, 'Public mode made a protected EFBD request');
              return backend.call(
                options.body ? JSON.parse(options.body) : null,
                prefix,
                options.method || 'GET',
              );
            }
            throw Error('Unexpected network request: ' + url);
          };
          const context = dom.getInternalVMContext();
          for (const [name, value] of Object.entries({
            TextEncoder,
            TextDecoder,
            structuredClone,
            Response,
            Request,
            Headers,
          })) {
            context[name] = value;
          }
          const appendChild = window.document.head.appendChild.bind(window.document.head);
          window.document.head.appendChild = (node) => {
            const result = appendChild(node);
            if (node.tagName === 'LINK')
              queueMicrotask(() => node.dispatchEvent(new window.Event('load')));
            return result;
          };
          for (const script of window.document.querySelectorAll('script:not([src])')) {
            vm.runInContext(script.textContent, context);
          }
          const modules = new Map();
          async function load(url) {
            const pathname = new URL(url, window.location.href).pathname;
            if (modules.has(pathname)) return modules.get(pathname);
            const module = new vm.SourceTextModule(
              readFileSync(path.join(output, String(enabled), pathname), 'utf8'),
              { context, importModuleDynamically: load },
            );
            modules.set(pathname, module);
            await module.link(() => assert.fail('Unexpected unbundled import'));
            await module.evaluate();
            return module;
          }
          for (const script of window.document.querySelectorAll('script[src]')) {
            const url = script.getAttribute('src');
            if (/^\/js\/(?:mini-games\/runtime\.|app\.)/.test(url)) await load(url);
          }
          await waitFor(() => window.document.querySelector('[data-minigame-mount] form'));
          const form = window.document.querySelector('[data-minigame-mount] form');
          assert.ok(form, 'The real entrypoints did not mount the poll');
          if (prefix) {
            await waitFor(() => window.InterdeadPorts.pollProgress.hasCompleted('1-efbd-poll'));
          }
          assert.equal(form.querySelector('[type="submit"]').disabled, prefix !== '');
          form.querySelector('input').checked = true;
          form.dispatchEvent(new window.Event('submit', { cancelable: true }));
          await waitFor(() => window.InterdeadPorts.pollProgress.hasCompleted('1-efbd-poll'));
          assert.equal(form.querySelector('[type="submit"]').disabled, true);
          assert.equal(window.InterdeadPorts.pollProgress.hasCompleted('1-efbd-poll'), true);
          assert.deepEqual(errors, []);
          storage.clear();
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            storage.set(key, window.localStorage.getItem(key));
          }
        } finally {
          window.close();
        }
      }
      if (backend) {
        assert.equal(
          backend.database.prepare('SELECT SUM(score) AS score FROM efbd_scale').get().score,
          1,
        );
      }
    } finally {
      backend?.database.close();
    }
  });
}
