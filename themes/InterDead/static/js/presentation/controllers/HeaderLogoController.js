export default class HeaderLogoController {
  constructor({ logoElement, targetElement, visibleClass = 'gm-header__logo--visible' }) {
    this.logoElement = logoElement;
    this.targetElement = targetElement;
    this.visibleClass = visibleClass;
    this.observer = null;
    this.handleIntersection = this.handleIntersection.bind(this);
  }

  init() {
    if (!this.logoElement) {
      return;
    }
    if (!this.targetElement || typeof IntersectionObserver !== 'function') {
      this.setVisibility(true);
      return;
    }
    this.setVisibility(false);
    this.observer = new IntersectionObserver(this.handleIntersection, { threshold: 0.35 });
    this.observer.observe(this.targetElement);
  }

  dispose() {
    this.observer?.disconnect();
    this.observer = null;
  }

  handleIntersection(entries) {
    if (!Array.isArray(entries) || entries.length === 0) {
      return;
    }
    const entry = entries[entries.length - 1];
    this.setVisibility(!entry.isIntersecting);
  }

  setVisibility(shouldShow) {
    this.logoElement.classList.toggle(this.visibleClass, Boolean(shouldShow));
  }
}
