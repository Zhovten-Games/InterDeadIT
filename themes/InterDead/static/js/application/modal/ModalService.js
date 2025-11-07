import ModalInstance from './ModalInstance.js';

export default class ModalService {
  constructor({ storage, eventTarget = typeof document !== 'undefined' ? document : null, scrollController = null } = {}) {
    this.storage = storage;
    this.eventTarget = eventTarget;
    this.scrollController = scrollController;
    this.modals = new Map();
    this.activeModal = null;
    this.handleKeydown = this.handleKeydown.bind(this);
  }

  register({ entity, view } = {}) {
    if (!entity || !view) {
      return null;
    }
    const instance = new ModalInstance({ entity, view, storage: this.storage, service: this });
    if (instance.id) {
      this.modals.set(instance.id, instance);
    }
    return instance;
  }

  open(id) {
    const instance = this.modals.get(id);
    if (!instance) {
      return;
    }
    if (this.activeModal && this.activeModal.id !== instance.id) {
      this.close(this.activeModal.id);
    }
    const opened = instance.open();
    if (opened) {
      if (instance.shouldLockScroll()) {
        this.scrollController?.lock(instance.id);
      }
      this.activeModal = instance;
      this.eventTarget?.addEventListener('keydown', this.handleKeydown);
    }
  }

  close(id, options = {}) {
    const instance = this.modals.get(id);
    if (!instance) {
      return;
    }
    const closed = instance.close(options);
    if (closed && this.activeModal && this.activeModal.id === instance.id) {
      this.activeModal = null;
      this.eventTarget?.removeEventListener('keydown', this.handleKeydown);
    }
    if (closed && instance.shouldLockScroll()) {
      this.scrollController?.unlock(instance.id);
    }
  }

  autoShow(predicate) {
    this.modals.forEach(instance => {
      if (instance.shouldAutoOpen() && (!predicate || predicate(instance))) {
        this.open(instance.id);
      }
    });
  }

  handleKeydown(event) {
    if (event.key === 'Escape' && this.activeModal) {
      this.close(this.activeModal.id);
    }
  }
}
