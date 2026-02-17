export default class InfoContentAdapter {
  constructor({ fetcher, parserFactory } = {}) {
    const fetchTarget = typeof window !== 'undefined' ? window : globalThis;
    this.fetcher = fetcher ?? (typeof fetch === 'function' ? fetch.bind(fetchTarget) : null);
    this.parserFactory = parserFactory || (() => new DOMParser());
  }

  async fetchHtml({ source, selector } = {}) {
    if (!source || !this.fetcher) {
      return { status: 'error', reason: 'missing_source' };
    }
    const response = await this.fetcher(source, { credentials: 'same-origin' });
    if (!response?.ok) {
      return { status: 'error', reason: 'http_error', code: response?.status };
    }
    const markup = await response.text();
    const parser = this.parserFactory?.();
    const documentRef = parser?.parseFromString
      ? parser.parseFromString(markup, 'text/html')
      : null;
    if (!documentRef) {
      return { status: 'error', reason: 'parser_unavailable' };
    }
    const target = selector ? documentRef.querySelector(selector) : documentRef.body;
    if (!target) {
      return { status: 'error', reason: 'selector_not_found' };
    }
    return { status: 'ok', html: target.innerHTML };
  }

  async fetchMarkdown({ source } = {}) {
    if (!source || !this.fetcher) {
      return { status: 'error', reason: 'missing_source' };
    }
    const response = await this.fetcher(source, { credentials: 'same-origin' });
    if (!response?.ok) {
      return { status: 'error', reason: 'http_error', code: response?.status };
    }
    const text = await response.text();
    if (!text.trim()) {
      return { status: 'error', reason: 'empty' };
    }
    return { status: 'ok', markdown: text };
  }
}
