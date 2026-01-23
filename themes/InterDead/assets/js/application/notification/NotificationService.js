import ModalEntity, { MODAL_SCROLL_BEHAVIORS } from '../../domain/modal/ModalEntity.js';
import ModalView from '../../infrastructure/ui/ModalView.js';

export default class NotificationService {
  constructor({
    modalService,
    documentRef = typeof document !== 'undefined' ? document : null,
  } = {}) {
    this.modalService = modalService;
    this.document = documentRef;
    this.modalId = 'notification-modal';
    this.titleElement = null;
    this.messageElement = null;
    this.instance = null;
    this.ensureModal();
  }

  ensureModal() {
    if (!this.document || !this.modalService) {
      return;
    }
    const existing = this.document.querySelector(`[data-modal="${this.modalId}"]`);
    const element = existing || this.createModalElement();
    if (!element) return;
    const entity = new ModalEntity({
      id: this.modalId,
      closeOnOverlay: true,
      scrollBehavior: MODAL_SCROLL_BEHAVIORS.LOCK,
    });
    const view = new ModalView(element);
    this.instance = this.modalService.register({ entity, view });
    this.titleElement = element.querySelector('[data-notification-title]');
    this.messageElement = element.querySelector('[data-notification-message]');
  }

  createModalElement() {
    const root = this.document.createElement('div');
    root.className = 'gm-modal gm-modal--notification';
    root.dataset.modal = this.modalId;
    root.setAttribute('aria-hidden', 'true');

    const dialog = this.document.createElement('div');
    dialog.className = 'gm-modal__dialog gm-modal__dialog--notification';
    const header = this.document.createElement('div');
    header.className = 'gm-modal__header';
    const title = this.document.createElement('h2');
    title.className = 'gm-modal__title';
    title.dataset.notificationTitle = 'true';
    const close = this.document.createElement('button');
    close.type = 'button';
    close.className = 'gm-modal__close';
    close.textContent = '×';
    close.addEventListener('click', () => this.modalService.close(this.modalId));
    header.appendChild(title);
    header.appendChild(close);

    const body = this.document.createElement('div');
    body.className = 'gm-modal__body';
    const message = this.document.createElement('p');
    message.className = 'gm-modal__hint';
    message.dataset.notificationMessage = 'true';
    body.appendChild(message);

    dialog.appendChild(header);
    dialog.appendChild(body);
    root.appendChild(dialog);
    this.document.body.appendChild(root);
    return root;
  }

  renderMessage(message) {
    if (!this.messageElement) {
      return;
    }

    this.messageElement.textContent = '';

    if (!message) {
      return;
    }

    if (typeof message === 'string') {
      this.messageElement.textContent = message;
      return;
    }

    if (typeof message === 'object') {
      const text = typeof message.text === 'string' ? message.text : '';
      if (text) {
        this.messageElement.appendChild(this.document.createTextNode(text));
      }

      const link = message.link;
      if (link?.href && link?.label) {
        if (text) {
          this.messageElement.appendChild(this.document.createTextNode(' '));
        }
        const anchor = this.document.createElement('a');
        anchor.href = link.href;
        anchor.textContent = link.label;
        this.messageElement.appendChild(anchor);
      }
      return;
    }

    this.messageElement.textContent = String(message);
  }

  show({ title = 'Notice', message = '' } = {}) {
    if (!this.instance) {
      return false;
    }
    if (this.titleElement) {
      this.titleElement.textContent = title;
    }
    this.renderMessage(message);
    this.modalService.open(this.modalId);
    return true;
  }

  showError(message) {
    return this.show({ title: 'Action blocked', message });
  }

  showSuccess(message) {
    return this.show({ title: 'Success', message: message || 'Action completed successfully.' });
  }
}
