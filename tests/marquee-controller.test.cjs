const { describe, it } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadMarqueeController() {
  const sourcePath = path.join(
    'themes',
    'InterDead',
    'assets',
    'js',
    'presentation',
    'controllers',
    'MarqueeController.js',
  );
  const source = fs
    .readFileSync(sourcePath, 'utf8')
    .replace('export default class MarqueeController', 'class MarqueeController');

  const script = `${source}\nmodule.exports = MarqueeController;`;
  const context = {
    module: { exports: {} },
    exports: {},
  };
  vm.createContext(context);
  vm.runInContext(script, context, { filename: sourcePath });
  return context.module.exports;
}

function createClassList() {
  const classes = new Set();
  return {
    add: (name) => classes.add(name),
    remove: (name) => classes.delete(name),
    contains: (name) => classes.has(name),
  };
}

function createTrack({ scrollWidth }) {
  const classList = createClassList();
  const styles = new Map();
  return {
    scrollWidth,
    classList,
    style: {
      setProperty: (name, value) => styles.set(name, value),
      removeProperty: (name) => styles.delete(name),
      getPropertyValue: (name) => styles.get(name) || '',
    },
  };
}

function createRoot({ viewportWidth, trackWidth, media = '' }) {
  const viewport = { clientWidth: viewportWidth };
  const track = createTrack({ scrollWidth: trackWidth });
  return {
    dataset: {
      marquee: 'text',
      marqueeMedia: media,
    },
    querySelector: (selector) => {
      if (selector === '[data-marquee-viewport]') return viewport;
      if (selector === '[data-marquee-track]') return track;
      return null;
    },
    __refs: { track },
  };
}

function createWindowRef({ mediaMatches = true } = {}) {
  class NoopObserver {
    observe() {}
    disconnect() {}
  }

  const motionQuery = {
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  const mediaQuery = {
    matches: mediaMatches,
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  return {
    MutationObserver: NoopObserver,
    ResizeObserver: NoopObserver,
    matchMedia: (query) =>
      query === '(prefers-reduced-motion: reduce)' ? motionQuery : mediaQuery,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

describe('MarqueeController', () => {
  it('enables text marquee when text overflows', () => {
    const MarqueeController = loadMarqueeController();
    const root = createRoot({ viewportWidth: 160, trackWidth: 420 });
    const controller = new MarqueeController({ roots: [root], windowRef: createWindowRef() });

    controller.init();

    assert.ok(root.__refs.track.classList.contains('gm-article__toc-currentText--marquee'));
    assert.strictEqual(root.__refs.track.style.getPropertyValue('--gm-toc-marquee-distance'), '452px');
  });

  it('does not enable marquee when media query does not match', () => {
    const MarqueeController = loadMarqueeController();
    const root = createRoot({ viewportWidth: 160, trackWidth: 420, media: '(max-width: 100px)' });
    const controller = new MarqueeController({
      roots: [root],
      windowRef: createWindowRef({ mediaMatches: false }),
    });

    controller.init();

    assert.ok(!root.__refs.track.classList.contains('gm-article__toc-currentText--marquee'));
  });

  it('activates marquee class for long post-page TOC labels on mobile breakpoint', () => {
    const MarqueeController = loadMarqueeController();
    const root = {
      dataset: {
        marquee: 'text',
        marqueeMedia: '(max-width: 979px)',
      },
      querySelector: (selector) => {
        if (selector === '[data-marquee-viewport]') return { clientWidth: 140 };
        if (selector === '[data-marquee-track]') {
          return {
            scrollWidth: 480,
            classList: createClassList(),
            style: {
              _store: new Map(),
              setProperty(name, value) {
                this._store.set(name, value);
              },
              removeProperty(name) {
                this._store.delete(name);
              },
              getPropertyValue(name) {
                return this._store.get(name) || '';
              },
            },
          };
        }
        return null;
      },
    };

    const track = root.querySelector('[data-marquee-track]');
    root.querySelector = (selector) => {
      if (selector === '[data-marquee-viewport]') return { clientWidth: 140 };
      if (selector === '[data-marquee-track]') return track;
      return null;
    };

    const controller = new MarqueeController({
      roots: [root],
      windowRef: createWindowRef({ mediaMatches: true }),
    });

    controller.init();

    assert.ok(track.classList.contains('gm-article__toc-currentText--marquee'));
    assert.ok(track.style.getPropertyValue('--gm-toc-marquee-distance').endsWith('px'));
  });
});
