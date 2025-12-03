export const AGE_MODES = Object.freeze({
  ADULT: 'adult',
  DEMO: 'demo',
});

export default class AgeMode {
  constructor(mode) {
    this._value = AgeMode.isValid(mode) ? mode : null;
  }

  static isValid(mode) {
    return mode === AGE_MODES.ADULT || mode === AGE_MODES.DEMO;
  }

  hasValue() {
    return this._value !== null;
  }

  getValue() {
    return this._value;
  }

  isAdult() {
    return this._value === AGE_MODES.ADULT;
  }

  isDemo() {
    return this._value === AGE_MODES.DEMO;
  }
}
