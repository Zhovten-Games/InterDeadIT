import { EFBD_EVENTS } from '../../application/efbd/EfbdScaleBridgeService.js';
import { AUTH_VISIBILITY_EVENTS } from '../../application/auth/AuthVisibilityService.js';

const AXIS_CODES = ['EBF-SOCIAL', 'EBF-MIND', 'EBF-DECLINE', 'EBF-EXPOSURE', 'EBF-ABANDON'];

export default class ProfilePageController {
  constructor({ authVisibilityService, eventBus, efbdService, elements = {} }) {
    this.authVisibilityService = authVisibilityService;
    this.eventBus = eventBus;
    this.efbdService = efbdService;
    this.elements = elements;
    this.authenticatedBlocks = this.collectList(elements.authenticatedBlock);
    if (elements.efbdCard) {
      this.authenticatedBlocks.push(elements.efbdCard);
    }
    this.unauthenticatedBlocks = this.collectList(elements.unauthenticatedBlock);
    this.displayNameFields = this.collectList(elements.displayName);
    this.usernameFields = this.collectList(elements.username);
    this.profileIdFields = this.collectList(elements.profileId);
    this.axisRows = this.collectAxisRows(elements.efbdAxes);
    this.copy = {
      empty: elements.efbdCard?.dataset?.efbdEmptyText || '',
      unauthenticated: elements.efbdCard?.dataset?.efbdUnauthenticatedText || '',
      error: elements.efbdCard?.dataset?.efbdErrorText || '',
    };
    this.unsubscribeAuth = null;
    this.unsubscribeEfbd = null;
    this.pendingSummary = false;
    this.currentSession = null;
    this.currentVisibility = null;
  }

  init() {
    this.unsubscribeAuth = this.eventBus?.on?.(AUTH_VISIBILITY_EVENTS.UPDATED, (visibility) => {
      this.handleVisibilityChange(visibility);
    });
    this.unsubscribeEfbd = this.eventBus?.on?.(EFBD_EVENTS.SUMMARY_LOADED, (payload) => {
      this.renderEfbd(payload);
    });

    const initialVisibility = this.authVisibilityService?.getSnapshot?.();
    this.handleVisibilityChange(initialVisibility);
  }

  dispose() {
    this.unsubscribeAuth?.();
    this.unsubscribeEfbd?.();
  }

  async handleVisibilityChange(visibility) {
    this.currentVisibility = visibility;
    const status = visibility?.status || 'pending';
    const session = status === 'authenticated' ? visibility?.session : null;

    this.currentSession = session;
    this.renderProfile({ status, session });

    if (status === 'authenticated') {
      await this.requestSummary();
      return;
    }

    if (status === 'unauthenticated') {
      this.renderEfbd(null, { reason: 'unauthenticated' });
      return;
    }

    this.renderEfbd(null, { reason: 'pending' });
  }

  async requestSummary() {
    if (this.pendingSummary) {
      return;
    }
    this.pendingSummary = true;
    const response = await this.efbdService?.fetchSummary?.();
    this.pendingSummary = false;

    if (response?.status === 'ok') {
      this.renderEfbd(response.payload);
      return;
    }
    if (response?.status === 'unauthenticated') {
      this.renderEfbd(null, { reason: 'unauthenticated' });
      return;
    }
    if (response?.status === 'disabled') {
      this.renderEfbd(null, { reason: 'disabled' });
      return;
    }
    this.renderEfbd(null, { error: true });
  }

  renderProfile(visibility) {
    const status = visibility?.status || 'pending';
    const session = status === 'authenticated' ? visibility?.session : null;
    const isAuthenticated = status === 'authenticated';
    const isUnauthenticated = status === 'unauthenticated';

    this.toggleVisibility(this.authenticatedBlocks, isAuthenticated);
    this.toggleVisibility(this.unauthenticatedBlocks, isUnauthenticated);

    if (!isAuthenticated) {
      this.clearFields({ reason: isUnauthenticated ? 'unauthenticated' : 'pending' });
      return;
    }

    const displayName = session?.displayName || session?.username || '—';
    this.setText(this.displayNameFields, displayName);
    this.setText(this.usernameFields, session?.username ? `@${session.username}` : '—');
    this.setText(this.profileIdFields, session?.profileId || '—');
    this.renderAvatar(session);
  }

  renderAvatar(session) {
    const hasAvatar = Boolean(session?.avatarUrl);
    const avatarWrapper = this.elements.avatar;
    if (!avatarWrapper) return;

    avatarWrapper.classList.toggle('gm-profile__avatarFrame--empty', !hasAvatar);
    const avatarImage = avatarWrapper.querySelector('[data-profile-avatar-img]');
    if (avatarImage) {
      if (hasAvatar) {
        avatarImage.src = session.avatarUrl;
        avatarImage.alt = `${session.displayName || session.username || 'Avatar'}`;
      } else {
        avatarImage.src = '';
        avatarImage.alt = '';
      }
    }
  }

