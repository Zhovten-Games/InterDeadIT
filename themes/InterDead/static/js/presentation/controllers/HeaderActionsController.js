export default class HeaderActionsController {
  constructor({ header, actionsContainer, anchors = [] }) {
    this.header = header;
    this.actionsContainer = actionsContainer;
    this.anchors = anchors;
    this.boundUpdate = this.updateVisibility.bind(this);
  }

  boot() {
    if (!this.actionsContainer || !this.header) {
      return;
    }
    this.updateVisibility();
    window.addEventListener('scroll', this.boundUpdate, { passive: true });
    window.addEventListener('resize', this.boundUpdate);
  }

  dispose() {
    window.removeEventListener('scroll', this.boundUpdate);
    window.removeEventListener('resize', this.boundUpdate);
  }

  refresh() {
    window.requestAnimationFrame(() => this.updateVisibility());
  }

  updateVisibility() {
    if (!this.actionsContainer || !this.header) {
      return;
    }
    const anchor = this.getVisibleAnchor();
    if (!anchor) {
      this.actionsContainer.classList.remove('gm-header__actions--visible');
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const headerBottom = this.header.offsetHeight;
    const shouldShow = rect.top <= headerBottom;
    this.actionsContainer.classList.toggle('gm-header__actions--visible', shouldShow);
  }

  getVisibleAnchor() {
    for (const anchor of this.anchors) {
      if (anchor && anchor.offsetParent !== null) {
        return anchor;
      }
    }
    return null;
  }
}
