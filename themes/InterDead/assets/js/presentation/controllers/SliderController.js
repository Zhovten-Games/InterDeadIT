import SliderService from '../../application/slider/SliderService.js';
import SliderDomMapper from '../../infrastructure/ui/SliderDomMapper.js';
import SliderView from '../../infrastructure/ui/SliderView.js';

export default class SliderController {
  constructor({ sliderElement }) {
    this.sliderElement = sliderElement;
    if (!sliderElement) {
      this.service = null;
      return;
    }
    const track = sliderElement.querySelector('.js-slider-track');
    const mapper = new SliderDomMapper(track?.children ?? []);
    const view = new SliderView({
      slider: sliderElement,
      track,
      dotsContainer: sliderElement.querySelector('.js-slider-dots'),
      prevControl: sliderElement.querySelector('.gm-slider__nav--prev'),
      nextControl: sliderElement.querySelector('.gm-slider__nav--next'),
      scoreboard: sliderElement.querySelector('[data-scoreboard]'),
      scoreboardInner: sliderElement.querySelector('[data-scoreboard-inner]'),
      scoreboardText: sliderElement.querySelector('[data-scoreboard-text]'),
      scoreboardAnnouncer: sliderElement.querySelector('[data-scoreboard-announcer]'),
      scoreboardCount: sliderElement.querySelector('[data-scoreboard-count]'),
      fadeMediaQuery: window.matchMedia('(max-width: 960px)'),
      mapper,
    });
    this.service = new SliderService({
      collection: mapper.getCollection(),
      view,
    });
  }

  init() {
    this.service?.init();
  }

  dispose() {
    this.service?.dispose?.();
  }
}
