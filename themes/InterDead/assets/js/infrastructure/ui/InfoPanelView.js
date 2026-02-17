export default class InfoPanelView {
  constructor({
    modalId,
    titleElement,
    contentElement,
    statusElement,
    defaultTitle = '',
    messages = {},
  } = {}) {
    this.modalId = modalId;
    this.titleElement = titleElement || null;
    this.contentElement = contentElement || null;
    this.statusElement = statusElement || null;
    this.defaultTitle = defaultTitle;
    this.messages = {
      loading: messages.loading || '',
      error: messages.error || '',
      empty: messages.empty || '',
    };
  }

  setTitle(title) {
    if (this.titleElement) {
      this.titleElement.textContent = title || this.defaultTitle || '';
    }
  }

  setContent(html) {
    if (!this.contentElement) {
      return;
    }
    this.contentElement.innerHTML = html || '';
    this.contentElement.hidden = !html;
  }

  showLoading() {
    this._setStatus(this.messages.loading, 'loading');
  }

  showError() {
    this._setStatus(this.messages.error, 'error');
  }

  showEmpty() {
    this._setStatus(this.messages.empty, 'empty');
  }

  clearStatus() {
    if (this.statusElement) {
      this.statusElement.textContent = '';
      this.statusElement.hidden = true;
      delete this.statusElement.dataset.state;
    }
  }

  reset() {
    this.setContent('');
    this.clearStatus();
  }

  _setStatus(message, state) {
    if (!this.statusElement) {
      return;
    }
    this.statusElement.textContent = message || '';
    this.statusElement.hidden = !message;
    if (message) {
      this.statusElement.dataset.state = state;
    } else {
      delete this.statusElement.dataset.state;
    }
  }
}
