class LaunchTargetResolver {
  constructor({ documentRef = document } = {}) {
    this.documentRef = documentRef;
    this.lastError = null;
  }

  resolve() {
    this.lastError = null;
    const marker = this.documentRef?.querySelector?.('[data-interdead-embed]');
    if (!marker) {
      this.lastError = 'missing marker';
      return null;
    }

    const appSrc = this._normalizeUrl(marker.dataset.interdeadSrc);
    const externalCandidate = this._normalizeUrl(marker.dataset.interdeadExternalSrc);
    const externalSrc = externalCandidate || appSrc;
    const warnings = [];

    if (marker.dataset.interdeadExternalSrc && !externalCandidate) {
      warnings.push('invalid external src, falling back to app src');
    }

    if (!appSrc || !externalSrc) {
      this.lastError = 'invalid src';
      return null;
    }

    return {
      marker,
      appSrc,
      externalSrc,
      embedPolicy: {
        allow: marker.dataset.interdeadIframeAllow || '',
        referrerPolicy: marker.dataset.interdeadIframeReferrerPolicy || '',
      },
      warnings,
      labels: {
        launcher: marker.dataset.interdeadLauncherLabel || 'Open chat',
        chooserTitle: marker.dataset.interdeadChooserTitle || 'Choose how to open chat',
        inline: marker.dataset.interdeadInlineLabel || 'Open directly on this site',
        external: marker.dataset.interdeadExternalLabel || 'Open in a new tab',
        close: marker.dataset.interdeadCloseLabel || 'Close',
      },
      launcherAvatarSrc: this._normalizeAssetUrl(marker.dataset.interdeadLauncherAvatar),
    };
  }

  _normalizeAssetUrl(url) {
    if (!url || typeof url !== 'string') {
      return '';
    }

    return url.trim();
  }

  _normalizeUrl(url) {
    if (!url || typeof url !== 'string') return null;

    try {
      return new URL(url, this.documentRef?.location?.href || window.location.href).toString();
    } catch (_error) {
      return null;
    }
  }

  getLastError() {
    return this.lastError;
  }
}

class IframePermissionsBuilder {
  static DEFAULT_FEATURES = [
    'camera',
    'microphone',
    'geolocation',
    'fullscreen',
    'clipboard-read',
    'clipboard-write',
  ];

  resolveAllow(rawAllow) {
    const normalized = this._normalizeAllow(rawAllow);
    if (normalized) {
      return normalized;
    }

    return IframePermissionsBuilder.DEFAULT_FEATURES.join('; ');
  }

  resolveReferrerPolicy(rawPolicy) {
    if (typeof rawPolicy !== 'string') {
      return null;
    }

    const trimmed = rawPolicy.trim();
    return trimmed || null;
  }

  _normalizeAllow(rawAllow) {
    if (typeof rawAllow !== 'string') {
      return '';
    }

    const uniqueFeatures = [];
    const seen = new Set();

    for (const token of rawAllow.split(';')) {
      const value = token.trim();
      if (!value || seen.has(value)) {
        continue;
      }

      seen.add(value);
      uniqueFeatures.push(value);
    }

    return uniqueFeatures.join('; ');
  }
}

class PopupWindowManager {
  constructor({ windowRef = window, logger = console } = {}) {
    this.windowRef = windowRef;
    this.logger = logger;
  }

  openNewTabAndCloseCurrent(url) {
    if (!url || !this.windowRef) {
      return false;
    }

    const popup = this.windowRef.open(url, '_blank', 'noopener,noreferrer');
    if (!popup) {
      this.logger.error('[InterDead][LauncherLoader] Popup window was blocked by browser policy.');
      return false;
    }

    try {
      this.windowRef.close();
    } catch (_error) {
      this.logger.warn(
        '[InterDead][LauncherLoader] Unable to close the current window after popup launch.',
      );
    }

    return true;
  }
}

class FullscreenEmbedModal {
  constructor({ documentRef = document, windowRef = window, labels = {}, modalId = 'interdead-launcher' } = {}) {
    this.documentRef = documentRef;
    this.windowRef = windowRef;
    this.labels = labels;
    this.modalId = modalId;
    this.overlay = null;
    this.dialog = null;
    this.title = null;
    this.body = null;
    this.closeButton = null;
    this.modalService = null;
  }

