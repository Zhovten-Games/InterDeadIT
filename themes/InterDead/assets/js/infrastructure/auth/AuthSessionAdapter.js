export default class AuthSessionAdapter {
  constructor({ apiConfig = {} }) {
    this.apiConfig = apiConfig;
  }

  get baseUrl() {
    const preferred = this.apiConfig.baseUrl || this.apiConfig.defaultBaseUrl;
    return typeof preferred === 'string' && preferred ? preferred : '';
  }

  get sessionPath() {
    return this.apiConfig.identitySessionPath || '/auth/session';
  }

  async fetchSession() {
    const baseUrl = this.baseUrl;
    if (!baseUrl) {
      console.warn('[InterDead][Auth] Missing API base URL for session fetch', {
        apiConfig: this.apiConfig,
      });
      return { authenticated: false };
    }

    const url = new URL(this.sessionPath, baseUrl);
    const response = await fetch(url.toString(), {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Session request failed with status ${response.status}`);
    }

    const payload = await response.json().catch(() => ({}));
    return payload;
  }
}
