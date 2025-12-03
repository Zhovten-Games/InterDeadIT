import ModalEntity, { MODAL_SCROLL_BEHAVIORS } from '../../domain/modal/ModalEntity.js';

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
      auto: element?.dataset?.modalAuto === 'true',
      closeOnOverlay: element?.dataset?.modalCloseOnOverlay !== 'false',
      scrollBehavior,
    });
  }
}
