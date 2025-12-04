export default class MiniGameLauncher {
  constructor({
    authVisibilityPort,
    assetLoader,
    documentRef = typeof document !== 'undefined' ? document : null,
    logger = console,
    scalePort = null,
  } = {}) {
    this.authVisibilityPort = authVisibilityPort;
    this.assetLoader = assetLoader;
    this.document = documentRef;
    this.logger = logger || console;
    this.scalePort = scalePort;
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

    this.stateByRoot.set(root, { initialized: false, config: configWithScalePort, mount, fallback });
    this.bindAuth(root);
  }

  bindAuth(root) {
    if (!this.authVisibilityPort?.getSnapshot) {
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
    const status = visibility?.status || 'pending';
    if (status === 'authenticated') {
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
      state.fallback.removeAttribute?.('hidden');
    }
  }

  async renderGame(root) {
    const state = this.stateByRoot.get(root);
    if (!state || state.initialized) {
      return;
    }

    const { config, mount, fallback } = state;
    if (!config || !mount) {
      return;
    }

    fallback?.setAttribute?.('hidden', 'true');
    mount.removeAttribute?.('hidden');

    const {
      assets = {},
      strings = {},
      stringKeys = {},
      options = [],
      locale = 'en',
      scalePort,
    } = config;
    const stylePromise = this.assetLoader?.loadStyle?.(assets.styleUrl, assets.styleIntegrity);
    const module = await this.assetLoader?.loadScriptModule?.(assets.scriptUrl);
    const initializer = module?.default || module?.initEfbdPoll;

    if (typeof initializer === 'function') {
      initializer({
        root,
        mount,
        options,
        strings,
        stringKeys,
        locale,
        scalePort,
      });
      state.initialized = true;
      this.stateByRoot.set(root, state);
    }

    await stylePromise;
  }
}
