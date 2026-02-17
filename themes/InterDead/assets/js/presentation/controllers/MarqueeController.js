const DEFAULT_MARQUEE_GAP = 32;
const TEXT_MARQUEE_ACTIVE_CLASS = 'gm-article__toc-currentText--marquee';
const TEXT_MARQUEE_DISTANCE_VAR = '--gm-toc-marquee-distance';

class BaseTextMarquee {
  constructor({ root, windowRef, prefersReducedMotion }) {
    this.root = root;
    this.windowRef = windowRef;
    this.prefersReducedMotion = prefersReducedMotion;
    this.isReducedMotion = Boolean(prefersReducedMotion?.matches);
    this.cleanups = [];
  }

  init() {
    return false;
  }

  updateMetrics() {}

  setReducedMotion(isReduced) {
    this.isReducedMotion = isReduced;
    this.updateMetrics();
  }

  dispose() {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
  }
}

class OverflowTextMarquee extends BaseTextMarquee {
  constructor({ root, windowRef, prefersReducedMotion }) {
    super({ root, windowRef, prefersReducedMotion });
    this.viewport = root.querySelector('[data-marquee-viewport]') ?? root;
    this.track = root.querySelector('[data-marquee-track]') ?? root;
    this.mediaQueryText = root.dataset.marqueeMedia || '';
    this.mediaQuery = this.mediaQueryText
      ? this.windowRef?.matchMedia?.(this.mediaQueryText) || null
      : null;
    this.mutationObserver = null;
    this.resizeObserver = null;
    this.handleMediaChange = () => this.updateMetrics();
  }

  init() {
    if (!this.track || !this.viewport) {
      return false;
    }

    if (this.mediaQuery?.addEventListener) {
      this.mediaQuery.addEventListener('change', this.handleMediaChange);
      this.cleanups.push(() =>
        this.mediaQuery.removeEventListener('change', this.handleMediaChange),
      );
    }

    if (this.windowRef?.MutationObserver) {
      this.mutationObserver = new this.windowRef.MutationObserver(() => this.updateMetrics());
      this.mutationObserver.observe(this.track, {
        subtree: true,
        childList: true,
        characterData: true,
      });
      this.cleanups.push(() => this.mutationObserver?.disconnect());
    }

    if (this.windowRef?.ResizeObserver) {
      this.resizeObserver = new this.windowRef.ResizeObserver(() => this.updateMetrics());
      this.resizeObserver.observe(this.viewport);
      this.resizeObserver.observe(this.track);
      this.cleanups.push(() => this.resizeObserver?.disconnect());
    }

    this.updateMetrics();

    return true;
  }

  updateMetrics() {
    if (!this.track || !this.viewport) {
      return;
    }

    this.track.classList.remove(TEXT_MARQUEE_ACTIVE_CLASS);
    this.track.style.removeProperty(TEXT_MARQUEE_DISTANCE_VAR);

    if (this.isReducedMotion) {
      return;
    }

    if (this.mediaQuery && !this.mediaQuery.matches) {
      return;
    }

    const requiresMarquee = this.track.scrollWidth - 2 > this.viewport.clientWidth;
    if (!requiresMarquee) {
      return;
    }

    const distance = this.track.scrollWidth + DEFAULT_MARQUEE_GAP;
    this.track.style.setProperty(TEXT_MARQUEE_DISTANCE_VAR, `${distance}px`);
    this.track.classList.add(TEXT_MARQUEE_ACTIVE_CLASS);
  }
}

export default class MarqueeController {
  constructor({ roots = [], windowRef = window } = {}) {
    this.roots = roots;
    this.windowRef = windowRef;
    this.prefersReducedMotion = windowRef?.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
    this.textMarquees = [];
    this.boundHandleResize = () => this.handleResize();
    this.boundHandleMotionChange = () => this.handleMotionChange();
  }

  init() {
    if (!Array.isArray(this.roots) || this.roots.length === 0) {
      return;
    }

    this.roots.forEach((root) => this.register(root));

    if (this.textMarquees.length === 0) {
      return;
    }

    this.prefersReducedMotion?.addEventListener?.('change', this.boundHandleMotionChange);
    this.windowRef?.addEventListener?.('resize', this.boundHandleResize);

    this.textMarquees.forEach((marquee) => marquee.updateMetrics());
  }

  register(root) {
    if (!root?.dataset?.marquee) {
      return;
    }

    if (root.dataset.marquee !== 'text') {
      return;
    }

    const marquee = new OverflowTextMarquee({
      root,
      windowRef: this.windowRef,
      prefersReducedMotion: this.prefersReducedMotion,
    });

    if (marquee.init()) {
      marquee.setReducedMotion(Boolean(this.prefersReducedMotion?.matches));
      this.textMarquees.push(marquee);
    }
  }

  handleResize() {
    this.textMarquees.forEach((marquee) => marquee.updateMetrics());
  }

  handleMotionChange() {
    const isReduced = Boolean(this.prefersReducedMotion?.matches);
    this.textMarquees.forEach((marquee) => marquee.setReducedMotion(isReduced));
  }

  dispose() {
    this.prefersReducedMotion?.removeEventListener?.('change', this.boundHandleMotionChange);
    this.windowRef?.removeEventListener?.('resize', this.boundHandleResize);
    this.textMarquees.forEach((marquee) => marquee.dispose());
    this.textMarquees = [];
  }
}
