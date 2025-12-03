import SliderViewPort from '../../ports/SliderViewPort.js';

export default class SliderView extends SliderViewPort {
  constructor({
    slider,
    track,
    dotsContainer,
    prevControl,
    nextControl,
    scoreboard,
    scoreboardInner,
    scoreboardText,
    scoreboardAnnouncer,
    scoreboardCount,
    fadeMediaQuery,
    mapper,
  }) {
    super();
    this.slider = slider;
    this.track = track;
    this.dotsContainer = dotsContainer;
    this.prevControl = prevControl;
    this.nextControl = nextControl;
    this.scoreboard = scoreboard;
    this.scoreboardInner = scoreboardInner;
    this.scoreboardText = scoreboardText;
    this.scoreboardAnnouncer = scoreboardAnnouncer;
    this.scoreboardCount = scoreboardCount;
    this.fadeMediaQuery = fadeMediaQuery;
    this.mapper = mapper;
    this.dots = [];
    this.pointerDownX = null;
    this.fadeTimeout = null;
    this.prevHandler = null;
    this.nextHandler = null;
    this.pointerHandlers = null;
    this.fadeListenerCleanup = this.registerFadeListener();
  }

  isReady() {
    return Boolean(
      this.slider && this.track && this.dotsContainer && this.prevControl && this.nextControl,
    );
  }

  prepareSlides(collection) {
    if (!this.track) {
      return;
    }
    collection.forEach((entity) => {
      const element = this.mapper?.getElement(entity);
      if (element) {
        this.track.appendChild(element);
      }
    });
  }

  applyMediums(collection) {
    collection.forEach((entity) => {
      this.mapper?.updateElementMediums(entity);
    });
  }

  renderDots(count, onSelect) {
    if (!this.dotsContainer) {
      return;
    }
    this.dots.forEach(({ element, handler }) => {
      element.removeEventListener('click', handler);
    });
    this.dots = [];
    this.dotsContainer.innerHTML = '';
    for (let index = 0; index < count; index += 1) {
      const dot = document.createElement('div');
      dot.className = index === 0 ? 'gm-slider__dot gm-slider__dot--active' : 'gm-slider__dot';
      const handler = () => onSelect(index);
      dot.addEventListener('click', handler);
      this.dotsContainer.appendChild(dot);
      this.dots.push({ element: dot, handler });
    }
  }

  setActiveDot(index) {
    this.dots.forEach(({ element }, idx) => {
      element.classList.toggle('gm-slider__dot--active', idx === index);
    });
  }

  bindNavigation({ onPrev, onNext }) {
    if (this.prevControl) {
      this.prevControl.removeEventListener('click', this.prevHandler);
      this.prevHandler = (event) => {
        event.preventDefault();
        onPrev();
      };
      this.prevControl.addEventListener('click', this.prevHandler);
    }
    if (this.nextControl) {
      this.nextControl.removeEventListener('click', this.nextHandler);
      this.nextHandler = (event) => {
        event.preventDefault();
        onNext();
      };
      this.nextControl.addEventListener('click', this.nextHandler);
    }
  }

  bindSwipe({ onSwipeLeft, onSwipeRight }) {
    if (!this.track) {
      return;
    }
    this.unbindSwipe();
    const handlePointerDown = (event) => {
      this.pointerDownX = event.clientX;
    };
    const handlePointerUp = (event) => {
      if (this.pointerDownX == null) {
        return;
      }
      const delta = event.clientX - this.pointerDownX;
      if (Math.abs(delta) > 30) {
        if (delta < 0) {
          onSwipeLeft();
        } else {
          onSwipeRight();
        }
      }
      this.pointerDownX = null;
    };
    const cancelPointer = () => {
      this.pointerDownX = null;
    };
    this.pointerHandlers = {
      pointerdown: handlePointerDown,
      pointerup: handlePointerUp,
      pointercancel: cancelPointer,
      pointerleave: cancelPointer,
    };
    Object.entries(this.pointerHandlers).forEach(([type, handler]) => {
      this.track.addEventListener(type, handler);
    });
  }

