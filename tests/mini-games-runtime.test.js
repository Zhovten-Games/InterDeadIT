import assert from 'assert';
import MiniGameLauncher from '../themes/InterDead/assets/js/application/minigame/MiniGameLauncher.js';
import EfbdScaleTriggerPort from '../themes/InterDead/assets/js/infrastructure/minigame/EfbdScaleTriggerPort.js';

const createNode = () => ({
  hidden: false,
  attributes: {},
  setAttribute(name, value) {
    this.attributes[name] = value;
    if (name === 'hidden') {
      this.hidden = true;
    }
  },
  removeAttribute(name) {
    delete this.attributes[name];
    if (name === 'hidden') {
      this.hidden = false;
    }
  },
  appendChild(child) {
    this.child = child;
  },
  querySelector() {
    return null;
  },
});

const createRoot = () => {
  const fallback = createNode();
  const mount = createNode();
  const root = {
    id: 'mini-root',
    nodes: {
      '[data-minigame-fallback]': fallback,
      '[data-minigame-mount]': mount,
    },
    querySelector(selector) {
      return this.nodes[selector] || null;
    },
  };
  return { root, fallback, mount };
};

const createAuthPort = (status = 'unauthenticated') => {
  let listener = null;
  return {
    status,
    getSnapshot: () => ({ status }),
    onChange(cb) {
      listener = cb;
      return () => {
        listener = null;
      };
    },
    trigger(next) {
      listener?.(next);
    },
  };
};

describe('MiniGameLauncher', () => {
  it('keeps assets unloaded and fallback visible when unauthenticated', async () => {
    const { root, fallback, mount } = createRoot();
    const loader = {
      styleCalls: [],
      scriptCalls: [],
      loadStyle: async (url) => loader.styleCalls.push(url),
      loadScriptModule: async (url) => {
        loader.scriptCalls.push(url);
        return null;
      },
    };
    const launcher = new MiniGameLauncher({
      authVisibilityPort: createAuthPort('unauthenticated'),
      assetLoader: loader,
    });
    launcher.register({
      rootElement: root,
      assets: { styleUrl: '/style.css', scriptUrl: '/game.js' },
      options: [],
      strings: {},
      locale: 'en',
      scalePort: { recordAnswer: () => ({ status: 'ok' }) },
    });

    assert.strictEqual(fallback.hidden, false);
    assert.strictEqual(mount.hidden, true);
    assert.deepStrictEqual(loader.styleCalls, []);
    assert.deepStrictEqual(loader.scriptCalls, []);
  });

  it('loads assets and forwards locale once authenticated', async () => {
    const { root, fallback, mount } = createRoot();
    const loader = {
      styleCalls: [],
      scriptCalls: [],
      loadStyle: async (url) => {
        loader.styleCalls.push(url);
        return true;
      },
      loadScriptModule: async () => {
        return {
          initEfbdPoll: (payload) => {
            loader.invocation = payload;
          },
        };
      },
    };
    const authPort = createAuthPort('pending');
    const launcher = new MiniGameLauncher({ authVisibilityPort: authPort, assetLoader: loader });
    launcher.register({
      rootElement: root,
      assets: { styleUrl: '/style.css', scriptUrl: '/game.js' },
      options: [{ axis: 'EBF-SOCIAL', label: 'Social' }],
      strings: { prompt: 'prompt' },
      locale: 'ja',
      scalePort: { recordAnswer: () => ({ status: 'ok' }) },
    });

    authPort.trigger({ status: 'authenticated' });
    await new Promise((resolve) => setImmediate(resolve));

    assert.strictEqual(fallback.hidden, true);
    assert.strictEqual(mount.hidden, false);
    assert.deepStrictEqual(loader.styleCalls, ['/style.css']);
    assert.strictEqual(loader.invocation?.locale, 'ja');
    assert.strictEqual(loader.invocation?.options?.[0]?.axis, 'EBF-SOCIAL');
  });
});

describe('EfbdScaleTriggerPort', () => {
  it('delegates to the outbound trigger emitter with the provided context', async () => {
    const calls = [];
    const port = new EfbdScaleTriggerPort({
      emitScaleTrigger: (axis, value, context) => {
        calls.push({ axis, value, context });
        return { status: 'ok' };
      },
    });

    const result = await port.recordAnswer({
      axis: 'EBF-SOCIAL',
      value: 2,
      context: { source: 'poll', locale: 'en' },
    });

    assert.strictEqual(result.status, 'ok');
    assert.deepStrictEqual(calls[0], {
      axis: 'EBF-SOCIAL',
      value: 2,
      context: { source: 'poll', locale: 'en' },
    });
  });
});
