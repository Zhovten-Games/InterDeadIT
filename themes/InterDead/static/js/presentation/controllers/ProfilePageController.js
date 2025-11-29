import { AUTH_SESSION_EVENTS } from '../../application/auth/AuthStateService.js';

export default class ProfilePageController {
  constructor({ authStateService, eventBus, elements = {} }) {
    this.authStateService = authStateService;
    this.eventBus = eventBus;
    this.elements = elements;
    this.unsubscribe = null;
  }

  init() {
    this.unsubscribe = this.eventBus?.on?.(AUTH_SESSION_EVENTS.UPDATED, session =>
      this.render(session),
    );
    this.render(this.authStateService?.getState?.());
  }

  dispose() {
    this.unsubscribe?.();
  }

  render(session) {
    const authenticated = Boolean(session?.authenticated);
    this.toggleVisibility(this.elements.authenticatedBlock, authenticated);
    this.toggleVisibility(this.elements.unauthenticatedBlock, !authenticated);

    if (!authenticated) {
      this.clearFields();
      return;
    }

    this.setText(this.elements.displayName, session.displayName || session.username || '—');
    this.setText(this.elements.username, session.username ? `@${session.username}` : '—');
    this.setText(this.elements.profileId, session.profileId || '—');
    this.renderAvatar(session);
  }

  renderAvatar(session) {
    const hasAvatar = Boolean(session?.avatarUrl);
    const avatarWrapper = this.elements.avatar;
    if (!avatarWrapper) return;

    avatarWrapper.classList.toggle('auth-badge__avatar--empty', !hasAvatar);
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

  clearFields() {
    this.setText(this.elements.displayName, '');
    this.setText(this.elements.username, '');
    this.setText(this.elements.profileId, '');
    if (this.elements.avatar) {
      this.elements.avatar.classList.add('auth-badge__avatar--empty');
      const avatarImage = this.elements.avatar.querySelector('[data-profile-avatar-img]');
      if (avatarImage) {
        avatarImage.src = '';
        avatarImage.alt = '';
      }
    }
  }

  setText(target, text) {
    if (!target) return;
    target.textContent = text;
  }

  toggleVisibility(target, show) {
    if (!target) return;
    target.hidden = !show;
  }
}