  open(node, { mode = 'compact', title = '' } = {}) {
    this._ensure();
    if (!this.dialog || !this.body) {
      return;
    }

    this.body.innerHTML = '';
    this.body.appendChild(node);
    this.dialog.classList.toggle('gm-interdeadLauncherModal__dialog--chat', mode === 'chat');
    this.dialog.classList.toggle('gm-interdeadLauncherModal__dialog--compact', mode !== 'chat');
    this.dialog.classList.toggle('interdead-host-modal__dialog--chat', mode === 'chat');
    this.dialog.classList.toggle('interdead-host-modal__dialog--compact', mode !== 'chat');
    this.overlay?.classList?.toggle('gm-interdeadLauncherModal--chat', mode === 'chat');
    this.overlay?.classList?.toggle('gm-interdeadLauncherModal--compact', mode !== 'chat');
    if (this.title) {
      this.title.textContent = title || '';
    }

    if (this.modalService?.open) {
      this.modalService.open(this.modalId);
      return;
    }

    this.overlay?.classList?.add('interdead-host-modal--visible');
  }

  close() {
    if (this.modalService?.close) {
      this.modalService.close(this.modalId);
      return;
    }

    this.overlay?.classList?.remove('interdead-host-modal--visible');
  }

  _ensure() {
    if (this.dialog && this.body) {
      return;
    }

    const service = this.windowRef?.InterdeadPorts?.modalService;
    const existingOverlay = this.documentRef?.querySelector?.(`[data-modal="${this.modalId}"]`);
    if (service && existingOverlay) {
      this.modalService = service;
      this.overlay = existingOverlay;
      this.dialog = existingOverlay.querySelector?.('[data-interdead-host-dialog]') || null;
      this.title = existingOverlay.querySelector?.('[data-interdead-host-title]') || null;
      this.body = existingOverlay.querySelector?.('[data-interdead-host-body]') || null;
      this.closeButton = existingOverlay.querySelector?.('[data-modal-close]') || null;
      return;
    }

    this.overlay = this.documentRef.createElement('div');
    this.overlay.className = 'interdead-host-modal';

    this.dialog = this.documentRef.createElement('div');
    this.dialog.className = 'interdead-host-modal__dialog interdead-host-modal__dialog--compact';

    const header = this.documentRef.createElement('div');
    header.className = 'interdead-host-modal__header';

    this.title = this.documentRef.createElement('p');
    this.title.className = 'interdead-host-modal__title';

    const closeButton = this.documentRef.createElement('button');
    this.closeButton = closeButton;
    closeButton.type = 'button';
    closeButton.className = 'interdead-host-modal__close';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', this.labels.close || 'Close');
    closeButton.addEventListener('click', () => this.close());

    header.appendChild(this.title);
    header.appendChild(closeButton);

    this.body = this.documentRef.createElement('div');
    this.body.className = 'interdead-host-modal__body';

    this.overlay.addEventListener('click', (event) => {
      if (event.target === this.overlay) {
        this.close();
      }
    });

    this.dialog.appendChild(header);
    this.dialog.appendChild(this.body);
    this.overlay.appendChild(this.dialog);
    this.documentRef.body.appendChild(this.overlay);
  }
}

class InterDeadChoiceDialog {
  constructor({ documentRef = document, labels, onInline, onExternal } = {}) {
    this.documentRef = documentRef;
    this.labels = labels;
    this.onInline = onInline;
    this.onExternal = onExternal;
  }

  render() {
    const wrapper = this.documentRef.createElement('div');
    wrapper.className = 'interdead-choice-dialog';

    const title = this.documentRef.createElement('h2');
    title.className = 'interdead-choice-dialog__title';
    title.textContent = this.labels.chooserTitle;

    const actions = this.documentRef.createElement('div');
    actions.className = 'interdead-choice-dialog__actions';

    const inlineButton = this._createButton(
      this.labels.inline,
      'interdead-choice-dialog__button--inline',
    );
    inlineButton.addEventListener('click', () => this.onInline?.());

    const externalButton = this._createButton(
      this.labels.external,
      'interdead-choice-dialog__button--external',
    );
    externalButton.addEventListener('click', () => this.onExternal?.());

    actions.appendChild(inlineButton);
    actions.appendChild(externalButton);

    wrapper.appendChild(title);
    wrapper.appendChild(actions);

    return wrapper;
  }

  _createButton(text, className) {
    const button = this.documentRef.createElement('button');
    button.type = 'button';
    button.className = `interdead-choice-dialog__button ${className}`;
    button.textContent = text;
    return button;
  }
}

