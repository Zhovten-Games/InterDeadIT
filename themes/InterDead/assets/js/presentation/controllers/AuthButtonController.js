import { AUTH_SESSION_EVENTS } from '../../application/auth/AuthStateService.js';

export default class AuthButtonController {
  constructor({
    buttons = [],
    helperElement,
    authService,
    featureFlags,
    authStateService,
    eventBus,
    copy = {},
  }) {
    this.buttons = buttons;
    this.helperElement = helperElement;
    this.authService = authService;
    this.featureFlags = featureFlags;
    this.authStateService = authStateService;
    this.eventBus = eventBus;
    this.copy = {
      idle: copy.idle || '',
      disabled: copy.disabled || '',
      loading: copy.loading || '',
      error: copy.error || 'Unable to start Discord login. Please try again.',
      authenticated: copy.authenticated || '',
    };
    this.statusElements = this.buttons
      .map(button => button?.querySelector?.('[data-auth-status]'))
      .filter(Boolean);
    this.unsubscribe = null;
  }

  init() {
    this.applyInitialState();
    this.buttons.forEach(button => {
      if (!button) {
        return;
      }
      button.addEventListener('click', event => this.handleClick(event));
    });
    this.unsubscribe = this.eventBus?.on?.(AUTH_SESSION_EVENTS.UPDATED, session =>
      this.applySession(session),
    );
    this.applySession(this.authStateService?.getState?.());
  }

  applyInitialState() {
    if (this.featureFlags?.isIdentityEnabled?.() === false) {
      this.setDisabledState();
      return;
    }
    this.setIdleState();
  }

  dispose() {
    this.unsubscribe?.();
  }

  setIdleState() {
    this.setButtonsState({ disabled: false, loading: false });
    this.updateStatus(this.copy.idle);
  }

  setDisabledState() {
    this.setButtonsState({ disabled: true, loading: false });
    this.updateStatus(this.copy.disabled);
  }

  setLoadingState() {
    this.setButtonsState({ disabled: true, loading: true });
    this.updateStatus(this.copy.loading);
  }

  setAuthenticatedState(displayName) {
    this.setButtonsState({ disabled: true, loading: false });
    const statusText = this.copy.authenticated
      ? this.copy.authenticated.replace('{name}', displayName || '')
      : '';
    this.updateStatus(statusText);
  }

  setErrorState(text) {
    this.setButtonsState({ disabled: false, loading: false });
    this.updateStatus(text || this.copy.error);
  }

  setButtonsState({ disabled, loading }) {
    this.buttons.forEach(button => {
      if (!button) {
        return;
      }
      if (typeof disabled === 'boolean') {
        button.disabled = disabled;
        button.classList.toggle('auth-button--disabled', disabled);
      }
      button.classList.toggle('auth-button--loading', Boolean(loading));
    });
  }

  updateStatus(text) {
    [...this.statusElements, this.helperElement].forEach(element => {
      if (element && typeof text === 'string' && text.trim()) {
        element.textContent = text;
        element.hidden = false;
      } else if (element) {
        element.textContent = '';
        element.hidden = false;
      }
    });
  }

  async handleClick(event) {
    event?.preventDefault?.();
    if (this.featureFlags?.isIdentityEnabled?.() === false) {
      this.setDisabledState();
      return;
    }
    const currentSession = this.authStateService?.getState?.();
    if (currentSession?.authenticated) {
      this.setAuthenticatedState(currentSession.displayName);
      return;
    }
    console.info('[InterDead][UI] Auth button clicked');
    this.setLoadingState();
    const result = await this.authService?.beginLogin?.();
    if (result?.status === 'ready' && result.navigation?.url) {
      console.info('[InterDead][UI] Opening Discord login', result.navigation);
      const target = result.navigation.target || '_self';
      window.open(result.navigation.url, target, 'noopener');
      return;
    }
    if (result?.status === 'disabled') {
      console.warn('[InterDead][UI] Auth flow disabled');
      this.setDisabledState();
      return;
    }
    if (result?.reason === 'missingNavigation') {
      this.setErrorState('Unable to prepare the Discord login link. Please try again.');
      console.error('[InterDead][UI] Missing navigation from auth service', result);
      return;
    }
    console.error('[InterDead][UI] Auth flow failed', result);
    this.setErrorState();
  }

  applySession(session) {
    if (!session || session.authenticated !== true) {
      this.setIdleState();
      return;
    }

    this.setAuthenticatedState(session.displayName || session.username);
  }
}
