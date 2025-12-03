export default class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventName, listener) {
    if (!eventName || typeof listener !== 'function') {
      return () => {};
    }
    const current = this.listeners.get(eventName) ?? [];
    current.push(listener);
    this.listeners.set(eventName, current);
    return () => this.off(eventName, listener);
  }

  off(eventName, listener) {
    const current = this.listeners.get(eventName);
    if (!current) {
      return;
    }
    this.listeners.set(
      eventName,
      current.filter(cb => cb !== listener),
    );
  }

  emit(eventName, payload) {
    const current = this.listeners.get(eventName) ?? [];
    current.forEach(listener => listener(payload));
  }
}
