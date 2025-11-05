export default class ModalEntity {
  constructor({ id, storageKey = '', auto = false, closeOnOverlay = true }) {
    this.id = id;
    this.storageKey = storageKey;
    this.auto = auto;
    this.closeOnOverlay = closeOnOverlay;
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
}
