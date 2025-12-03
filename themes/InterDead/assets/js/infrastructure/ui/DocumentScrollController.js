import ScrollControllerPort from '../../ports/ScrollControllerPort.js';

export default class DocumentScrollController extends ScrollControllerPort {
  constructor({ target = typeof document !== 'undefined' ? document.body : null, className = 'gm-scrollLocked' } = {}) {
    super();
    this.target = target;
    this.className = className;
    this.contexts = new Set();
  }

  lock(context) {
    if (!this.target) {
      return;
    }
    if (context) {
      this.contexts.add(context);
    }
    if (this.contexts.size > 0) {
      this.target.classList.add(this.className);
    }
  }

  unlock(context) {
    if (!this.target) {
      return;
    }
    if (context) {
      this.contexts.delete(context);
    } else {
      this.contexts.clear();
    }
    if (this.contexts.size === 0) {
      this.target.classList.remove(this.className);
    }
  }
}
