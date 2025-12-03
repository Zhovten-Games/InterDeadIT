export const MODAL_SCROLL_BEHAVIORS = Object.freeze({
  FREE: 'free',
  LOCK: 'lock',
});

export default class ModalEntity {
  constructor({ id, storageKey = '', auto = false, closeOnOverlay = true, scrollBehavior = MODAL_SCROLL_BEHAVIORS.FREE }) {
    this.id = id;
    this.storageKey = storageKey;
    this.auto = auto;
    this.closeOnOverlay = closeOnOverlay;
    const normalizedScroll = typeof scrollBehavior === 'string' ? scrollBehavior.toLowerCase() : '';
    this.scrollBehavior = normalizedScroll === MODAL_SCROLL_BEHAVIORS.LOCK ? MODAL_SCROLL_BEHAVIORS.LOCK : MODAL_SCROLL_BEHAVIORS.FREE;
  }

  shouldAutoOpen(storage) {
    if (!this.auto) {
      return false;
    }
    if (this.storageKey && storage?.get(this.storageKey)) {
      return false;
    }
    return true;
  }

  remember(storage) {
    if (!this.storageKey) {
      return;
    }
    storage?.set(this.storageKey, 'hidden');
  }

  shouldLockScroll() {
    return this.scrollBehavior === MODAL_SCROLL_BEHAVIORS.LOCK;
  }
}
