import SliderCollection, { SlideEntity } from '../../domain/slider/SliderModel.js';

export default class SliderDomMapper {
  constructor(elements = []) {
    this.elements = Array.from(elements).filter(Boolean);
    this.entityToElement = new Map();
    this.collection = new SliderCollection(
      this.elements.map((element, index) => this.createEntity(element, index)),
    );
  }

  createEntity(element, index) {
    const rawMediums = Number(element?.dataset?.mediums);
    const orderValue = Number(element?.dataset?.index);
    const entity = new SlideEntity({
      id: element?.dataset?.slideId ?? element?.id ?? `slide-${index}`,
      mediums: Number.isFinite(rawMediums) ? rawMediums : null,
      order: Number.isFinite(orderValue) ? orderValue : index + 1,
    });
    this.entityToElement.set(entity, element);
    return entity;
  }

  getCollection() {
    return this.collection;
  }

  getElement(entity) {
    return this.entityToElement.get(entity) ?? null;
  }

  updateElementMediums(entity) {
    const element = this.getElement(entity);
    if (!element) {
      return;
    }
    if (entity.hasMediums()) {
      element.dataset.mediums = String(entity.mediums);
    } else {
      delete element.dataset.mediums;
    }
  }
}
