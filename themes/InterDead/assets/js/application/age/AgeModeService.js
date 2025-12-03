import AgeMode, { AGE_MODES } from '../../domain/age/AgeMode.js';

export default class AgeModeService {
  constructor(storage, storageKey = 'gm_age_mode') {
    this.storage = storage;
    this.storageKey = storageKey;
    this.mode = new AgeMode(null);
  }

  load() {
    const stored = this.storage?.get(this.storageKey);
    if (AgeMode.isValid(stored)) {
      this.mode = new AgeMode(stored);
    }
    return this.mode;
  }

  setMode(mode) {
    if (!AgeMode.isValid(mode)) {
      return null;
    }
    if (this.mode?.getValue?.() === mode) {
      return this.mode;
    }
    this.mode = new AgeMode(mode);
    this.storage?.set(this.storageKey, mode);
    return this.mode;
  }

  getMode() {
    return this.mode;
  }

  isDemo() {
    return this.mode.isDemo();
  }

  isAdult() {
    return this.mode.isAdult();
  }
}

export { AGE_MODES };
