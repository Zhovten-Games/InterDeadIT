export default class EfbdApiAdapter {
  constructor({ apiConfig = {}, fetcher = fetch }) {
    this.apiConfig = apiConfig;
    this.fetcher = fetcher;
  }

  get baseUrl() {
    const preferred = this.apiConfig.baseUrl || this.apiConfig.defaultBaseUrl;
    return typeof preferred === 'string' && preferred ? preferred : '';
  }

  get triggerPath() {
    return this.apiConfig.efbdTriggerPath || '/efbd/trigger';
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
        body: JSON.stringify(trigger ?? {}),
      });
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
