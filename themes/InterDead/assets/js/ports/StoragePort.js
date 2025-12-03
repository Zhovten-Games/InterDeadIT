export default class StoragePort {
  get(_key) {
    throw new Error('StoragePort#get must be implemented by subclasses.');
  }

  set(_key, _value) {
    throw new Error('StoragePort#set must be implemented by subclasses.');
  }
}
