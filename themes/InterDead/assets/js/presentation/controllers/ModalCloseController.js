export default class ModalCloseController {
  constructor({ controls = [], modalService }) {
    this.controls = controls;
    this.modalService = modalService;
  }

  init() {
    this.controls.forEach((control) => {
      if (!control) {
        return;
      }
      control.addEventListener('click', (event) => {
        event.preventDefault();
        this.handleClose(control);
      });
    });
  }

  handleClose(control) {
    const remember = control?.dataset?.modalRemember === 'true';
    const target = control?.dataset?.modalClose;
    if (target) {
      this.modalService.close(target, { remember });
      return;
    }
    const parent = control.closest('[data-modal]');
    const modalId = parent?.dataset?.modal;
    if (modalId) {
      this.modalService.close(modalId, { remember });
    }
  }
}
