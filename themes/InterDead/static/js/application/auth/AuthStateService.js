const EVENTS = {
  UPDATED: 'AUTH_SESSION_UPDATED',
  FAILED: 'AUTH_SESSION_FAILED',
};

export { EVENTS as AUTH_SESSION_EVENTS };

export default class AuthStateService {
  constructor({ sessionAdapter, eventBus }) {
    this.sessionAdapter = sessionAdapter;
    this.eventBus = eventBus;
    this.state = { authenticated: false, profileId: null, displayName: null };
  }

  getState() {
    return this.state;
  }

  async refresh() {
    try {
      const payload = await this.sessionAdapter?.fetchSession?.();
      const normalized = this.normalize(payload);
      this.state = normalized;
      this.eventBus?.emit?.(EVENTS.UPDATED, normalized);
      return normalized;
    } catch (error) {
      console.error('[InterDead][Auth] Failed to refresh session', error);
      this.eventBus?.emit?.(EVENTS.FAILED, { error });
      return { ...this.state, error, authenticated: false };
    }
  }

  normalize(payload) {
    if (!payload || payload.authenticated !== true) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      profileId: payload.profileId || null,
      displayName: payload.displayName || null,
      avatarUrl: payload.avatarUrl || null,
      username: payload.username || null,
    };
  }
}