class InterDeadProtoLoader {
  constructor({
    documentRef = document,
    windowRef = window,
    logger = console,
    resolver = null,
    permissionsBuilder = null,
  } = {}) {
    this.documentRef = documentRef;
    this.windowRef = windowRef;
    this.logger = logger;
    this.resolver = resolver || new LaunchTargetResolver({ documentRef });
    this.permissionsBuilder = permissionsBuilder || new IframePermissionsBuilder();
    this.modal = null;
    this.popupManager = new PopupWindowManager({ windowRef, logger });
    this._launchConfig = null;
  }

  async boot() {
    this._launchConfig = this.resolver.resolve();
    if (!this._launchConfig) {
      const reason = this.resolver.getLastError?.() || 'unknown reason';
      this.logger.error(`[InterDead][LauncherLoader] Failed to resolve launch marker: ${reason}.`);
      return;
    }

    for (const warning of this._launchConfig.warnings || []) {
      this.logger.warn?.(`[InterDead][LauncherLoader] Marker warning: ${warning}.`);
    }

    this._ensureStyles();
    this.modal = new FullscreenEmbedModal({
      documentRef: this.documentRef,
      windowRef: this.windowRef,
      labels: this._launchConfig.labels,
    });
    this._renderLauncherButton();
  }

  _renderLauncherButton() {
    const button = this.documentRef.createElement('button');
    button.type = 'button';
    button.className = 'interdead-site-launcher';
    button.appendChild(this._buildLauncherContent());
    button.addEventListener('click', () => this._openChoiceDialog());
    this.documentRef.body.appendChild(button);
  }

  _buildLauncherContent() {
    const fragment = this.documentRef.createDocumentFragment();

    if (this._launchConfig.launcherAvatarSrc) {
      const avatar = this.documentRef.createElement('span');
      avatar.className = 'interdead-site-launcher__avatar';

      const image = this.documentRef.createElement('img');
      image.src = this._launchConfig.launcherAvatarSrc;
      image.alt = 'NIRO avatar';
      image.loading = 'lazy';

      avatar.appendChild(image);
      fragment.appendChild(avatar);
    } else {
      const pulse = this.documentRef.createElement('span');
      pulse.className = 'interdead-site-launcher__pulse';
      pulse.setAttribute('aria-hidden', 'true');
      fragment.appendChild(pulse);
    }

    const text = this.documentRef.createElement('span');
    text.className = 'interdead-site-launcher__text';
    text.textContent = this._launchConfig.labels.launcher;
    fragment.appendChild(text);

    return fragment;
  }

  _openChoiceDialog() {
    const chooser = new InterDeadChoiceDialog({
      documentRef: this.documentRef,
      windowRef: this.windowRef,
      labels: this._launchConfig.labels,
      onInline: () => this._openInline(),
      onExternal: () => this._openExternal(),
    });

    this.modal.open(chooser.render(), {
      mode: 'compact',
      title: this._launchConfig.labels.chooserTitle,
    });
  }

  _openInline() {
    this.logger.info?.('[InterDead][LauncherLoader] Opening mode: inline.');

    const iframe = this.documentRef.createElement('iframe');
    iframe.className = 'gm-interdeadLauncherModal__iframe interdead-host-modal__iframe';
    iframe.src = this._launchConfig.appSrc;
    iframe.title = 'InterDead chat';
    iframe.setAttribute('loading', 'eager');

    const allowPolicy = this.permissionsBuilder.resolveAllow(this._launchConfig.embedPolicy?.allow);
    iframe.allow = allowPolicy;

    const referrerPolicy = this.permissionsBuilder.resolveReferrerPolicy(
      this._launchConfig.embedPolicy?.referrerPolicy,
    );
    if (referrerPolicy) {
      iframe.referrerPolicy = referrerPolicy;
    }

    this.logger.info?.(`[InterDead][LauncherLoader] iframe allow policy: ${allowPolicy}.`);
    this.modal.open(iframe, { mode: 'chat', title: this._launchConfig.labels.launcher });
  }

  _openExternal() {
    this.logger.info?.('[InterDead][LauncherLoader] Opening mode: external.');
    this.modal.close();
    const opened = this.popupManager.openNewTabAndCloseCurrent(this._launchConfig.externalSrc);
    if (!opened) {
      this.logger.error(
        '[InterDead][LauncherLoader] External mode failed to open because the popup was blocked.',
      );
    }
  }

