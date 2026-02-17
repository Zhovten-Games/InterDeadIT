export const MODAL_SCROLL_BEHAVIORS = Object.freeze({
  FREE: 'free',
  LOCK: 'lock',
});

export const MODAL_DIALOG_WIDTH_MODES = Object.freeze({
  CONSTRAINED: 'constrained',
  VIEWPORT: 'viewport',
});

export default class ModalEntity {
  constructor({
    id,
    storageKey = '',
    storageVersion = '',
    requiresStorageKey = '',
    followUpId = '',
    auto = false,
    closeOnOverlay = true,
    scrollBehavior = MODAL_SCROLL_BEHAVIORS.FREE,
    dialogViewportOffset = null,
    dialogWidthMode = MODAL_DIALOG_WIDTH_MODES.CONSTRAINED,
  }) {
    this.id = id;
    this.storageKey = storageKey;
    this.storageVersion = storageVersion;
    this.requiresStorageKey = requiresStorageKey;
    this.followUpId = followUpId;
    this.auto = auto;
    this.closeOnOverlay = closeOnOverlay;
    const normalizedScroll = typeof scrollBehavior === 'string' ? scrollBehavior.toLowerCase() : '';
    this.scrollBehavior =
      normalizedScroll === MODAL_SCROLL_BEHAVIORS.LOCK
        ? MODAL_SCROLL_BEHAVIORS.LOCK
        : MODAL_SCROLL_BEHAVIORS.FREE;
    this.dialogViewportOffset = ModalEntity.normalizeDialogViewportOffset(dialogViewportOffset);
    this.dialogWidthMode = ModalEntity.normalizeDialogWidthMode(dialogWidthMode);
  }

  static normalizeDialogViewportOffset(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return null;
    }
    return numeric;
  }

  static normalizeDialogWidthMode(value) {
    const normalized = typeof value === 'string' ? value.toLowerCase().trim() : '';
    if (normalized === MODAL_DIALOG_WIDTH_MODES.VIEWPORT) {
      return MODAL_DIALOG_WIDTH_MODES.VIEWPORT;
    }
    return MODAL_DIALOG_WIDTH_MODES.CONSTRAINED;
  }

  shouldAutoOpen(storage) {
    if (!this.auto) {
      return false;
    }
    const storedValue = this.storageKey ? storage?.get?.(this.storageKey) : null;
    if (storedValue) {
      if (this.storageVersion && storedValue !== this.storageVersion) {
        storage?.remove?.(this.storageKey);
      } else {
        return false;
      }
    }
    if (this.requiresStorageKey && !storage?.get?.(this.requiresStorageKey)) {
      return false;
    }
    return true;
  }

  remember(storage) {
    if (!this.storageKey) {
      return;
    }
    const nextValue = this.storageVersion || 'hidden';
    storage?.set(this.storageKey, nextValue);
  }

  shouldLockScroll() {
    return this.scrollBehavior === MODAL_SCROLL_BEHAVIORS.LOCK;
  }

  getFollowUpId() {
    return this.followUpId || '';
  }

  getDialogViewportOffset() {
    return this.dialogViewportOffset;
  }

  getDialogWidthMode() {
    return this.dialogWidthMode;
  }
}
