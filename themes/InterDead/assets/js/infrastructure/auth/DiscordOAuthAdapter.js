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

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        redirect: 'manual',
      });
      if (response.status === 302) {
        const location = response.headers.get('Location');
        return { status: 'ok', url: location || url.toString(), target: '_self' };
      }
      const payload = await response.json().catch(() => ({}));
      if (response.status === 429) {
        return { status: 'error', reason: 'guard', message: payload?.message };
      }
      console.error('[InterDead][Auth] Unexpected response from start endpoint', {
        status: response.status,
        payload,
      });
      return { status: 'error', reason: 'unexpected' };
    } catch (error) {
      console.error('[InterDead][Auth] Failed to reach start endpoint', error);
      return { status: 'error', reason: 'network', error };
    }
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
