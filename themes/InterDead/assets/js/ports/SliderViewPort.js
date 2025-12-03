export default class SliderViewPort {
  isReady() {
    throw new Error('SliderViewPort#isReady must be implemented by subclasses.');
  }

  prepareSlides(_collection) {
    throw new Error('SliderViewPort#prepareSlides must be implemented by subclasses.');
  }

  applyMediums(_collection) {
    throw new Error('SliderViewPort#applyMediums must be implemented by subclasses.');
  }

  renderDots(_count, _onSelect) {
    throw new Error('SliderViewPort#renderDots must be implemented by subclasses.');
  }

  setActiveDot(_index) {
    throw new Error('SliderViewPort#setActiveDot must be implemented by subclasses.');
  }

  bindNavigation(_options) {
    throw new Error('SliderViewPort#bindNavigation must be implemented by subclasses.');
  }

  bindSwipe(_options) {
    throw new Error('SliderViewPort#bindSwipe must be implemented by subclasses.');
  }

  unbindSwipe() {
    throw new Error('SliderViewPort#unbindSwipe must be implemented by subclasses.');
  }

  setTransform(_index) {
    throw new Error('SliderViewPort#setTransform must be implemented by subclasses.');
  }

  getScoreboardBaseText() {
    throw new Error('SliderViewPort#getScoreboardBaseText must be implemented by subclasses.');
  }

  getScoreboardAnnounceTemplate() {
    throw new Error(
      'SliderViewPort#getScoreboardAnnounceTemplate must be implemented by subclasses.',
    );
  }

  updateScoreboard(_options) {
    throw new Error('SliderViewPort#updateScoreboard must be implemented by subclasses.');
  }

  syncFade() {
    throw new Error('SliderViewPort#syncFade must be implemented by subclasses.');
  }

  clearFadeTimeout() {
    throw new Error('SliderViewPort#clearFadeTimeout must be implemented by subclasses.');
  }

  registerFadeListener() {
    throw new Error('SliderViewPort#registerFadeListener must be implemented by subclasses.');
  }

  destroy() {
    throw new Error('SliderViewPort#destroy must be implemented by subclasses.');
  }
}
