import { AUTH_SESSION_EVENTS } from '../../application/auth/AuthStateService.js';

export default class AuthBadgeController {
  constructor({ authStateService, eventBus, badgeElements = [], ctaContainers = [], profileLink }) {
    this.authStateService = authStateService;
    this.eventBus = eventBus;
    this.badgeElements = badgeElements;
    this.ctaContainers = ctaContainers;
    this.profileLink = profileLink;
    this.unsubscribe = null;
  }

  init() {
    this.unsubscribe = this.eventBus?.on?.(AUTH_SESSION_EVENTS.UPDATED, (session) =>
      this.applySession(session),
    );
    const currentState = this.authStateService?.getState?.();
    this.applySession(currentState);
  }

  dispose() {
    this.unsubscribe?.();
  }

  applySession(session) {
    const authenticated = Boolean(session?.authenticated);
    this.toggleCtas(!authenticated);
    this.renderBadges(authenticated ? session : null);
  }

  toggleCtas(showCta) {
    this.ctaContainers.forEach((container) => {
      if (!container) return;
      container.classList.toggle('gm-cta--hidden', !showCta);
    });
  }

  renderBadges(session) {
    this.badgeElements.forEach((root) => {
      if (!root) return;
      const nameElement = root.querySelector('[data-auth-badge-name]');
      const usernameElement = root.querySelector('[data-auth-badge-username]');
      const avatarElement = root.querySelector('[data-auth-badge-avatar]');
      const avatarImage = root.querySelector('[data-auth-badge-avatar-img]');
      const linkTarget = root.matches?.('[data-auth-badge-link]')
        ? root
        : root.querySelector('[data-auth-badge-link]');

      const hasSession = Boolean(session?.authenticated);
      root.classList.toggle('auth-badge--hidden', !hasSession);

      if (linkTarget && this.profileLink && hasSession) {
        linkTarget.setAttribute('href', this.profileLink);
      }

      if (!hasSession) {
        if (nameElement) nameElement.textContent = '';
        if (usernameElement) usernameElement.textContent = '';
        if (avatarElement) avatarElement.classList.add('auth-badge__avatar--empty');
        if (avatarImage) {
          avatarImage.src = '';
          avatarImage.alt = '';
        }
        return;
      }

      const displayName = session.displayName || session.username || 'Traveler';
      if (nameElement) {
        nameElement.textContent = displayName;
      }
      if (usernameElement) {
        usernameElement.textContent = session.username ? `@${session.username}` : '';
        usernameElement.hidden = !session.username;
      }
      if (avatarElement) {
        const hasAvatar = Boolean(session.avatarUrl);
        avatarElement.classList.toggle('auth-badge__avatar--empty', !hasAvatar);
        if (avatarImage) {
          if (hasAvatar) {
            avatarImage.src = session.avatarUrl;
            avatarImage.alt = `${displayName} avatar`;
          } else {
            avatarImage.src = '';
            avatarImage.alt = '';
          }
        }
      }
    });
  }
}
