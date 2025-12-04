import { AUTH_SESSION_EVENTS } from './AuthStateService.js';

export const AUTH_VISIBILITY_EVENTS = {
  UPDATED: 'AUTH_VISIBILITY_UPDATED',
};

export default class AuthVisibilityService {
  constructor({ authStateService, eventBus, logger = console }) {
    this.authStateService = authStateService;
    this.eventBus = eventBus;
    this.logger = logger || console;
    this.visibility = this.normalize(this.authStateService?.getState?.());
    this.unsubscribe = null;
  }

  init() {
    this.logger?.info?.('[InterDead][AuthVisibility] Initializing', {
      snapshot: this.visibility,
    });
    this.unsubscribe = this.eventBus?.on?.(AUTH_SESSION_EVENTS.UPDATED, (session) => {
      this.logger?.info?.('[InterDead][AuthVisibility] Received session update', { session });
      this.applySession(session);
    });
    this.emit();
  }

  dispose() {
    this.unsubscribe?.();
  }

  getSnapshot() {
    return this.visibility;
  }

  onChange(listener) {
    return this.eventBus?.on?.(AUTH_VISIBILITY_EVENTS.UPDATED, listener);
  }

  isAuthenticated() {
    return this.visibility?.status === 'authenticated';
  }

  isUnauthenticated() {
    return this.visibility?.status === 'unauthenticated';
  }

  applySession(session) {
    this.logger?.info?.('[InterDead][AuthVisibility] Applying session', { session });
    this.visibility = this.normalize(session);
    this.logger?.info?.('[InterDead][AuthVisibility] Visibility updated', {
      visibility: this.visibility,
    });
    this.emit();
    return this.visibility;
  }

  emit() {
    this.eventBus?.emit?.(AUTH_VISIBILITY_EVENTS.UPDATED, this.visibility);
  }

  normalize(session) {
    const sanitizedSession = this.sanitizeSession(session);
    this.logger?.info?.('[InterDead][AuthVisibility] Normalizing session', {
      session,
      sanitizedSession,
    });
    if (sanitizedSession) {
      return {
        status: 'authenticated',
        authenticated: true,
        session: sanitizedSession,
      };
    }

    if (session?.authenticated === false) {
      return {
        status: 'unauthenticated',
        authenticated: false,
        session: null,
      };
    }

    return {
      status: 'pending',
      authenticated: false,
      session: null,
    };
  }

  sanitizeSession(session) {
    if (!session || session.authenticated !== true) {
      return null;
    }

    return {
      authenticated: true,
      profileId: this.normalizeId(session.profileId),
      displayName: this.normalizeText(session.displayName),
      avatarUrl: this.normalizeUrl(session.avatarUrl),
      username: this.normalizeText(session.username),
    };
  }

  normalizeId(value) {
    if (typeof value === 'string' || typeof value === 'number') {
      const normalized = `${value}`.trim();
      return normalized || null;
    }
    return null;
  }

  normalizeText(value) {
    if (typeof value === 'string') {
      const normalized = value.trim();
      return normalized || null;
    }
    return null;
  }

  normalizeUrl(value) {
    if (typeof value !== 'string') {
      return null;
    }

    const base =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://example.com';

    try {
      const url = new URL(value, base);
      return url.toString();
    } catch (error) {
      console.warn('[InterDead][Auth] Ignoring invalid avatar URL', { value, error });
      return null;
    }
  }
}
