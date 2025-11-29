import { AUTH_SESSION_EVENTS } from '../../application/auth/AuthStateService.js';

export default class HomeAuthController {
  constructor({
    root,
    countdownBlocks = [],
    countdownController = null,
    authStateService,
    eventBus,
    onAuthenticationChange,
  }) {
    this.root = root;
    this.countdownBlocks = countdownBlocks;
    this.countdownController = countdownController;
    this.authStateService = authStateService;
    this.eventBus = eventBus;
    this.onAuthenticationChange = onAuthenticationChange;
    this.unsubscribe = null;
  }

  init() {
    this.unsubscribe = this.eventBus?.on?.(AUTH_SESSION_EVENTS.UPDATED, session =>
      this.applySession(session),
    );
    this.applySession(this.authStateService?.getState?.());
  }

  dispose() {
    this.unsubscribe?.();
  }

  applySession(session) {
    const authenticated = Boolean(session?.authenticated);
    if (this.root) {
      this.root.classList.toggle('gm-hero--authenticated', authenticated);
    }
    this.countdownBlocks.forEach(block => {
      if (!block) return;
      block.classList.toggle('gm-hero__countdown--hidden', authenticated);
    });
    if (this.countdownController) {
      if (authenticated) {
        this.countdownController.stop();
      } else {
        this.countdownController.start();
      }
    }

    this.onAuthenticationChange?.(authenticated);
  }
}
