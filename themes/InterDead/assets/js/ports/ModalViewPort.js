export default class ModalViewPort {
  open(_options = {}) {
    throw new Error('ModalViewPort#open must be implemented by subclasses.');
  }

  close() {
    throw new Error('ModalViewPort#close must be implemented by subclasses.');
  }
}
