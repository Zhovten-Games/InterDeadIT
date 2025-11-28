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
    const url = new URL(startPath, baseUrl).toString();
    console.info('[InterDead][Auth] Prepared Discord OAuth navigation', {
      baseUrl,
      startPath,
      url,
    });
    return { status: 'ok', url, target: '_self' };
  }
}
