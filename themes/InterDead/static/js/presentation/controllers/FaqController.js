export default class FaqController {
  constructor({ root }) {
    this.root = root;
    this.handleClick = this.handleClick.bind(this);
  }

  init() {
    if (!this.root) {
      return;
    }
    this.root.addEventListener('click', this.handleClick);
  }

  handleClick(event) {
    const question = event.target.closest('.gm-faq__q');
    if (!question) {
      return;
    }
    const item = question.closest('.gm-faq__item');
    const list = this.root.querySelector('.gm-faq__list');
    list
      .querySelectorAll('.gm-faq__item')
      .forEach(element => {
        if (element !== item) {
          element.classList.remove('gm-faq__item--active');
        }
      });
    item.classList.toggle('gm-faq__item--active');
  }
}
