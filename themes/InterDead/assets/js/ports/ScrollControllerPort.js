export default class ScrollControllerPort {
  lock(_context) {
    throw new Error('ScrollControllerPort#lock must be implemented by subclasses.');
  }

  unlock(_context) {
    throw new Error('ScrollControllerPort#unlock must be implemented by subclasses.');
  }
}