  _ensureStyles() {
    const styleId = 'interdead-proto-loader-styles';
    if (this.documentRef.getElementById(styleId)) {
      return;
    }

    const style = this.documentRef.createElement('style');
    style.id = styleId;
    style.textContent = `
      .interdead-site-launcher {
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: 110;
        border: 1px solid rgba(138, 229, 144, 0.75);
        border-radius: 999px;
        background: rgba(16, 31, 18, 0.92);
        color: #d5f0d7;
        font: inherit;
        font-size: 14px;
        padding: 8px 14px 8px 8px;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        box-shadow: 0 0 0 0 rgba(138, 229, 144, 0.36);
        animation: interdead-launcher-pulse 2s infinite;
      }

      .interdead-site-launcher__avatar {
        width: 36px;
        height: 36px;
        border-radius: 999px;
        overflow: hidden;
        border: 1px solid rgba(138, 229, 144, 0.6);
        display: inline-flex;
      }

      .interdead-site-launcher__avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .interdead-site-launcher__pulse {
        width: 12px;
        height: 12px;
        border-radius: 999px;
        background: rgba(138, 229, 144, 0.9);
        box-shadow: 0 0 0 rgba(138, 229, 144, 0.5);
      }

      .interdead-site-launcher__text {
        white-space: nowrap;
      }

      @keyframes interdead-launcher-pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(138, 229, 144, 0.36);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(138, 229, 144, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(138, 229, 144, 0);
        }
      }

      .interdead-host-modal {
        position: fixed;
        inset: 0;
        z-index: 2147483010;
        background: rgba(0, 0, 0, 0.72);
        display: none;
        align-items: center;
        justify-content: center;
      }


      .interdead-host-modal--visible {
        display: flex;
      }

      .interdead-host-modal__dialog {
        position: relative;
        width: min(560px, 92vw);
        min-height: 220px;
        background: var(--color-surface, #081008);
        border: 1px solid rgba(var(--color-accent-rgb, 138, 229, 144), 0.45);
        border-radius: var(--shape-radius, 12px);
        overflow: hidden;
      }

      .interdead-host-modal__dialog--chat {
        width: min(1240px, 96vw);
        height: min(90vh, 960px);
        border-radius: 0;
      }

      .interdead-host-modal__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 14px;
        border-bottom: 1px solid rgba(138, 229, 144, 0.22);
      }

      .interdead-host-modal__title {
        margin: 0;
        font-size: 14px;
      }

      .interdead-host-modal__body {
        padding: 16px;
      }

      .interdead-host-modal__dialog--chat .interdead-host-modal__body {
        height: 100%;
        padding: 0;
      }

      .interdead-host-modal--chat .interdead-host-modal__header {
        display: none;
      }

      .interdead-host-modal__iframe {
        width: 100%;
        height: 100%;
        border: 0;
      }

      .interdead-host-modal__close {
        border: 1px solid rgba(var(--color-accent-rgb, 138, 229, 144), 0.45);
        border-radius: var(--shape-radius-tight, 8px);
        width: 30px;
        height: 30px;
        background: transparent;
        color: var(--color-text, #d5f0d7);
        cursor: pointer;
      }

      .interdead-choice-dialog {
        width: 100%;
        box-sizing: border-box;
        padding: 4px;
        color: #d5f0d7;
      }

      .interdead-choice-dialog__title {
        margin: 0 0 16px;
      }

      .interdead-choice-dialog__actions {
        display: grid;
        gap: 12px;
      }

      .interdead-choice-dialog__button {
        border: 1px solid rgba(138, 229, 144, 0.5);
        border-radius: 10px;
        padding: 12px;
        font: inherit;
        color: #d5f0d7;
        background: rgba(24, 42, 27, 0.88);
        cursor: pointer;
      }
    `;

    this.documentRef.head?.appendChild(style);
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.InterDeadProtoLoader = InterDeadProtoLoader;
  globalThis.LaunchTargetResolver = LaunchTargetResolver;
  globalThis.PopupWindowManager = PopupWindowManager;
  globalThis.IframePermissionsBuilder = IframePermissionsBuilder;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    InterDeadProtoLoader,
    LaunchTargetResolver,
    PopupWindowManager,
    IframePermissionsBuilder,
    FullscreenEmbedModal,
    InterDeadChoiceDialog,
  };
}

new InterDeadProtoLoader().boot();
