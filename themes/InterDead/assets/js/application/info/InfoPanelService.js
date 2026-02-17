export default class InfoPanelService {
  constructor({ adapter, modalService, view, markdownRenderer, cache = new Map() } = {}) {
    this.adapter = adapter;
    this.modalService = modalService;
    this.view = view;
    this.markdownRenderer = markdownRenderer;
    this.cache = cache;
  }

  async open({
    title,
    source,
    selector,
    format = 'html',
    inlineContent,
    modalId,
    resume = false,
  } = {}) {
    const targetModalId = modalId || this.view?.modalId;
    if (!targetModalId || !this.view) {
      return false;
    }

    this.view.setTitle(title);
    this.view.showLoading();
    this.view.setContent('');
    this.modalService?.open?.(targetModalId, { resume });

    const cached = this._getCached({ source, selector, format, inlineContent });
    if (cached) {
      this._applyContent(cached);
      return true;
    }

    const content = inlineContent
      ? { status: 'ok', html: inlineContent }
      : await this._fetchContent({ source, selector, format });

    if (content.status !== 'ok') {
      this.view.showError();
      return false;
    }

    this._cacheContent({ source, selector, format, inlineContent }, content.html);
    this._applyContent(content.html);
    return true;
  }

  async _fetchContent({ source, selector, format }) {
    if (!source) {
      return { status: 'error', reason: 'missing_source' };
    }
    if (format === 'markdown') {
      const result = await this.adapter?.fetchMarkdown?.({ source });
      if (result?.status !== 'ok') {
        return result || { status: 'error', reason: 'unknown' };
      }
      const html = this.markdownRenderer?.render
        ? this.markdownRenderer.render(result.markdown)
        : '';
      return html ? { status: 'ok', html } : { status: 'error', reason: 'render_failed' };
    }
    return this.adapter?.fetchHtml?.({ source, selector }) || { status: 'error' };
  }

  _applyContent(html) {
    if (!html) {
      this.view.showEmpty();
      return;
    }
    this.view.clearStatus();
    this.view.setContent(html);
  }

  _cacheContent({ source, selector, format, inlineContent }, html) {
    const key = this._buildCacheKey({ source, selector, format, inlineContent });
    if (key) {
      this.cache.set(key, html);
    }
  }

  _getCached({ source, selector, format, inlineContent }) {
    const key = this._buildCacheKey({ source, selector, format, inlineContent });
    return key ? this.cache.get(key) : null;
  }

  _buildCacheKey({ source, selector, format, inlineContent }) {
    if (inlineContent) {
      return null;
    }
    if (!source) {
      return null;
    }
    return `${source}::${selector || ''}::${format || 'html'}`;
  }
}
