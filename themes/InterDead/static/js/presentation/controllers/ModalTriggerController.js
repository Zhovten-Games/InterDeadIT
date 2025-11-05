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
        this.modalService.open(target);
      });
    });
  }
}
