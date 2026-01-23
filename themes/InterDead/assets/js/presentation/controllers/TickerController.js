export default class TickerController {
  constructor({
    tickers = [],
    speed = 0.35,
    resumeDelayMs = 1200,
    prefersReducedMotion = null,
    windowRef = window,
  } = {}) {
    this.tickers = tickers;
    this.speed = speed;
    this.resumeDelayMs = resumeDelayMs;
    this.prefersReducedMotion =
      prefersReducedMotion || windowRef?.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
    this.windowRef = windowRef;
    this.states = [];
    this.animationFrame = null;
    this.lastTimestamp = null;
    this.boundAnimate = (timestamp) => this.animate(timestamp);
    this.boundHandleResize = () => this.handleResize();
    this.boundHandleMotionChange = () => this.handleMotionChange();
  }

  init() {
    if (!Array.isArray(this.tickers) || this.tickers.length === 0) {
      return;
    }

    this.states = this.tickers
      .map((ticker) => this.setupTicker(ticker))
      .filter((state) => state !== null);

    if (this.states.length === 0) {
      return;
    }

    this.prefersReducedMotion?.addEventListener?.('change', this.boundHandleMotionChange);
    this.windowRef?.addEventListener?.('resize', this.boundHandleResize);

    this.start();
  }

  setupTicker(root) {
    if (!root) {
      return null;
    }

    const viewport = root.querySelector('[data-ticker-viewport]');
    const track = root.querySelector('[data-ticker-track]');
    if (!viewport || !track) {
      return null;
    }

    const items = Array.from(track.children);
    const state = {
      root,
      viewport,
      track,
      itemCount: items.length,
      loopWidth: 0,
      isDragging: false,
      pointerId: null,
      startX: 0,
      startScrollLeft: 0,
      pauseUntil: 0,
      shouldAutoScroll: items.length > 1,
      cleanups: [],
    };

    root.classList.add('gm-ticker--interactive');

    if (items.length <= 1) {
      root.classList.add('gm-ticker--single');
      root.classList.remove('gm-ticker--static');
      return state;
    }

    if (!track.dataset.tickerCloned) {
      items.forEach((item) => {
        const clone = item.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
      });
      track.dataset.tickerCloned = 'true';
    }

    const handlePointerDown = (event) => this.handlePointerDown(event, state);
    const handlePointerMove = (event) => this.handlePointerMove(event, state);
    const handlePointerUp = (event) => this.handlePointerUp(event, state);

    viewport.addEventListener('pointerdown', handlePointerDown);
    viewport.addEventListener('pointermove', handlePointerMove);
    viewport.addEventListener('pointerup', handlePointerUp);
    viewport.addEventListener('pointercancel', handlePointerUp);
    viewport.addEventListener('pointerleave', handlePointerUp);

    state.cleanups.push(() => viewport.removeEventListener('pointerdown', handlePointerDown));
    state.cleanups.push(() => viewport.removeEventListener('pointermove', handlePointerMove));
    state.cleanups.push(() => viewport.removeEventListener('pointerup', handlePointerUp));
    state.cleanups.push(() => viewport.removeEventListener('pointercancel', handlePointerUp));
    state.cleanups.push(() => viewport.removeEventListener('pointerleave', handlePointerUp));

    this.updateMetrics(state);

    return state;
  }

  handlePointerDown(event, state) {
    if (!state.shouldAutoScroll) {
      return;
    }

    state.isDragging = true;
    state.pointerId = event.pointerId;
    state.startX = event.clientX;
    state.startScrollLeft = state.viewport.scrollLeft;
    state.pauseUntil = performance.now() + this.resumeDelayMs;
    state.root.classList.add('gm-ticker--dragging');

    if (state.viewport.setPointerCapture && event.pointerId !== null) {
      state.viewport.setPointerCapture(event.pointerId);
    }
  }

  handlePointerMove(event, state) {
    if (!state.isDragging || event.pointerId !== state.pointerId) {
      return;
    }

    const delta = event.clientX - state.startX;
    state.viewport.scrollLeft = state.startScrollLeft - delta;
  }

  handlePointerUp(event, state) {
    if (!state.isDragging || (state.pointerId !== null && event.pointerId !== state.pointerId)) {
      return;
    }

    if (state.viewport.releasePointerCapture && state.pointerId !== null) {
      state.viewport.releasePointerCapture(state.pointerId);
    }

    state.isDragging = false;
    state.pointerId = null;
    state.root.classList.remove('gm-ticker--dragging');
    state.pauseUntil = performance.now() + this.resumeDelayMs;
  }

  updateMetrics(state) {
    const totalWidth = state.track.scrollWidth;
    const viewportWidth = state.viewport.clientWidth;

    this.updateAutoScrollState(state, totalWidth, viewportWidth);
  }

  handleResize() {
    this.states.forEach((state) => this.updateMetrics(state));
  }

  updateAutoScrollState(state, totalWidth, viewportWidth) {
    const hasMultipleItems = state.itemCount > 1;
    const canAutoScroll = hasMultipleItems && totalWidth > viewportWidth;

    state.shouldAutoScroll = canAutoScroll;
    state.loopWidth = canAutoScroll ? totalWidth / 2 : 0;

    state.root.classList.toggle('gm-ticker--single', !hasMultipleItems);
    state.root.classList.toggle('gm-ticker--static', hasMultipleItems && !canAutoScroll);
  }

  handleMotionChange() {
    if (this.prefersReducedMotion?.matches) {
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
    const speedFactor = delta / 16.67;

    this.states.forEach((state) => {
      if (!state.shouldAutoScroll || state.loopWidth <= 0) {
        return;
      }
      if (state.isDragging) {
        return;
      }
      if (performance.now() < state.pauseUntil) {
        return;
      }

      state.viewport.scrollLeft += this.speed * speedFactor;

      if (state.viewport.scrollLeft >= state.loopWidth) {
        state.viewport.scrollLeft -= state.loopWidth;
      }
    });

    this.animationFrame = this.windowRef?.requestAnimationFrame?.(this.boundAnimate) ?? null;
  }

  start() {
    if (this.animationFrame) {
      return;
    }
    if (this.prefersReducedMotion?.matches) {
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
    this.states.forEach((state) => state.cleanups.forEach((cleanup) => cleanup()));
    this.states = [];
  }
}
