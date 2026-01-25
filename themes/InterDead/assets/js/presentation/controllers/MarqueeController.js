const DEFAULT_MARQUEE_GAP = 32;
const TEXT_MARQUEE_ACTIVE_CLASS = 'gm-article__toc-currentText--marquee';
const TEXT_MARQUEE_DISTANCE_VAR = '--gm-toc-marquee-distance';

class BaseMarquee {
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

class ScrollMarquee extends BaseMarquee {
  constructor({ root, windowRef, prefersReducedMotion, speed, resumeDelayMs }) {
    super({ root, windowRef, prefersReducedMotion });
    this.speed = speed;
    this.resumeDelayMs = resumeDelayMs;
    this.viewport = root.querySelector('[data-marquee-viewport]');
    this.track = root.querySelector('[data-marquee-track]');
    this.itemCount = 0;
    this.loopWidth = 0;
    this.shouldAutoScroll = false;
    this.isDragging = false;
    this.pointerId = null;
    this.startX = 0;
    this.startScrollLeft = 0;
    this.pauseUntil = 0;
    this.handlePointerDown = (event) => this.onPointerDown(event);
    this.handlePointerMove = (event) => this.onPointerMove(event);
    this.handlePointerUp = (event) => this.onPointerUp(event);
  }

  init() {
    if (!this.viewport || !this.track) {
      return false;
    }

    const items = Array.from(this.track.children);
    this.itemCount = items.length;

    this.root.classList.add('gm-ticker--interactive');

    if (items.length <= 1) {
      this.root.classList.add('gm-ticker--single');
      this.root.classList.remove('gm-ticker--static');
      return true;
    }

    if (!this.track.dataset.marqueeCloned) {
      items.forEach((item) => {
        const clone = item.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        this.track.appendChild(clone);
      });
      this.track.dataset.marqueeCloned = 'true';
    }

    this.viewport.addEventListener('pointerdown', this.handlePointerDown);
    this.viewport.addEventListener('pointermove', this.handlePointerMove);
    this.viewport.addEventListener('pointerup', this.handlePointerUp);
    this.viewport.addEventListener('pointercancel', this.handlePointerUp);
    this.viewport.addEventListener('pointerleave', this.handlePointerUp);

    this.cleanups.push(() =>
      this.viewport.removeEventListener('pointerdown', this.handlePointerDown),
    );
    this.cleanups.push(() =>
      this.viewport.removeEventListener('pointermove', this.handlePointerMove),
    );
    this.cleanups.push(() => this.viewport.removeEventListener('pointerup', this.handlePointerUp));
    this.cleanups.push(() =>
      this.viewport.removeEventListener('pointercancel', this.handlePointerUp),
    );
    this.cleanups.push(() =>
      this.viewport.removeEventListener('pointerleave', this.handlePointerUp),
    );

    this.updateMetrics();

    return true;
  }

  now() {
    return this.windowRef?.performance?.now?.() ?? Date.now();
  }

  onPointerDown(event) {
    if (!this.shouldAutoScroll) {
      return;
    }

    this.isDragging = true;
    this.pointerId = event.pointerId;
    this.startX = event.clientX;
    this.startScrollLeft = this.viewport.scrollLeft;
    this.pauseUntil = this.now() + this.resumeDelayMs;
    this.root.classList.add('gm-ticker--dragging');

    if (this.viewport.setPointerCapture && event.pointerId !== null) {
      this.viewport.setPointerCapture(event.pointerId);
    }
  }

  onPointerMove(event) {
    if (!this.isDragging || event.pointerId !== this.pointerId) {
      return;
    }

    const delta = event.clientX - this.startX;
    this.viewport.scrollLeft = this.startScrollLeft - delta;
  }

  onPointerUp(event) {
    if (!this.isDragging || (this.pointerId !== null && event.pointerId !== this.pointerId)) {
      return;
    }

    if (this.viewport.releasePointerCapture && this.pointerId !== null) {
      this.viewport.releasePointerCapture(this.pointerId);
    }

    this.isDragging = false;
    this.pointerId = null;
    this.root.classList.remove('gm-ticker--dragging');
    this.pauseUntil = this.now() + this.resumeDelayMs;
  }

  updateMetrics() {
    if (!this.viewport || !this.track) {
      return;
    }
    const totalWidth = this.track.scrollWidth;
    const viewportWidth = this.viewport.clientWidth;
    this.updateAutoScrollState(totalWidth, viewportWidth);
  }

  updateAutoScrollState(totalWidth, viewportWidth) {
    const hasMultipleItems = this.itemCount > 1;
    const canAutoScroll = hasMultipleItems && totalWidth > viewportWidth;

    this.shouldAutoScroll = canAutoScroll;
    this.loopWidth = canAutoScroll ? totalWidth / 2 : 0;

    this.root.classList.toggle('gm-ticker--single', !hasMultipleItems);
    this.root.classList.toggle('gm-ticker--static', hasMultipleItems && !canAutoScroll);
  }

