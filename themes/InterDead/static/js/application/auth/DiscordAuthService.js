const EVENTS = {
  REQUESTED: 'DISCORD_LOGIN_REQUESTED',
  COMPLETED: 'DISCORD_LOGIN_COMPLETED',
  FAILED: 'DISCORD_LOGIN_FAILED',
};

export { EVENTS as DISCORD_AUTH_EVENTS };

export default class DiscordAuthService {
  constructor({ authAdapter, eventBus, featureFlags }) {
    this.authAdapter = authAdapter;
    this.eventBus = eventBus;
    this.featureFlags = featureFlags;
  }

  canLogin() {
    return this.featureFlags?.isIdentityEnabled?.() !== false;
  }

  async beginLogin() {
    if (!this.canLogin()) {
      this.eventBus?.emit?.(EVENTS.FAILED, { reason: 'disabled' });
      return { status: 'disabled' };
    }

    this.eventBus?.emit?.(EVENTS.REQUESTED, {});
    try {
      const navigation = await this.authAdapter?.getDiscordLoginNavigation?.();
      if (navigation?.url) {
        this.eventBus?.emit?.(EVENTS.COMPLETED, navigation);
        return { status: 'ready', navigation };
      }
      this.eventBus?.emit?.(EVENTS.FAILED, { reason: 'missingNavigation' });
      return { status: 'error' };
    } catch (error) {
      this.eventBus?.emit?.(EVENTS.FAILED, { reason: 'exception', error });
      return { status: 'error', error };
    }
  }
}
