export default class MiniGameAssetLoader {
  constructor({
    documentRef = typeof document !== 'undefined' ? document : null,
    logger = console,
  } = {}) {
    this.document = documentRef;
    this.logger = logger || console;
    this.loadedStyles = new Set();
    this.loadedScripts = new Map();
  }

  normalizeUrl(rawUrl) {
    if (typeof rawUrl !== 'string') {
      return '';
    }

    return rawUrl
      .trim()
      .replace(/^['"]+/, '')
      .replace(/['"]+$/, '');
  }

  async loadStyle(url, integrity = '') {
    const normalizedUrl = this.normalizeUrl(url);
    if (!normalizedUrl || this.loadedStyles.has(normalizedUrl)) {
      return this.loadedStyles.has(normalizedUrl);
    }

    if (!this.document?.head?.appendChild || !this.document?.createElement) {
      this.logger?.warn?.('[InterDead][MiniGame] Missing document when loading style', { url });
      return false;
    }

    const link = this.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = normalizedUrl;
    link.crossOrigin = 'anonymous';
    if (integrity) {
      link.integrity = integrity;
    }

    const completion = new Promise((resolve) => {
      link.onload = () => resolve(true);
      link.onerror = () => resolve(false);
    });

    this.document.head.appendChild(link);
    const success = await completion;
    if (success) {
      this.loadedStyles.add(normalizedUrl);
    }
    return success;
  }

  async loadScriptModule(url) {
    const normalizedUrl = this.normalizeUrl(url);
    if (!normalizedUrl) {
      return null;
    }

    if (this.loadedScripts.has(normalizedUrl)) {
      return this.loadedScripts.get(normalizedUrl);
    }

    const loader = import(normalizedUrl)
      .then((module) => module)
      .catch((error) => {
        this.logger?.error?.('[InterDead][MiniGame] Failed to load mini-game script', {
          url: normalizedUrl,
          error,
        });
        return null;
      });

    this.loadedScripts.set(normalizedUrl, loader);
    return loader;
  }
}
