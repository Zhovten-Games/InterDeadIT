import SliderViewPort from '../../ports/SliderViewPort.js';

export default class SliderService {
  constructor({ collection, view }) {
    this.collection = collection;
    this.view = view instanceof SliderViewPort ? view : null;
    this.index = 0;
    this.baseText = '';
    this.announceTemplate = '';
  }

  init() {
    if (!this.view?.isReady()) {
      return;
    }
    if (!this.collection || this.collection.length === 0) {
      return;
    }
    this.collection.sortByMediums();
    this.collection.normalizeMediums();
    this.view.prepareSlides(this.collection);
    this.view.applyMediums(this.collection);
    this.view.renderDots(this.collection.length, (index) => this.go(index));
    this.view.bindNavigation({
      onPrev: () => this.go(this.index - 1),
      onNext: () => this.go(this.index + 1),
    });
    this.view.bindSwipe({
      onSwipeLeft: () => this.go(this.index + 1),
      onSwipeRight: () => this.go(this.index - 1),
    });
    this.baseText = this.view.getScoreboardBaseText();
    this.announceTemplate = this.view.getScoreboardAnnounceTemplate();
    this.view.setTransform(this.index);
    this.view.setActiveDot(this.index);
    this.updateScoreboard(false);
    this.view.syncFade();
  }

  go(targetIndex) {
    if (!this.collection || this.collection.length === 0 || !this.view) {
      return;
    }
    const previousIndex = this.index;
    const rawTarget = targetIndex;
    const length = this.collection.length;
    this.index = (targetIndex + length) % length;
    this.view.setTransform(this.index);
    this.view.setActiveDot(this.index);
    const forwardStep = previousIndex + 1;
    const wrappedForward = previousIndex === length - 1 && rawTarget >= length;
    const isForward = rawTarget === forwardStep || wrappedForward;
    const shouldAnimate = isForward && rawTarget !== previousIndex;
    this.updateScoreboard(shouldAnimate);
  }

  updateScoreboard(shouldAnimate) {
    const slide = this.collection.get(this.index);
    if (!slide) {
      return;
    }
    const displayCount = slide.getDisplayCount();
    const announcement = slide.getAnnouncement({
      baseText: this.baseText,
      template: this.announceTemplate,
    });
    this.view?.updateScoreboard({
      baseText: this.baseText,
      displayCount,
      announcement,
      animate: shouldAnimate,
    });
  }

  dispose() {
    this.view?.destroy();
  }
}
