export default class TwemojiController {
  constructor({ root = null, twemoji = null, observerTarget = null } = {}) {
    this.root = root || document.body;
    this.twemoji = twemoji;
    this.observerTarget = observerTarget || this.root;
    this.observer = null;
  }

  init() {
    this.parse(this.root);
    if (!this.observerTarget || typeof MutationObserver === 'undefined') {
      return;
    }

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          this.parse(node);
        });
      });
    });
    this.observer.observe(this.observerTarget, { childList: true, subtree: true });
  }

  dispose() {
    this.observer?.disconnect?.();
  }

  parse(node) {
    if (!this.twemoji?.parse || !node || node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    this.twemoji.parse(node, {
      folder: 'svg',
      ext: '.svg',
    });
  }
}
