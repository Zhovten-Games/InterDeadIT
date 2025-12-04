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

  async loadStyle(url, integrity = '') {
    if (!url || this.loadedStyles.has(url)) {
      return this.loadedStyles.has(url);
    }

    if (!this.document?.head?.appendChild || !this.document?.createElement) {
      this.logger?.warn?.('[InterDead][MiniGame] Missing document when loading style', { url });
      return false;
    }

    const link = this.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
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
      this.loadedStyles.add(url);
    }
    return success;
  }

  async loadScriptModule(url) {
    if (!url) {
      return null;
    }

    if (this.loadedScripts.has(url)) {
      return this.loadedScripts.get(url);
    }

    const loader = import(url)
      .then((module) => module)
      .catch((error) => {
        this.logger?.error?.('[InterDead][MiniGame] Failed to load mini-game script', {
          url,
          error,
        });
        return null;
      });

    this.loadedScripts.set(url, loader);
    return loader;
  }
}
