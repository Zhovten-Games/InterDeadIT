class InterDeadProtoLoader {
  constructor({ documentRef = document, fetchImpl = fetch, logger = console } = {}) {
    this.documentRef = documentRef;
    this.fetchImpl = fetchImpl;
    this.logger = logger;
  }

  async boot() {
    const marker = this.documentRef.querySelector('[data-interdead-embed]');
    if (!marker) {
      return;
    }

    const appUrl = this._normalizeUrl(marker.dataset.interdeadSrc);
    if (!appUrl) {
      this.logger.error('[InterDead][LauncherLoader] Missing data-interdead-src URL.');
      return;
    }

    const entryUrl = await this._resolveEntryUrl(appUrl);
    if (!entryUrl) {
      this.logger.error('[InterDead][LauncherLoader] Failed to resolve InterDeadProto entry URL.');
      return;
    }

    this._injectEntryScript(marker, entryUrl);
  }

  _normalizeUrl(url) {
    if (!url || typeof url !== 'string') {
      return null;
    }

    try {
      return new URL(url, this.documentRef.location?.href || window.location.href);
    } catch (_error) {
      return null;
    }
  }

  async _resolveEntryUrl(appUrl) {
    try {
      const response = await this.fetchImpl(appUrl.toString(), {
        method: 'GET',
        credentials: 'omit',
      });

      if (!response.ok) {
        this.logger.error(
          `[InterDead][LauncherLoader] Unable to load app index: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const html = await response.text();
      const match = html.match(
        /<script\s+[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*><\/script>/i,
      );

      if (!match?.[1]) {
        return null;
      }

      return new URL(match[1], appUrl).toString();
    } catch (error) {
      this.logger.error(
        '[InterDead][LauncherLoader] InterDeadProto app index request failed.',
        error,
      );
      return null;
    }
  }

  _injectEntryScript(marker, entryUrl) {
    const script = this.documentRef.createElement('script');
    script.type = 'module';
    script.src = entryUrl;

    for (const [key, value] of Object.entries(marker.dataset)) {
      if (typeof value === 'string') {
        script.dataset[key] = value;
      }
    }

    this.documentRef.body.appendChild(script);
  }
}

new InterDeadProtoLoader().boot();
