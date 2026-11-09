const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '../themes/InterDead/assets/js/application');
async function productionModule(name) {
  const cache = new Map();
  async function load(file) {
    if (cache.has(file)) return cache.get(file);
    const module = new vm.SourceTextModule(fs.readFileSync(file, 'utf8'), { identifier: file });
    cache.set(file, module);
    await module.link((specifier, parent) =>
      load(path.resolve(path.dirname(parent.identifier), specifier)),
    );
    return module;
  }
  const module = await load(path.join(base, name));
  await module.evaluate();
  return module.namespace;
}
const node = () => ({
  hidden: true,
  setAttribute() {
    this.hidden = true;
  },
  removeAttribute() {
    this.hidden = false;
  },
});
test('public mode mounts the real launcher without identity or a forged session', async () => {
  const { default: Launcher } = await productionModule('minigame/MiniGameLauncher.js');
  const mount = node(),
    fallback = node();
  let initialized = 0;
  const root = {
    id: 'artifact',
    querySelector: (selector) => (selector.includes('fallback') ? fallback : mount),
  };
  const launcher = new Launcher({
    authEnabled: false,
    logger: {},
    assetLoader: {
      async loadScriptModule() {
        return {
          default: async ({ mount: actual }) => {
            assert.equal(actual, mount);
            initialized++;
            return true;
          },
        };
      },
    },
  });
  launcher.register({ rootElement: root, rootId: 'artifact' });
  await new Promise(setImmediate);
  assert.equal(initialized, 1);
  assert.equal(mount.hidden, false);
  assert.equal(fallback.hidden, true);
});
test('enabled mode waits for an authenticated session', async () => {
  const { default: Launcher } = await productionModule('minigame/MiniGameLauncher.js');
  const mount = node(),
    fallback = node();
  let initialized = 0,
    update;
  const root = {
    id: 'artifact',
    querySelector: (selector) => (selector.includes('fallback') ? fallback : mount),
  };
  const launcher = new Launcher({
    logger: {},
    authVisibilityPort: {
      getSnapshot: () => ({ status: 'unauthenticated' }),
      onChange(listener) {
        update = listener;
      },
    },
    assetLoader: {
      async loadScriptModule() {
        return {
          default: async () => {
            initialized++;
            return true;
          },
        };
      },
    },
  });
  launcher.register({ rootElement: root });
  await new Promise(setImmediate);
  assert.equal(initialized, 0);
  assert.equal(mount.hidden, true);
  assert.equal(fallback.hidden, false);
  update({ status: 'authenticated' });
  await new Promise(setImmediate);
  assert.equal(initialized, 1);
  assert.equal(mount.hidden, false);
});
test('an absent switch keeps legacy protected mode; explicit false opens content only', async () => {
  const policy = await productionModule('auth/AccessPolicy.js');
  assert.equal(policy.authorizationEnabled({}), true);
  assert.equal(policy.contentAccess({}, { status: 'pending' }), false);
  assert.equal(policy.contentAccess({ auth: { enabled: false } }, null), true);
});