  advance(delta) {
    if (
      this.isReducedMotion ||
      !this.shouldAutoScroll ||
      this.loopWidth <= 0 ||
      this.isDragging ||
      this.now() < this.pauseUntil
    ) {
      return;
    }

    const speedFactor = delta / 16.67;
    this.viewport.scrollLeft += this.speed * speedFactor;

    if (this.viewport.scrollLeft >= this.loopWidth) {
      this.viewport.scrollLeft -= this.loopWidth;
    }
  }
}

class TextMarquee extends BaseMarquee {
  constructor({ root, windowRef, prefersReducedMotion }) {
    super({ root, windowRef, prefersReducedMotion });
    this.viewport = root.querySelector('[data-marquee-viewport]') ?? root;
    this.track = root.querySelector('[data-marquee-track]');
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
  constructor({ roots = [], speed = 0.35, resumeDelayMs = 1200, windowRef = window } = {}) {
    this.roots = roots;
    this.speed = speed;
    this.resumeDelayMs = resumeDelayMs;
    this.windowRef = windowRef;
    this.prefersReducedMotion = windowRef?.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
    this.scrollMarquees = [];
    this.textMarquees = [];
    this.animationFrame = null;
    this.lastTimestamp = null;
    this.boundAnimate = (timestamp) => this.animate(timestamp);
    this.boundHandleResize = () => this.handleResize();
    this.boundHandleMotionChange = () => this.handleMotionChange();
  }

  init() {
    if (!Array.isArray(this.roots) || this.roots.length === 0) {
      return;
    }

    this.roots.forEach((root) => this.register(root));

    if (this.scrollMarquees.length === 0 && this.textMarquees.length === 0) {
      return;
    }

    this.prefersReducedMotion?.addEventListener?.('change', this.boundHandleMotionChange);
    this.windowRef?.addEventListener?.('resize', this.boundHandleResize);

    this.textMarquees.forEach((marquee) => marquee.updateMetrics());
    this.scrollMarquees.forEach((marquee) => marquee.updateMetrics());

    this.start();
  }

  register(root) {
    if (!root?.dataset?.marquee) {
      return;
    }

    if (root.dataset.marquee === 'scroll') {
      const marquee = new ScrollMarquee({
        root,
        windowRef: this.windowRef,
        prefersReducedMotion: this.prefersReducedMotion,
        speed: this.speed,
        resumeDelayMs: this.resumeDelayMs,
      });

      if (marquee.init()) {
        marquee.setReducedMotion(Boolean(this.prefersReducedMotion?.matches));
        this.scrollMarquees.push(marquee);
      }
      return;
    }

    if (root.dataset.marquee === 'text') {
      const marquee = new TextMarquee({
        root,
        windowRef: this.windowRef,
        prefersReducedMotion: this.prefersReducedMotion,
      });

      if (marquee.init()) {
        marquee.setReducedMotion(Boolean(this.prefersReducedMotion?.matches));
        this.textMarquees.push(marquee);
      }
    }
  }

  handleResize() {
    this.scrollMarquees.forEach((marquee) => marquee.updateMetrics());
    this.textMarquees.forEach((marquee) => marquee.updateMetrics());
  }

  handleMotionChange() {
    const isReduced = Boolean(this.prefersReducedMotion?.matches);
    this.scrollMarquees.forEach((marquee) => marquee.setReducedMotion(isReduced));
    this.textMarquees.forEach((marquee) => marquee.setReducedMotion(isReduced));

    if (isReduced) {
      this.stop();
      return;
    }

    this.start();
  }

  animate(timestamp) {
    if (this.prefersReducedMotion?.matches) {
      this.stop();
      return;
    }

    if (this.lastTimestamp === null) {
      this.lastTimestamp = timestamp;
    }
    const delta = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    this.scrollMarquees.forEach((marquee) => marquee.advance(delta));

    this.animationFrame = this.windowRef?.requestAnimationFrame?.(this.boundAnimate) ?? null;
  }

  start() {
    if (this.animationFrame) {
      return;
    }
    if (this.prefersReducedMotion?.matches) {
      return;
    }
    if (this.scrollMarquees.length === 0) {
      return;
    }
    this.lastTimestamp = null;
    this.animationFrame = this.windowRef?.requestAnimationFrame?.(this.boundAnimate) ?? null;
  }

  stop() {
    if (this.animationFrame) {
      this.windowRef?.cancelAnimationFrame?.(this.animationFrame);
      this.animationFrame = null;
    }
    this.lastTimestamp = null;
  }

  dispose() {
    this.stop();
    this.prefersReducedMotion?.removeEventListener?.('change', this.boundHandleMotionChange);
    this.windowRef?.removeEventListener?.('resize', this.boundHandleResize);
    this.scrollMarquees.forEach((marquee) => marquee.dispose());
    this.textMarquees.forEach((marquee) => marquee.dispose());
    this.scrollMarquees = [];
    this.textMarquees = [];
  }
}
