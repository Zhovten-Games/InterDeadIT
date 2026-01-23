import IEfbdScaleWritePort from '../../ports/IEfbdScaleWritePort.js';

export default class EfbdScaleTriggerPort extends IEfbdScaleWritePort {
  constructor({ emitScaleTrigger, fetchSummary, logger = console } = {}) {
    super();
    this.emitScaleTrigger = emitScaleTrigger || (window?.InterdeadPorts?.emitScaleTrigger ?? null);
    this.summaryFetcher = fetchSummary || (window?.InterdeadPorts?.fetchEfbdSummary ?? null);
    this.logger = logger || console;
  }

  setEmitter(emitScaleTrigger) {
    if (typeof emitScaleTrigger === 'function') {
      this.emitScaleTrigger = emitScaleTrigger;
    }
  }

  setSummaryFetcher(fetchSummary) {
    if (typeof fetchSummary === 'function') {
      this.summaryFetcher = fetchSummary;
    }
  }

  async fetchSummary() {
    if (typeof this.summaryFetcher !== 'function') {
      this.logger?.warn?.('[InterDead][MiniGame][ScaleTriggerPort] fetchSummary is not available', {
        hasFetcher: Boolean(this.summaryFetcher),
      });
      return { status: 'unsupported', message: 'Scale summary is unavailable.' };
    }

    return this.summaryFetcher();
  }

  async recordAnswer({ axis, value = 1, context = {} } = {}) {
    if (typeof axis !== 'string' || axis.trim().length === 0) {
      return { status: 'invalid' };
    }

    if (typeof this.emitScaleTrigger !== 'function') {
      this.logger?.warn?.(
        '[InterDead][MiniGame][ScaleTriggerPort] emitScaleTrigger is not available',
        {
          axis,
          hasEmitter: Boolean(this.emitScaleTrigger),
        },
      );
      return { status: 'unsupported', message: 'Scale trigger is unavailable.' };
    }

    const result = this.emitScaleTrigger(axis, value, context);
    if (!result) {
      this.logger?.error?.(
        '[InterDead][MiniGame][ScaleTriggerPort] emitScaleTrigger returned no result',
        {
          axis,
        },
      );
      return { status: 'error', message: 'Scale trigger returned no result.' };
    }

    return result;
  }
}
