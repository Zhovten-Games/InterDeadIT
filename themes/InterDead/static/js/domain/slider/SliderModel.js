import SlideEntity from './SlideEntity.js';

export default class SliderCollection {
  constructor(slides = []) {
    this.slides = Array.from(slides).map((slide, index) => {
      if (slide instanceof SlideEntity) {
        return slide;
      }
      return new SlideEntity({
        id: slide?.id ?? null,
        mediums: slide?.mediums ?? null,
        order: Number.isFinite(slide?.order) ? slide.order : index + 1,
      });
    });
  }

  static fromEntities(entities = []) {
    return new SliderCollection(entities);
  }

  get length() {
    return this.slides.length;
  }

  [Symbol.iterator]() {
    return this.slides[Symbol.iterator]();
  }

  get(index) {
    return this.slides[index] ?? null;
  }

  forEach(callback) {
    this.slides.forEach(callback);
  }

  sortByMediums() {
    this.slides.sort((a, b) => {
      const aKey = a.hasMediums() ? a.mediums : a.order;
      const bKey = b.hasMediums() ? b.mediums : b.order;
      return aKey - bKey;
    });
  }

  normalizeMediums() {
    this.slides.forEach((slide, index) => {
      if (!slide.hasMediums()) {
        slide.setMediums(index + 1);
      }
    });
  }

  toArray() {
    return Array.from(this.slides);
  }
}

export { SlideEntity };
