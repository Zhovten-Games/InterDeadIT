export default class ScrollEffectsController {
  constructor({ intersectionScenes = [], pinScenes = [] } = {}) {
    this.intersectionScenes = intersectionScenes.filter((scene) => scene?.elements?.length);
    this.pinScenes = pinScenes.filter((scene) => scene?.element && scene?.container);
    this.observers = [];
    this.handleScroll = this.handleScroll.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.isListening = false;
  }

  init() {
    this.initIntersectionScenes();
    this.initPinScenes();
  }

  dispose() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.teardownPinScenes();
  }

  initIntersectionScenes() {
    this.intersectionScenes.forEach((scene) => {
      const {
        elements,
        hiddenClass,
        visibleClass,
        threshold = 0,
        rootMargin = '0px',
        revealOnce = false,
        onEnter,
        onLeave,
      } = scene;

      elements.forEach((element) => {
        if (hiddenClass) {
          element.classList.add(hiddenClass);
        }
      });

      if (typeof IntersectionObserver !== 'function') {
        elements.forEach((element) => {
          this.applyEnterState({ element, visibleClass, hiddenClass, onEnter });
        });
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const element = entry.target;
            if (entry.isIntersecting) {
              this.applyEnterState({ element, visibleClass, hiddenClass, onEnter, entry });
              if (revealOnce) {
                observer.unobserve(element);
              }
              return;
            }
            this.applyLeaveState({ element, visibleClass, hiddenClass, onLeave, entry });
          });
        },
        { threshold, rootMargin },
      );

      elements.forEach((element) => observer.observe(element));
      this.observers.push(observer);
    });
  }

  applyEnterState({ element, visibleClass, hiddenClass, onEnter, entry }) {
    if (visibleClass) {
      element.classList.add(visibleClass);
    }
    if (hiddenClass) {
      element.classList.remove(hiddenClass);
    }
    onEnter?.(element, entry);
  }

  applyLeaveState({ element, visibleClass, hiddenClass, onLeave, entry }) {
    if (visibleClass) {
      element.classList.remove(visibleClass);
    }
    if (hiddenClass) {
      element.classList.add(hiddenClass);
    }
    onLeave?.(element, entry);
  }

  initPinScenes() {
    if (this.pinScenes.length === 0) {
      return;
    }

    this.pinScenes.forEach((scene) => {
      const { element, horizontalClass } = scene;
      element.style.willChange = 'transform';
      if (horizontalClass) {
        element.classList.add(horizontalClass);
      }
    });

    this.isListening = true;
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    window.addEventListener('resize', this.handleResize);
    this.updatePinPositions();
  }

  teardownPinScenes() {
    if (!this.isListening) {
      return;
    }
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleResize);
    this.isListening = false;

    this.pinScenes.forEach((scene) => {
      const { element } = scene;
      element.style.transform = '';
      element.style.willChange = '';
    });
  }

  handleScroll() {
    this.updatePinPositions();
  }

  handleResize() {
    this.updatePinPositions();
  }

  updatePinPositions() {
    this.pinScenes.forEach((scene) => {
      const { element, container, getTopOffset, getBaseX = () => 0 } = scene;
      const containerRect = container.getBoundingClientRect();
      const elementHeight = element.offsetHeight;
      const topOffset = Number(getTopOffset?.()) || 0;
      const maxShift = Math.max(0, containerRect.height - elementHeight - topOffset);

      let shift = 0;
      if (containerRect.top <= topOffset && containerRect.bottom > topOffset + elementHeight) {
        shift = Math.min(maxShift, topOffset - containerRect.top);
      } else if (containerRect.bottom <= topOffset + elementHeight) {
        shift = maxShift;
      }

      const baseX = getBaseX?.();
      element.style.transform = `translate3d(${baseX}, ${Math.max(0, shift)}px, 0)`;
    });
  }
}
