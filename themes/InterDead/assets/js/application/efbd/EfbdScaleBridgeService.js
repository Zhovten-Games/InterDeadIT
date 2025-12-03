const EVENTS = {
  UPDATED: 'EFBD_SCALE_UPDATED',
  SUMMARY_LOADED: 'EFBD_SUMMARY_LOADED',
};

export { EVENTS as EFBD_EVENTS };

export default class EfbdScaleBridgeService {
  constructor({ adapter, featureFlags, eventBus }) {
    this.adapter = adapter;
    this.featureFlags = featureFlags;
    this.eventBus = eventBus;
  }

  async emitTrigger(trigger) {
    if (this.featureFlags?.isEfbdScaleEnabled?.() === false) {
      return { status: 'disabled' };
    }
    if (!trigger || typeof trigger.axis !== 'string') {
      return { status: 'ignored' };
    }
    const response = await this.adapter?.sendTrigger?.(trigger);
    if (response?.status === 'ok') {
      this.eventBus?.emit?.(EVENTS.UPDATED, response?.payload ?? {});
    }
    return response;
  }

  async fetchSummary() {
    if (this.featureFlags?.isEfbdScaleEnabled?.() === false) {
      return { status: 'disabled' };
    }

    const response = await this.adapter?.fetchSummary?.();
    if (response?.status === 'ok') {
      this.eventBus?.emit?.(EVENTS.SUMMARY_LOADED, response?.payload ?? {});
    }
    return response;
  }
}
