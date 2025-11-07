import ModalEntity from '../../domain/modal/ModalEntity.js';
import ModalViewPort from '../../ports/ModalViewPort.js';

export default class ModalInstance {
  constructor({ entity, view, storage, service }) {
    this.entity = entity instanceof ModalEntity ? entity : null;
    this.view = view instanceof ModalViewPort ? view : null;
    this.storage = storage;
    this.service = service;
  }

  get id() {
    return this.entity?.id ?? null;
  }

  open() {
    if (!this.entity || !this.view) {
      return false;
    }
    const opened = this.view.open({
      onOverlay: this.entity.closeOnOverlay ? () => this.service.close(this.id) : null,
    });
    return opened;
  }

  close(options = {}) {
    if (!this.entity || !this.view) {
      return false;
    }
    const wasOpen = this.view?.isOpen === true;
    const closed = this.view.close();
    if ((closed || wasOpen) && options.remember) {
      this.entity.remember(this.storage);
    }
    return closed || wasOpen;
  }

  shouldLockScroll() {
    if (!this.entity) {
      return false;
    }
    return this.entity.shouldLockScroll();
  }

  shouldAutoOpen() {
    if (!this.entity) {
      return false;
    }
    return this.entity.shouldAutoOpen(this.storage);
  }
}
