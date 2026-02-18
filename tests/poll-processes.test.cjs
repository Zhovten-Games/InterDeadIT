const { describe, it } = require('node:test');
const assert = require('assert');
const fs = require('fs/promises');
const path = require('path');
const { pathToFileURL } = require('url');

const loadAsEsmCopy = async (relativePath) => {
  const sourcePath = path.resolve(__dirname, '..', relativePath);
  const source = await fs.readFile(sourcePath, 'utf8');
  const tempRoot = path.resolve(__dirname, '.tmp-esm');
  await fs.mkdir(tempRoot, { recursive: true });
  const dir = await fs.mkdtemp(path.join(tempRoot, 'module-'));
  const filePath = path.join(dir, path.basename(relativePath, '.js') + '.mjs');
  await fs.writeFile(filePath, source, 'utf8');
  return import(pathToFileURL(filePath).href);
};

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.listeners = new Map();
    this.hidden = false;
    this.disabled = false;
    this.textContent = '';
    this.className = '';
    this.name = '';
    this.value = '';
    this.checked = false;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  addEventListener(eventName, listener) {
    this.listeners.set(eventName, listener);
  }

  async dispatch(eventName, event) {
    const listener = this.listeners.get(eventName);
    if (listener) {
      await listener(event);
    }
  }

  querySelector(selector) {
    if (selector === 'input[name="efbd-poll-option"]:checked') {
      return this.find(
        (node) => node.tagName === 'INPUT' && node.name === 'efbd-poll-option' && node.checked,
      );
    }
    return null;
  }

  find(predicate) {
    for (const child of this.children) {
      if (predicate(child)) {
        return child;
      }
      const nested = child.find?.(predicate);
      if (nested) {
        return nested;
      }
    }
    return null;
  }
}

class FakeDocument {
  constructor() {
    this.body = { dataset: { profileUrl: '/profile/' } };
    this.rootsById = new Map();
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  createTextNode(text) {
    return { nodeType: 3, textContent: text, ownerDocument: this };
  }

  getElementById(id) {
    return this.rootsById.get(id) || null;
  }
}

const createPollContext = () => {
  const documentRef = new FakeDocument();
  const root = new FakeElement('div', documentRef);
  root.id = 'poll-root';
  root.dataset.mapUrl = '/tower.webp';
  const fallback = new FakeElement('div', documentRef);
  const mount = new FakeElement('div', documentRef);
  root.querySelector = (selector) => {
    if (selector === '[data-minigame-fallback]') {
      return fallback;
    }
    if (selector === '[data-minigame-mount]') {
      return mount;
    }
    return null;
  };
  documentRef.rootsById.set(root.id, root);

  return { root, mount, fallback, documentRef };
};

describe('Poll processes', () => {
  it('forwards media and gameId from launcher to poll initializer', async () => {
    const { root, documentRef } = createPollContext();
    const invocation = {};

    const { default: MiniGameLauncher } = await loadAsEsmCopy('themes/InterDead/assets/js/application/minigame/MiniGameLauncher.js');

    const launcher = new MiniGameLauncher({
      authVisibilityPort: {
        getSnapshot: () => ({ status: 'authenticated' }),
        onChange: () => () => {},
      },
      assetLoader: {
        loadStyle: async () => true,
        loadScriptModule: async () => ({
          initEfbdPoll: (payload) => {
            invocation.payload = payload;
            return true;
          },
        }),
      },
      documentRef,
      logger: { info: () => {}, warn: () => {}, error: () => {} },
      scalePort: { recordAnswer: async () => ({ status: 'ok' }) },
    });

    launcher.register({
      rootId: 'poll-root',
      assets: { styleUrl: '/style.css', scriptUrl: '/game.js' },
      options: [{ axis: 'EBF-SOCIAL', label: 'Social' }],
      strings: { prompt: 'Prompt' },
      media: { type: 'video', url: 'https://example.com/embed' },
      locale: 'en',
      gameId: '2-efbd-poll',
    });

    await new Promise((resolve) => setImmediate(resolve));

    assert.strictEqual(invocation.payload.media.type, 'video');
    assert.strictEqual(invocation.payload.gameId, '2-efbd-poll');
  });



  it('keeps poll-2 shortcode queue configured for video mode', async () => {
    const templatePath = path.resolve(__dirname, '..', 'themes/InterDead/layouts/shortcodes/efbd-poll-2.html');
    const template = await fs.readFile(templatePath, 'utf8');

    assert.match(template, /dict\s+"type"\s+"video"/);
    assert.match(template, /ARTIFACT-THE_LULLABY\.webp/);
    assert.match(template, /"sourceId"\s+\$videoSourceId/);
    assert.match(template, /gameId:\s*\{\{\s*\$gameId\s*\|\s*jsonify\s*\}\}/);
  });
  it('renders video, validates required selection, and submits selected answer', async () => {
    const { root, mount } = createPollContext();
    global.window = {
      InterdeadNotifications: {
        showSuccess: () => {},
        showError: () => {},
      },
    };
    const scaleCalls = [];
    const { default: initEfbdPoll } = await loadAsEsmCopy('themes/InterDead/assets/mini-games/efbd-poll/poll.js');

    initEfbdPoll({
      root,
      mount,
      locale: 'ru',
      gameId: '2-efbd-poll',
      options: [{ axis: 'EBF-SOCIAL', label: 'Social' }],
      strings: {
        submit: 'Send',
        success: 'Saved',
        required: 'Pick one option first.',
        mapAlt: 'Video',
      },
      media: { type: 'video', sourceId: 'sw63yEVj4AM' },
      scalePort: {
        recordAnswer: async (payload) => {
          scaleCalls.push(payload);
          return { status: 'ok' };
        },
      },
      logger: { info: () => {}, error: () => {} },
    });

    const iframe = mount.find((node) => node.tagName === 'IFRAME');
    assert.ok(iframe);
    assert.strictEqual(iframe.src, 'https://www.youtube.com/embed/sw63yEVj4AM');

    const form = mount.find((node) => node.tagName === 'FORM');
    const status = mount.find((node) => node.tagName === 'P' && node.className === 'gm-poll__status');
    await form.dispatch('submit', { preventDefault: () => {} });
    assert.strictEqual(status.textContent, 'Pick one option first.');

    const radio = mount.find((node) => node.tagName === 'INPUT' && node.name === 'efbd-poll-option');
    radio.checked = true;
    await form.dispatch('submit', { preventDefault: () => {} });

    assert.strictEqual(scaleCalls.length, 1);
    assert.strictEqual(scaleCalls[0].context.source, '2-efbd-poll');
    assert.strictEqual(scaleCalls[0].context.locale, 'ru');
  });
});
