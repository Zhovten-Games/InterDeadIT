const EVENTS = {
  UPDATED: 'AUTH_SESSION_UPDATED',
  FAILED: 'AUTH_SESSION_FAILED',
};

export { EVENTS as AUTH_SESSION_EVENTS };

export default class AuthStateService {
  constructor({ sessionAdapter, eventBus, logger = console }) {
    this.sessionAdapter = sessionAdapter;
    this.eventBus = eventBus;
    this.logger = logger || console;
    this.state = { authenticated: null, profileId: null, displayName: null };
  }

  getState() {
    return this.state;
  }

  async refresh() {
    this.logger?.info?.('[InterDead][Auth] Refreshing session');
    try {
      const payload = await this.sessionAdapter?.fetchSession?.();
      const sanitizedPayload = this.sanitizePayload(payload);
      const normalized = this.normalize(payload);
      this.logger?.info?.('[InterDead][Auth] Session refreshed', {
        payload: sanitizedPayload,
        normalized,
      });
      this.state = normalized;
      this.eventBus?.emit?.(EVENTS.UPDATED, normalized);
      return normalized;
    } catch (error) {
      this.logger?.error?.('[InterDead][Auth] Failed to refresh session', error);
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

  sanitizePayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    const sanitized = { ...payload };
    ['token', 'accessToken', 'refreshToken', 'sessionToken'].forEach((key) => {
      if (sanitized[key]) {
        sanitized[key] = '[redacted]';
      }
    });

    return sanitized;
  }
}