  unbindSwipe() {
    if (!this.track || !this.pointerHandlers) {
      return;
    }
    Object.entries(this.pointerHandlers).forEach(([type, handler]) => {
      this.track.removeEventListener(type, handler);
    });
    this.pointerHandlers = null;
  }

  setTransform(index) {
    if (!this.track) {
      return;
    }
    this.track.style.transform = `translateX(-${index * 100}%)`;
  }

  getScoreboardBaseText() {
    return this.scoreboard?.dataset?.stampText?.trim() ?? '';
  }

  getScoreboardAnnounceTemplate() {
    return this.scoreboard?.dataset?.stampAnnounce?.trim() ?? '';
  }

  updateScoreboard({ baseText = '', displayCount = '', announcement = '', animate = false } = {}) {
    if (this.scoreboardText && baseText) {
      this.scoreboardText.textContent = baseText;
    }
    if (this.scoreboardCount) {
      this.scoreboardCount.textContent = displayCount;
    }
    if (this.scoreboard) {
      if (announcement) {
        this.scoreboard.setAttribute('aria-label', announcement);
      } else {
        this.scoreboard.removeAttribute('aria-label');
      }
    }
    if (this.scoreboardAnnouncer) {
      this.scoreboardAnnouncer.textContent = announcement;
    }
    if (animate && this.scoreboardInner) {
      this.scoreboardInner.classList.remove('gm-slider__scoreboardInner--animate');
      void this.scoreboardInner.offsetWidth;
      this.scoreboardInner.classList.add('gm-slider__scoreboardInner--animate');
    }
    this.revealScoreboard();
  }

  revealScoreboard() {
    if (!this.scoreboard) {
      return;
    }
    this.scoreboard.classList.remove('gm-slider__scoreboard--faded');
    this.clearFadeTimeout();
    if (this.fadeMediaQuery?.matches) {
      this.fadeTimeout = window.setTimeout(() => {
        if (this.fadeMediaQuery?.matches && this.scoreboard) {
          this.scoreboard.classList.add('gm-slider__scoreboard--faded');
        }
      }, 1600);
    }
  }

  syncFade() {
    if (!this.scoreboard) {
      return;
    }
    this.clearFadeTimeout();
    if (!this.fadeMediaQuery?.matches) {
      this.scoreboard.classList.remove('gm-slider__scoreboard--faded');
      return;
    }
    if (this.scoreboard.classList.contains('gm-slider__scoreboard--faded')) {
      return;
    }
    this.fadeTimeout = window.setTimeout(() => {
      if (this.fadeMediaQuery?.matches && this.scoreboard) {
        this.scoreboard.classList.add('gm-slider__scoreboard--faded');
      }
    }, 1600);
  }

  clearFadeTimeout() {
    if (this.fadeTimeout !== null) {
      window.clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }
  }

  registerFadeListener() {
    if (!this.fadeMediaQuery) {
      return () => {};
    }
    const handler = () => this.syncFade();
    if (typeof this.fadeMediaQuery.addEventListener === 'function') {
      this.fadeMediaQuery.addEventListener('change', handler);
      return () => this.fadeMediaQuery.removeEventListener('change', handler);
    }
    if (typeof this.fadeMediaQuery.addListener === 'function') {
      this.fadeMediaQuery.addListener(handler);
      return () => this.fadeMediaQuery.removeListener(handler);
    }
    return () => {};
  }

  destroy() {
    this.dots.forEach(({ element, handler }) => {
      element.removeEventListener('click', handler);
    });
    this.dots = [];
    if (this.prevControl && this.prevHandler) {
      this.prevControl.removeEventListener('click', this.prevHandler);
      this.prevHandler = null;
    }
    if (this.nextControl && this.nextHandler) {
      this.nextControl.removeEventListener('click', this.nextHandler);
      this.nextHandler = null;
    }
    this.unbindSwipe();
    this.clearFadeTimeout();
    if (this.fadeListenerCleanup) {
      this.fadeListenerCleanup();
      this.fadeListenerCleanup = null;
    }
  }
}
