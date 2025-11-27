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
      return { status: 'error' };
    }
    const url = new URL(this.startPath, baseUrl).toString();
    return { status: 'ok', url, target: '_self' };
  }
}
