import IEfbdScaleWritePort from '../../ports/IEfbdScaleWritePort.js';

export default class EfbdScaleTriggerPort extends IEfbdScaleWritePort {
  constructor({ emitScaleTrigger } = {}) {
    super();
    this.emitScaleTrigger = emitScaleTrigger || (window?.InterdeadPorts?.emitScaleTrigger ?? null);
  }

  async recordAnswer({ axis, value = 1, context = {} } = {}) {
    if (typeof axis !== 'string' || axis.trim().length === 0) {
      return { status: 'invalid' };
    }

    if (typeof this.emitScaleTrigger !== 'function') {
      return { status: 'unsupported' };
    }

    return this.emitScaleTrigger(axis, value, context) ?? { status: 'error' };
  }
}
