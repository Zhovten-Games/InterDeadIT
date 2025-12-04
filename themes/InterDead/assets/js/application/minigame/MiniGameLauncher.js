export default class MiniGameLauncher {
  constructor({
    authVisibilityPort,
    assetLoader,
    documentRef = typeof document !== 'undefined' ? document : null,
    logger = console,
  } = {}) {
    this.authVisibilityPort = authVisibilityPort;
    this.assetLoader = assetLoader;
    this.document = documentRef;
    this.logger = logger || console;
    this.stateByRoot = new Map();
  }

  register(config = {}) {
    const root = config.rootElement || this.document?.getElementById?.(config.rootId);
    if (!root) {
      this.logger?.warn?.('[InterDead][MiniGame] Missing root element for mini-game', {
        id: config.rootId,
      });
      return;
    }

    const fallback = root.querySelector?.('[data-minigame-fallback]') || null;
    const mount = root.querySelector?.('[data-minigame-mount]') || null;
    const previous = this.stateByRoot.get(root);
    if (previous?.unsubscribe) {
      previous.unsubscribe();
    }

    this.stateByRoot.set(root, { initialized: false, config, mount, fallback });
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

  applyVisibility(root, visibility) {
    const status = visibility?.status || 'pending';
    if (status === 'authenticated') {
      this.renderGame(root);
      return;
    }

    this.renderFallback(root, status);
  }

  renderFallback(root, status) {
    const state = this.stateByRoot.get(root);
    if (!state) {
      return;
    }

    if (state.mount) {
      state.mount.setAttribute?.('hidden', 'true');
    }

    if (state.fallback) {
      if (status === 'unauthenticated') {
        state.fallback.removeAttribute?.('hidden');
      } else {
        state.fallback.setAttribute?.('hidden', 'true');
      }
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

    const { assets = {}, strings = {}, options = [], locale = 'en', scalePort } = config;
    const stylePromise = this.assetLoader?.loadStyle?.(assets.styleUrl, assets.styleIntegrity);
    const module = await this.assetLoader?.loadScriptModule?.(assets.scriptUrl);
    const initializer = module?.default || module?.initEfbdPoll;

    if (typeof initializer === 'function') {
      initializer({
        root,
        mount,
        options,
        strings,
        locale,
        scalePort,
      });
      state.initialized = true;
      this.stateByRoot.set(root, state);
    }

    await stylePromise;
  }
}
