import StoragePort from '../../ports/StoragePort.js';

export default class LocalStorageAdapter extends StoragePort {
  constructor(storage) {
    super();
    try {
      this.storage = storage === undefined ? window.localStorage : storage;
    } catch {
      this.storage = null;
    }
  }

  get(key) {
    if (!key) {
      return null;
    }
    try {
      return this.storage.getItem(key);
    } catch (error) {
      console.warn('LocalStorageAdapter#get failed', error);
      return null;
    }
  }

  set(key, value) {
    if (!key) {
      return;
    }
    try {
      this.storage.setItem(key, value);
    } catch (error) {
      console.warn('LocalStorageAdapter#set failed', error);
    }
  }

  remove(key) {
    if (!key) {
      return;
    }
    try {
      this.storage.removeItem(key);
    } catch (error) {
      console.warn('LocalStorageAdapter#remove failed', error);
    }
  }
}
