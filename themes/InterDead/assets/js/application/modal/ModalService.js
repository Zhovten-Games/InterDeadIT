import ModalInstance from './ModalInstance.js';

export default class ModalService {
  constructor({
    storage,
    eventTarget = typeof document !== 'undefined' ? document : null,
    scrollController = null,
  } = {}) {
    this.storage = storage;
    this.eventTarget = eventTarget;
    this.scrollController = scrollController;
    this.modals = new Map();
    this.activeModal = null;
    this.resumeStack = [];
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

  open(id, options = {}) {
    const instance = this.modals.get(id);
    if (!instance) {
      if (!options._fromResume) {
        this._removeFromResumeStack(id);
      }
      return false;
    }
    const { resume = false, _fromResume = false } = options;
    const active = this.activeModal;
    if (active && active.id === instance.id) {
      return true;
    }
    if (active && active.id !== instance.id) {
      if (resume) {
        if (!this.resumeStack.includes(active.id)) {
          this.resumeStack.push(active.id);
        }
        this._closeInstance(active, { skipResume: true });
      } else {
        this.resumeStack.length = 0;
        this.close(active.id);
      }
    } else if (!resume && !_fromResume) {
      this.resumeStack.length = 0;
    }
    const opened = instance.open();
    if (!opened) {
      if (resume && !options._fromResume) {
        this._resumePrevious(instance.id);
      }
      return false;
    }
    if (instance.shouldLockScroll()) {
      this.scrollController?.lock(instance.id);
    }
    this.activeModal = instance;
    this.eventTarget?.addEventListener('keydown', this.handleKeydown);
    return true;
  }

  close(id, options = {}) {
    const instance = this.modals.get(id);
    if (!instance) {
      this._removeFromResumeStack(id);
      return false;
    }
    return this._closeInstance(instance, options);
  }

  autoShow(predicate) {
    this.modals.forEach((instance) => {
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

  _closeInstance(instance, options = {}) {
    const { remember = false, skipResume = false } = options;
    const wasActive = this.activeModal?.id === instance.id;
    const wasSuspended = this.resumeStack.includes(instance.id);
    const closed = instance.close({ remember });

    if (!closed) {
      if (!skipResume && !wasActive && wasSuspended) {
        this._removeFromResumeStack(instance.id);
        return true;
      }
      return false;
    }

    if (wasActive) {
      this.activeModal = null;
      this.eventTarget?.removeEventListener('keydown', this.handleKeydown);
    }

    if (instance.shouldLockScroll()) {
      this.scrollController?.unlock(instance.id);
    }

    if (skipResume) {
      return true;
    }

    if (wasActive) {
      this._resumePrevious(instance.id);
    } else {
      this._removeFromResumeStack(instance.id);
    }

    return true;
  }

  _resumePrevious(closedId) {
    while (this.resumeStack.length) {
      const previousId = this.resumeStack.pop();
      if (!previousId || previousId === closedId) {
        continue;
      }
      const reopened = this.open(previousId, { _fromResume: true });
      if (reopened) {
        return;
      }
    }
  }

  _removeFromResumeStack(id) {
    if (!id || !this.resumeStack.length) {
      return;
    }
    this.resumeStack = this.resumeStack.filter((item) => item !== id);
  }
}
