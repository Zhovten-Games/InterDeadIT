const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');

function loadLoaderClasses(contextOverrides = {}) {
  const loaderPath = path.resolve(
    __dirname,
    '../themes/InterDead/static/js/interdead-proto-loader.js',
  );
  const source = fs.readFileSync(loaderPath, 'utf8');

  const context = {
    console,
    URL,
    module: { exports: {} },
    exports: {},
    ...contextOverrides,
  };

  context.globalThis = context;
  if (!context.window) {
    context.window = context;
  }
  if (!context.document) {
    context.document = { querySelector: () => null };
  }

  vm.createContext(context);
  vm.runInContext(source, context, { filename: loaderPath });
  return context.module.exports;
}

function createElement(tagName) {
  const node = {
    tagName: String(tagName).toUpperCase(),
    className: '',
    textContent: '',
    innerHTML: '',
    dataset: {},
    attributes: {},
    children: [],
    listeners: new Map(),
    classList: {
      classes: new Set(),
      add(name) {
        this.classes.add(name);
      },
      remove(name) {
        this.classes.delete(name);
      },
      contains(name) {
        return this.classes.has(name);
      },
      toggle(name, force) {
        if (force === true) {
          this.classes.add(name);
          return true;
        }
        if (force === false) {
          this.classes.delete(name);
          return false;
        }
        if (this.classes.has(name)) {
          this.classes.delete(name);
          return false;
        }
        this.classes.add(name);
        return true;
      },
    },
    appendChild(child) {
      if (child && child.isFragment && Array.isArray(child.children)) {
        this.children.push(...child.children);
      } else {
        this.children.push(child);
      }
      this.firstChild = this.children[0] || null;
      return child;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    getAttribute(name) {
      return this.attributes[name] ?? null;
    },
    addEventListener(type, handler) {
      this.listeners.set(type, handler);
    },
    dispatchEvent(type, event = {}) {
      const handler = this.listeners.get(type);
      if (handler) {
        handler(event);
      }
    },
  };

  return node;
}

function createDocumentFragment() {
  return {
    isFragment: true,
    children: [],
    appendChild(child) {
      this.children.push(child);
      return child;
    },
  };
}

function createDocumentMarker(dataset = {}) {
  const marker = { dataset };
  const bodyChildren = [];
  const headChildren = [];

  const documentRef = {
    location: { href: 'https://example.com/page' },
    querySelector: (selector) => {
      if (selector === '[data-interdead-embed]') {
        return marker;
      }
      return null;
    },
    createElement,
    createDocumentFragment,
    getElementById: (id) => {
      const inHead = headChildren.find((node) => node.id === id);
      return inHead || null;
    },
    head: {
      appendChild: (node) => headChildren.push(node),
    },
    body: {
      appendChild: (node) => bodyChildren.push(node),
    },
  };

  return { documentRef, marker, bodyChildren, headChildren };
}

test('boot does not load app immediately and renders launcher button only', async () => {
  const { InterDeadProtoLoader } = loadLoaderClasses();
  const { documentRef, bodyChildren } = createDocumentMarker({
    interdeadEmbed: 'launcher',
    interdeadSrc: 'https://app.example/',
    interdeadExternalSrc: 'https://app.example/',
  });

  const loader = new InterDeadProtoLoader({
    documentRef,
    windowRef: { open: () => null, close: () => {} },
    logger: { error: () => {}, warn: () => {} },
  });

  await loader.boot();

  assert.strictEqual(bodyChildren.length, 1);
  assert.strictEqual(bodyChildren[0].tagName, 'BUTTON');
  assert.strictEqual(bodyChildren[0].className, 'interdead-site-launcher');
});

test('opens fullscreen iframe only after choosing inline mode', async () => {
  const { InterDeadProtoLoader } = loadLoaderClasses();
  const { documentRef, bodyChildren } = createDocumentMarker({
    interdeadEmbed: 'launcher',
    interdeadSrc: 'https://app.example/',
    interdeadExternalSrc: 'https://external.example/',
  });

  const loader = new InterDeadProtoLoader({
    documentRef,
    windowRef: { open: () => null, close: () => {} },
    logger: { error: () => {}, warn: () => {}, info: () => {} },
  });

  await loader.boot();
  const launcherButton = bodyChildren[0];
  launcherButton.dispatchEvent('click');

  const overlay = bodyChildren[1];
  assert.ok(overlay.classList.contains('interdead-host-modal--visible'));
  const chooserContent = overlay.children[0].children[1].children[0];
  const inlineButton = chooserContent.children[1].children[0];
  inlineButton.dispatchEvent('click');

  const iframe = overlay.children[0].children[1].children.find((node) => node.tagName === 'IFRAME');
  assert.ok(iframe);
  assert.strictEqual(iframe.src, 'https://app.example/');
  assert.strictEqual(
    iframe.allow,
    'camera; microphone; geolocation; fullscreen; clipboard-read; clipboard-write',
  );
  assert.ok(overlay.classList.contains('interdead-host-modal--visible'));
});

test('reads iframe allow policy from marker data attribute', async () => {
  const { InterDeadProtoLoader } = loadLoaderClasses();
  const { documentRef, bodyChildren } = createDocumentMarker({
    interdeadEmbed: 'launcher',
    interdeadSrc: 'https://app.example/',
    interdeadExternalSrc: 'https://external.example/',
    interdeadIframeAllow: 'camera; fullscreen; clipboard-write',
  });

  const loader = new InterDeadProtoLoader({
    documentRef,
    windowRef: { open: () => null, close: () => {} },
    logger: { error: () => {}, warn: () => {}, info: () => {} },
  });

  await loader.boot();
  bodyChildren[0].dispatchEvent('click');

  const overlay = bodyChildren[1];
  const chooserContent = overlay.children[0].children[1].children[0];
  const inlineButton = chooserContent.children[1].children[0];
  inlineButton.dispatchEvent('click');

  const iframe = overlay.children[0].children[1].children.find((node) => node.tagName === 'IFRAME');
  assert.ok(iframe);
  assert.strictEqual(iframe.allow, 'camera; fullscreen; clipboard-write');
});

test('falls back to default iframe allow policy when marker attribute is missing', async () => {
  const { InterDeadProtoLoader } = loadLoaderClasses();
  const { documentRef, bodyChildren } = createDocumentMarker({
    interdeadEmbed: 'launcher',
    interdeadSrc: 'https://app.example/',
    interdeadExternalSrc: 'https://external.example/',
  });

  const loader = new InterDeadProtoLoader({
    documentRef,
    windowRef: { open: () => null, close: () => {} },
    logger: { error: () => {}, warn: () => {}, info: () => {} },
  });

  await loader.boot();
  bodyChildren[0].dispatchEvent('click');

  const overlay = bodyChildren[1];
  const chooserContent = overlay.children[0].children[1].children[0];
  const inlineButton = chooserContent.children[1].children[0];
  inlineButton.dispatchEvent('click');

  const iframe = overlay.children[0].children[1].children.find((node) => node.tagName === 'IFRAME');
  assert.ok(iframe);
  assert.strictEqual(
    iframe.allow,
    'camera; microphone; geolocation; fullscreen; clipboard-read; clipboard-write',
  );
});

test('opens new tab and requests closing current window for external mode', async () => {
  const calls = [];
  const windowRef = {
    open: (url, target, features) => {
      calls.push({ url, target, features });
      return { location: { replace: (targetUrl) => calls.push({ replaced: targetUrl }) } };
    },
    close: () => calls.push({ closed: true }),
  };

  const { InterDeadProtoLoader } = loadLoaderClasses();
  const { documentRef, bodyChildren } = createDocumentMarker({
    interdeadEmbed: 'launcher',
    interdeadSrc: 'https://app.example/',
    interdeadExternalSrc: 'https://external.example/',
  });

  const loader = new InterDeadProtoLoader({
    documentRef,
    windowRef,
    logger: { error: () => {}, warn: () => {}, info: () => {} },
  });

  await loader.boot();
  bodyChildren[0].dispatchEvent('click');
  const overlay = bodyChildren[1];
  const chooserContent = overlay.children[0].children[1].children[0];
  const externalButton = chooserContent.children[1].children[1];

  externalButton.dispatchEvent('click');

  assert.deepStrictEqual(calls[0], {
    url: 'https://external.example/',
    target: '_blank',
    features: 'noopener,noreferrer',
  });
  assert.deepStrictEqual(calls[1], { closed: true });
});

test('keeps close button available in both chooser and inline chat modes', async () => {
  const { InterDeadProtoLoader } = loadLoaderClasses();
  const { documentRef, bodyChildren } = createDocumentMarker({
    interdeadEmbed: 'launcher',
    interdeadSrc: 'https://app.example/',
    interdeadExternalSrc: 'https://external.example/',
    interdeadCloseLabel: 'Close modal',
  });

  const loader = new InterDeadProtoLoader({
    documentRef,
    windowRef: { open: () => null, close: () => {} },
    logger: { error: () => {}, warn: () => {}, info: () => {} },
  });

  await loader.boot();
  bodyChildren[0].dispatchEvent('click');

  const overlay = bodyChildren[1];
  const dialog = overlay.children[0];
  const closeButton = dialog.children[0].children[1];
  assert.strictEqual(closeButton.getAttribute('aria-label'), 'Close modal');

  const chooserContent = dialog.children[1].children[0];
  const inlineButton = chooserContent.children[1].children[0];
  inlineButton.dispatchEvent('click');

  assert.ok(dialog.classList.contains('interdead-host-modal__dialog--chat'));
  const closeButtonInChat = dialog.children[0].children[1];
  assert.ok(closeButtonInChat);
  assert.strictEqual(closeButtonInChat.getAttribute('aria-label'), 'Close modal');
  assert.notStrictEqual(closeButtonInChat.getAttribute('aria-hidden'), 'true');
  assert.notStrictEqual(closeButtonInChat.getAttribute('hidden'), 'true');
});
