import ModalViewPort from '../../ports/ModalViewPort.js';

export default class ModalView extends ModalViewPort {
  constructor(element) {
    super();
    this.element = element;
    this.isOpen = element?.classList?.contains('gm-modal--open') || false;
    this.handleOverlayClick = null;
  }

  open({ onOverlay } = {}) {
    if (!this.element || this.isOpen) {
      return false;
    }
    this.element.classList.add('gm-modal--open');
    this.element.setAttribute('aria-hidden', 'false');
    this.isOpen = true;
    if (onOverlay) {
      this.handleOverlayClick = (event) => {
        if (event.target === this.element) {
          onOverlay();
        }
      };
      this.element.addEventListener('click', this.handleOverlayClick);
    }
    return true;
  }

  close() {
    if (!this.element || !this.isOpen) {
      return false;
    }
    this.element.classList.remove('gm-modal--open');
    this.element.setAttribute('aria-hidden', 'true');
    this.isOpen = false;
    if (this.handleOverlayClick) {
      this.element.removeEventListener('click', this.handleOverlayClick);
      this.handleOverlayClick = null;
    }
    return true;
  }
}
