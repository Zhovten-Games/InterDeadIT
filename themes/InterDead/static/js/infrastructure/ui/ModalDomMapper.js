import ModalEntity from '../../domain/modal/ModalEntity.js';

export default class ModalDomMapper {
  createEntity(element) {
    if (!element) {
      return null;
    }
    return new ModalEntity({
      id: element?.dataset?.modal || null,
      storageKey: element?.dataset?.modalStorage || '',
      auto: element?.dataset?.modalAuto === 'true',
      closeOnOverlay: element?.dataset?.modalCloseOnOverlay !== 'false',
    });
  }
}
