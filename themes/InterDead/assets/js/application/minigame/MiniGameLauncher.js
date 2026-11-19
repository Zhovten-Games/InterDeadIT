import { contentAccess } from '../auth/AccessPolicy.js';

export default class MiniGameLauncher {
  constructor({
    authVisibilityPort,
    assetLoader,
    documentRef = typeof document !== 'undefined' ? document : null,
    logger = console,
    scalePort = null,
    authEnabled = true,
  } = {}) {
    this.authVisibilityPort = authVisibilityPort;
    this.assetLoader = assetLoader;
    this.document = documentRef;
    this.logger = logger || console;
    this.scalePort = scalePort;
    this.authEnabled = authEnabled;
    this.stateByRoot = new Map();
  }

  normalizeRootId(rawId) {
    if (typeof rawId !== 'string') {
      return '';
    }

    return rawId
      .trim()
      .replace(/^['"]+/, '')
      .replace(/['"]+$/, '');
  }

  register(config = {}) {
    const normalizedRootId = this.normalizeRootId(config.rootId);
    const root =
      config.rootElement ||
      this.document?.getElementById?.(normalizedRootId || config.rootId || undefined);
    if (!root) {
      this.logger?.warn?.('[InterDead][MiniGame] Missing root element for mini-game', {
        id: normalizedRootId || config.rootId,
      });
      return;
    }

    const fallback = root.querySelector?.('[data-minigame-fallback]') || null;
    const mount = root.querySelector?.('[data-minigame-mount]') || null;
    const previous = this.stateByRoot.get(root);
    if (previous?.unsubscribe) {
      previous.unsubscribe();
    }

    const configWithScalePort = {
      ...config,
      scalePort: config.scalePort || this.scalePort,
    };

    this.stateByRoot.set(root, {
      initialized: false,
      config: configWithScalePort,
      mount,
      fallback,
    });
    this.bindAuth(root);
  }

  bindAuth(root) {
    const state = this.stateByRoot.get(root);
    if (!state) return;
    state.unsubscribe?.();
    state.unsubscribe = null;
    if (!this.authEnabled) {
      this.applyVisibility(root, null);
      return;
    }
    if (!this.authVisibilityPort?.getSnapshot) {
      state.visible = false;
      this.renderFallback(root, 'unauthenticated');
      return;
    }

    const visibility = this.authVisibilityPort.getSnapshot();
    this.applyVisibility(root, visibility);
    const unsubscribe = this.authVisibilityPort.onChange?.((next) =>
      this.applyVisibility(root, next),
    );
    if (typeof unsubscribe === 'function') {
      const state = this.stateByRoot.get(root) || {};
      state.unsubscribe = unsubscribe;
      this.stateByRoot.set(root, state);
    }
  }

  refreshAuthBindings() {
    Array.from(this.stateByRoot.keys()).forEach((root) => this.bindAuth(root));
  }

  setScalePort(scalePort) {
    if (!scalePort) {
      return;
    }

    const previous = this.scalePort;
    this.scalePort = scalePort;

    this.stateByRoot.forEach((state) => {
      if (!state?.config) {
        return;
      }

      if (!state.config.scalePort || state.config.scalePort === previous) {
        state.config.scalePort = scalePort;
      }
    });
  }

  applyVisibility(root, visibility) {
    const state = this.stateByRoot.get(root);
    if (!state) return;
    const status = visibility?.status || 'pending';
    state.visible = contentAccess({ auth: { enabled: this.authEnabled } }, visibility);
    if (state.visible) {
      this.renderGame(root);
      return;
    }

    this.renderFallback(root, status);
  }

  renderFallback(root) {
    const state = this.stateByRoot.get(root);
    if (!state) {
      return;
    }

    if (state.mount) {
      state.mount.setAttribute?.('hidden', 'true');
    }

    if (state.fallback) {
      if (!this.authEnabled) {
        state.fallback.removeAttribute?.('data-i18n');
        state.fallback.textContent = state.config?.strings?.error || 'Unable to load artifact.';
      }
      state.fallback.removeAttribute?.('hidden');
    }
  }

  renderGame(root) {
    const state = this.stateByRoot.get(root);
    if (!state?.config || !state.mount) return;
    if (state.initialized) {
      this.showGame(root, state);
      return;
    }
    // Auth snapshots and ports-ready may arrive while the same module is loading.
    if (!state.loading) {
      state.loading = this.initializeGame(root, state).finally(() => {
        state.loading = null;
      });
    }
    return state.loading;
  }

  showGame(root, state) {
    if (this.stateByRoot.get(root) !== state || state.visible === false) return;
    state.fallback?.setAttribute?.('hidden', 'true');
    state.mount?.removeAttribute?.('hidden');
  }

  async initializeGame(root, state) {
    const { config, mount, fallback } = state;
    const normalizedRootId = this.normalizeRootId(config.rootId || root?.id);
    const logContext = {
      id: normalizedRootId || config.rootId || root?.id,
      rootAvailable: Boolean(root),
      mountAvailable: Boolean(mount),
      fallbackAvailable: Boolean(fallback),
    };
    this.logger?.info?.('[InterDead][MiniGame] Rendering mini-game', logContext);

    const {
      assets = {},
      strings = {},
      stringKeys = {},
      options = [],
      locale = 'en',
      scalePort,
      mapUrl,
      media = {},
      gameId,
    } = config;
    if (assets?.styleUrl) {
      this.logger?.info?.('[InterDead][MiniGame] Loading mini-game styles', {
        ...logContext,
        styleUrl: assets.styleUrl,
      });
    }

    let module;
    try {
      [module] = await Promise.all([
        this.assetLoader?.loadScriptModule?.(assets.scriptUrl),
        this.assetLoader?.loadStyle?.(assets.styleUrl, assets.styleIntegrity),
      ]);
    } catch (error) {
      this.logger?.error?.('[InterDead][MiniGame] Failed to load mini-game module', {
        ...logContext,
        scriptUrl: assets.scriptUrl,
        error,
      });
      if (this.stateByRoot.get(root) === state) this.renderFallback(root);
      return;
    }

    if (this.stateByRoot.get(root) !== state) return;
    if (!module) {
      this.logger?.warn?.('[InterDead][MiniGame] Mini-game module missing after load', {
        ...logContext,
        scriptUrl: assets.scriptUrl,
      });
      this.renderFallback(root);
      return;
    }

    const initializer = module?.default || module?.initEfbdPoll;

    if (typeof initializer !== 'function') {
      this.logger?.warn?.('[InterDead][MiniGame] Missing initializer on mini-game module', {
        ...logContext,
        scriptUrl: assets.scriptUrl,
      });
      this.renderFallback(root);
      return;
    }

    let initResult;
    try {
      initResult = await initializer({
        root,
        mount,
        options,
        strings,
        stringKeys,
        locale,
        scalePort,
        mapUrl,
        media,
        gameId,
      });
    } catch (error) {
      this.logger?.error?.('[InterDead][MiniGame] Mini-game initializer threw', {
        ...logContext,
        scriptUrl: assets.scriptUrl,
        error,
      });
      if (this.stateByRoot.get(root) === state) this.renderFallback(root);
      return;
    }

    if (this.stateByRoot.get(root) !== state) return;
    this.logger?.info?.('[InterDead][MiniGame] Mini-game initializer result', {
      ...logContext,
      scriptUrl: assets.scriptUrl,
      initialized: initResult,
    });

    if (initResult === false) {
      this.logger?.warn?.('[InterDead][MiniGame] Mini-game initializer reported failure', {
        ...logContext,
        scriptUrl: assets.scriptUrl,
      });
      this.renderFallback(root);
      return;
    }

    state.initialized = true;
    this.showGame(root, state);
  }
}
