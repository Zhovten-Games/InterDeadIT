import ModalViewPort from '../../ports/ModalViewPort.js';
import { MODAL_DIALOG_WIDTH_MODES } from '../../domain/modal/ModalEntity.js';

export default class ModalView extends ModalViewPort {
  constructor(element) {
    super();
    this.element = element;
    this.dialog = element?.querySelector?.('.gm-modal__dialog') || null;
    this.isOpen = element?.classList?.contains('gm-modal--open') || false;
    this.handleOverlayClick = null;
  }

  open({ onOverlay, dialogViewportOffset = null, dialogWidthMode = null } = {}) {
    if (!this.element || this.isOpen) {
      return false;
    }
    this.applyDialogViewportOffset(dialogViewportOffset);
    this.applyDialogWidthMode(dialogWidthMode);
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

  applyDialogViewportOffset(offset) {
    if (!this.dialog) {
      return;
    }
    if (typeof offset !== 'number' || !Number.isFinite(offset) || offset < 0) {
      this.dialog.style.removeProperty('--gm-modal-dialog-viewport-offset');
      return;
    }
    this.dialog.style.setProperty('--gm-modal-dialog-viewport-offset', `${offset}px`);
  }

  applyDialogWidthMode(mode) {
    if (!this.dialog) {
      return;
    }
    if (mode === MODAL_DIALOG_WIDTH_MODES.VIEWPORT) {
      this.dialog.style.setProperty(
        '--gm-modal-dialog-width',
        'calc(100vw - var(--gm-modal-dialog-viewport-offset, 40px))',
      );
      return;
    }
    this.dialog.style.removeProperty('--gm-modal-dialog-width');
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
