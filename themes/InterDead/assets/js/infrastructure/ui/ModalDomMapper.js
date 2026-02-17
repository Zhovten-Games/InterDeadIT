import ModalEntity, {
  MODAL_DIALOG_WIDTH_MODES,
  MODAL_SCROLL_BEHAVIORS,
} from '../../domain/modal/ModalEntity.js';

export default class ModalDomMapper {
  createEntity(element) {
    if (!element) {
      return null;
    }
    const scrollBehavior =
      element?.dataset?.modalScroll === 'lock'
        ? MODAL_SCROLL_BEHAVIORS.LOCK
        : MODAL_SCROLL_BEHAVIORS.FREE;
    return new ModalEntity({
      id: element?.dataset?.modal || null,
      storageKey: element?.dataset?.modalStorage || '',
      storageVersion: element?.dataset?.modalStorageVersion || '',
      requiresStorageKey: element?.dataset?.modalRequiresStorage || '',
      followUpId: element?.dataset?.modalFollowUp || '',
      auto: element?.dataset?.modalAuto === 'true',
      closeOnOverlay: element?.dataset?.modalCloseOnOverlay !== 'false',
      scrollBehavior,
      dialogViewportOffset: element?.dataset?.modalDialogViewportOffset ?? null,
      dialogWidthMode:
        element?.dataset?.modalDialogWidthMode || MODAL_DIALOG_WIDTH_MODES.CONSTRAINED,
    });
  }
}
