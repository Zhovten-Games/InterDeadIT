import { AUTH_SESSION_EVENTS } from '../../application/auth/AuthStateService.js';

export default class AppPreloaderController {
  constructor({ body, preloader, authStateService, eventBus, maxWaitMs = 5000 }) {
    this.body = body;
    this.preloader = preloader;
    this.authStateService = authStateService;
    this.eventBus = eventBus;
    this.maxWaitMs = maxWaitMs;
    this.unsubscribeUpdated = null;
    this.unsubscribeFailed = null;
    this.timer = null;
    this.released = false;
  }

  init() {
    if (!this.body || !this.preloader) {
      return;
    }

    this.body.classList.add('gm-preloaderActive');
    this.unsubscribeUpdated = this.eventBus?.on?.(AUTH_SESSION_EVENTS.UPDATED, () => {
      this.release('session-updated');
    });
    this.unsubscribeFailed = this.eventBus?.on?.(AUTH_SESSION_EVENTS.FAILED, () => {
      this.release('session-failed');
    });

    this.timer = window.setTimeout(() => {
      this.release('timeout');
    }, this.maxWaitMs);

    if (!this.authStateService?.refresh) {
      this.release('auth-mechanism-unavailable');
    }
  }

  dispose() {
    this.unsubscribeUpdated?.();
    this.unsubscribeFailed?.();
    if (this.timer) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  release() {
    if (this.released || !this.body || !this.preloader) {
      return;
    }

    this.released = true;
    this.body.classList.remove('gm-preloaderActive');
    this.preloader.classList.add('gm-preloader--hidden');
    this.dispose();
  }
}
