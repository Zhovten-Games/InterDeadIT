export default class ModalTriggerController {
  constructor({ triggers = [], modalService }) {
    this.triggers = triggers;
    this.modalService = modalService;
  }

  init() {
    this.triggers.forEach(trigger => {
      const target = trigger?.dataset?.modalTrigger;
      if (!trigger || !target) {
        return;
      }
      trigger.addEventListener('click', event => {
        event.preventDefault();
        const resume = this._shouldResume(trigger);
        this.modalService.open(target, { resume });
      });
    });
  }

  _shouldResume(trigger) {
    const value = trigger?.dataset?.modalResume;
    if (value == null) {
      return false;
    }
    return value !== 'false';
  }
}
