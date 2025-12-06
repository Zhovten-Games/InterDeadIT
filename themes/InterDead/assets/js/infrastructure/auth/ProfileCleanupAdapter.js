export default class ProfileCleanupAdapter {
  constructor({ apiConfig = {}, fetcher = fetch } = {}) {
    this.apiConfig = apiConfig;
    this.fetcher = typeof fetcher === 'function' ? fetcher.bind(globalThis) : null;
  }

  get baseUrl() {
    const preferred = this.apiConfig.baseUrl || this.apiConfig.defaultBaseUrl;
    return typeof preferred === 'string' && preferred ? preferred : '';
  }

  get cleanupPath() {
    return this.apiConfig.identityCleanupPath || '/auth/profile/cleanup';
  }

  async cleanupProfile(timezone) {
    if (!this.baseUrl || !this.fetcher) {
      return { status: 'error' };
    }
    const url = new URL(this.cleanupPath, this.baseUrl);
    try {
      const response = await this.fetcher(url.toString(), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Timezone': timezone || '',
        },
        body: JSON.stringify({ timezone }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        return { status: 'ok', payload };
      }
      return { status: 'error', payload };
    } catch (error) {
      return { status: 'error', error };
    }
  }
}
