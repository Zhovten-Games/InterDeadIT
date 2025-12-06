export default class EfbdApiAdapter {
  constructor({ apiConfig = {}, fetcher = fetch }) {
    this.apiConfig = apiConfig;
    this.fetcher = this.bindFetcher(fetcher);
  }

  get baseUrl() {
    const preferred = this.apiConfig.baseUrl || this.apiConfig.defaultBaseUrl;
    return typeof preferred === 'string' && preferred ? preferred : '';
  }

  get triggerPath() {
    return this.apiConfig.efbdTriggerPath || '/efbd/trigger';
  }

  get summaryPath() {
    return this.apiConfig.efbdSummaryPath || '/efbd/summary';
  }

  bindFetcher(fetcher) {
    if (typeof fetcher !== 'function') {
      return null;
    }

    if (typeof fetcher.bind === 'function') {
      return fetcher.bind(globalThis);
    }

    return (...args) => fetcher(...args);
  }

  async sendTrigger(trigger) {
    const baseUrl = this.baseUrl;
    if (!baseUrl || typeof this.fetcher !== 'function') {
      return { status: 'error' };
    }
    try {
      const response = await this.fetcher(new URL(this.triggerPath, baseUrl).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(trigger ?? {}),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        return { status: 'ok', payload };
      }

      if (response.status === 409 || response.status === 429) {
        return { status: 'error', message: payload?.message || 'Mini-game unavailable.' };
      }
    } catch (error) {
      return { status: 'error', error };
    }
    return { status: 'error' };
  }

  async fetchSummary() {
    const baseUrl = this.baseUrl;
    if (!baseUrl || typeof this.fetcher !== 'function') {
      return { status: 'error' };
    }

    try {
      const response = await this.fetcher(new URL(this.summaryPath, baseUrl).toString(), {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (response.status === 401) {
        return { status: 'unauthenticated' };
      }

      if (response.ok) {
        const payload = await response.json().catch(() => ({}));
        return { status: 'ok', payload };
      }
    } catch (error) {
      return { status: 'error', error };
    }

    return { status: 'error' };
  }
}
