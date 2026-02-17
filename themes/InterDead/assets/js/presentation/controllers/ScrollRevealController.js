export default class ScrollRevealController {
  constructor({
    elements = [],
    hiddenClass = 'gm-scrollReveal',
    visibleClass = 'gm-scrollReveal--visible',
    threshold = 0.2,
    rootMargin = '0px 0px -8% 0px',
  }) {
    this.elements = elements.filter(Boolean);
    this.hiddenClass = hiddenClass;
    this.visibleClass = visibleClass;
    this.threshold = threshold;
    this.rootMargin = rootMargin;
    this.observer = null;
    this.handleIntersection = this.handleIntersection.bind(this);
  }

  init() {
    if (this.elements.length === 0) {
      return;
    }

    this.elements.forEach((element) => {
      element.classList.add(this.hiddenClass);
    });

    if (typeof IntersectionObserver !== 'function') {
      this.revealAll();
      return;
    }

    this.observer = new IntersectionObserver(this.handleIntersection, {
      threshold: this.threshold,
      rootMargin: this.rootMargin,
    });

    this.elements.forEach((element) => {
      this.observer?.observe(element);
    });
  }

  dispose() {
    this.observer?.disconnect();
    this.observer = null;
  }

  revealAll() {
    this.elements.forEach((element) => {
      this.reveal(element);
    });
  }

  reveal(element) {
    element.classList.add(this.visibleClass);
    element.classList.remove(this.hiddenClass);
  }

  handleIntersection(entries) {
    if (!Array.isArray(entries) || entries.length === 0) {
      return;
    }

    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }
      const target = entry.target;
      this.reveal(target);
      this.observer?.unobserve(target);
    });
  }
}
