export default class DiscordOAuthAdapter {
  constructor({ apiConfig = {} }) {
    this.apiConfig = apiConfig;
  }

  get baseUrl() {
    const preferred = this.apiConfig.baseUrl || this.apiConfig.defaultBaseUrl;
    return typeof preferred === 'string' && preferred ? preferred : '';
  }

  get startPath() {
    return this.apiConfig.identityStartPath || '/auth/discord/start';
  }

  async getDiscordLoginNavigation() {
    const baseUrl = this.baseUrl;
    if (!baseUrl) {
      console.error('[InterDead][Auth] Missing API base URL for Discord login', {
        apiConfig: this.apiConfig,
      });
      return { status: 'error' };
    }
    const startPath = this.startPath;
    const url = new URL(startPath, baseUrl);

    const redirect = this.getRedirectUrl();
    if (redirect) {
      url.searchParams.set('redirect', redirect);
    } else {
      console.warn('[InterDead][Auth] Unable to determine redirect URL; using start path only');
    }

    console.info('[InterDead][Auth] Prepared Discord OAuth navigation', {
      baseUrl,
      startPath,
      redirect,
      url: url.toString(),
    });
    return { status: 'ok', url: url.toString(), target: '_self' };
  }

  getRedirectUrl() {
    if (typeof window === 'undefined' || !window?.location) {
      return null;
    }

    if (window.location.href) {
      return window.location.href;
    }

    const { origin = '', pathname = '/', search = '', hash = '' } = window.location;
    const fallbackPath = `${pathname}${search}${hash}`;
    if (!origin) {
      return fallbackPath;
    }

    try {
      return new URL(fallbackPath, origin).toString();
    } catch (error) {
      console.error('[InterDead][Auth] Failed to build absolute redirect URL', error);
      return fallbackPath;
    }
  }
}
