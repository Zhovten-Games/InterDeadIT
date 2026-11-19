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
    this.profileId = null;
    this.completedGames = new Set();
    this.generation = 0;
  }

  setProfile(profileId) {
    if (this.profileId === profileId) return;
    this.profileId = profileId;
    this.completedGames.clear();
    this.generation++;
  }

  hasCompleted(gameId) {
    return this.completedGames.has(gameId);
  }

  snapshot() {
    return { completedPolls: [...this.completedGames], persistence: 'persistent' };
  }

  async emitTrigger(trigger) {
    if (this.featureFlags?.isEfbdScaleEnabled?.() === false) {
      return { status: 'disabled' };
    }
    if (!trigger || typeof trigger.axis !== 'string') {
      return { status: 'ignored' };
    }
    const gameId = trigger.context?.source || trigger.source;
    if (this.hasCompleted(gameId)) {
      return { status: 'error', code: 'replay_blocked', reason: 'completed' };
    }
    const generation = this.generation;
    const response = await this.adapter?.sendTrigger?.(trigger);
    if (generation !== this.generation) return { status: 'ignored' };
    if (
      gameId &&
      (response?.status === 'ok' ||
        (response?.code === 'replay_blocked' && response?.reason === 'completed'))
    ) {
      this.completedGames.add(gameId);
    }
    if (response?.status === 'ok') {
      this.eventBus?.emit?.(EVENTS.UPDATED, response?.payload ?? {});
    } else if (this.hasCompleted(gameId)) {
      this.eventBus?.emit?.(EVENTS.UPDATED, {});
    }
    return response;
  }

  async fetchSummary() {
    if (this.featureFlags?.isEfbdScaleEnabled?.() === false) {
      return { status: 'disabled' };
    }

    const generation = this.generation;
    const response = await this.adapter?.fetchSummary?.();
    if (generation !== this.generation) return { status: 'ignored' };
    if (response?.status === 'ok') {
      for (const gameId of response.payload?.completedGames || []) {
        if (typeof gameId === 'string') this.completedGames.add(gameId);
      }
      this.eventBus?.emit?.(EVENTS.SUMMARY_LOADED, response?.payload ?? {});
    }
    return response;
  }
}
