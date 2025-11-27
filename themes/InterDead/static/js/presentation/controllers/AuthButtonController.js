export default class AuthButtonController {
  constructor({ buttons = [], helperElement, authService, featureFlags, copy = {} }) {
    this.buttons = buttons;
    this.helperElement = helperElement;
    this.authService = authService;
    this.featureFlags = featureFlags;
    this.copy = {
      idle: copy.idle || '',
      disabled: copy.disabled || '',
      loading: copy.loading || '',
      error: copy.error || 'Unable to start Discord login. Please try again.',
    };
    this.statusElements = this.buttons
      .map(button => button?.querySelector?.('[data-auth-status]'))
      .filter(Boolean);
  }

  init() {
    this.applyInitialState();
    this.buttons.forEach(button => {
      if (!button) {
        return;
      }
      button.addEventListener('click', event => this.handleClick(event));
    });
  }

  applyInitialState() {
    if (this.featureFlags?.isIdentityEnabled?.() === false) {
      this.setDisabledState();
      return;
    }
    this.setIdleState();
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
    this.setLoadingState();
    const result = await this.authService?.beginLogin?.();
    if (result?.status === 'ready' && result.navigation?.url) {
      const target = result.navigation.target || '_self';
      window.open(result.navigation.url, target, 'noopener');
      return;
    }
    if (result?.status === 'disabled') {
      this.setDisabledState();
      return;
    }
    if (result?.reason === 'missingNavigation') {
      this.setErrorState('Unable to prepare the Discord login link. Please try again.');
      return;
    }
    this.setErrorState();
  }
}