  renderEfbd(summary, meta = {}) {
    if (!this.elements.efbdCard) {
      return;
    }

    const statusText = this.resolveStatus(meta);
    this.setStatus(statusText);

    const hasSummary = Boolean(summary?.axes && Array.isArray(summary.axes));
    if (!hasSummary) {
      this.renderEmptyAxes(meta);
      return;
    }

    this.setText(this.elements.efbdUpdated, this.formatDate(summary.updatedAt));
    const axisMap = new Map();
    summary.axes.forEach((axis) => {
      axisMap.set(axis.code, axis);
    });

    AXIS_CODES.forEach((code) => {
      const axisRow = this.axisRows.get(code);
      if (!axisRow) return;
      const axis = axisMap.get(code);
      this.setText(axisRow.value, this.formatScore(axis?.value));
      this.setText(axisRow.updated, this.formatDate(axis?.lastUpdated));
      this.setText(axisRow.source, axis?.lastTriggerSource || '');
    });
  }

  renderEmptyAxes(meta = {}) {
    this.setText(this.elements.efbdUpdated, '—');
    this.axisRows.forEach((row) => {
      this.setText(row.value, '—');
      this.setText(row.updated, '—');
      this.setText(row.source, '');
    });

    const status = this.resolveStatus(meta);
    this.setStatus(status || this.copy.empty);
  }

  resolveStatus(meta = {}) {
    if (meta.reason === 'unauthenticated') {
      return this.copy.unauthenticated;
    }
    if (meta.reason === 'disabled') {
      return this.copy.empty;
    }
    if (meta.error) {
      return this.copy.error || this.copy.empty;
    }
    return '';
  }

  setStatus(text) {
    if (!this.elements.efbdStatus) return;
    if (text && text.trim()) {
      this.elements.efbdStatus.textContent = text;
      this.elements.efbdStatus.hidden = false;
    } else {
      this.elements.efbdStatus.textContent = '';
      this.elements.efbdStatus.hidden = true;
    }
  }

  formatScore(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return '—';
    }
    return `${numeric}`;
  }

  formatDate(value) {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date?.getTime?.())) {
      return '—';
    }
    return date.toLocaleString();
  }

  clearFields(meta = null) {
    this.setText(this.displayNameFields, '');
    this.setText(this.usernameFields, '');
    this.setText(this.profileIdFields, '');
    if (this.elements.avatar) {
      this.elements.avatar.classList.add('gm-profile__avatarFrame--empty');
      const avatarImage = this.elements.avatar.querySelector('[data-profile-avatar-img]');
      if (avatarImage) {
        avatarImage.src = '';
        avatarImage.alt = '';
      }
    }
    if (meta) {
      this.renderEfbd(null, meta);
    }
  }

  setText(target, text) {
    if (!target) return;
    if (Array.isArray(target)) {
      target.forEach((node) => {
        if (node) {
          node.textContent = text;
        }
      });
      return;
    }
    target.textContent = text;
  }

  toggleVisibility(target, show) {
    if (!target) return;

    const applyToggle = (node) => {
      if (!node) return;
      node.hidden = false;
      const hiddenClass = this.resolveHiddenClass(node);
      node.classList.toggle(hiddenClass, !show);
    };

    if (Array.isArray(target)) {
      target.forEach(applyToggle);
      return;
    }

    applyToggle(target);
  }

  resolveHiddenClass(node) {
    const baseClass = Array.from(node.classList || []).find(
      (name) => name.startsWith('gm-profile__') && !name.includes('--'),
    );
    if (baseClass) {
      return `${baseClass}--hidden`;
    }
    return 'gm-visibility--hidden';
  }

  collectAxisRows(root) {
    const rows = new Map();
    if (!root || !root.querySelectorAll) {
      return rows;
    }
    root.querySelectorAll('[data-axis-code]').forEach((node) => {
      rows.set(node.dataset.axisCode, {
        root: node,
        value: node.querySelector('[data-axis-value]'),
        updated: node.querySelector('[data-axis-updated]'),
        source: node.querySelector('[data-axis-source]'),
      });
    });
    return rows;
  }

  collectList(source) {
    if (!source) {
      return [];
    }
    if (Array.isArray(source)) {
      return source.filter(Boolean);
    }
    if (source instanceof NodeList) {
      return Array.from(source).filter(Boolean);
    }
    return [source];
  }
}
