import { AUTH_VISIBILITY_EVENTS } from '../../application/auth/AuthVisibilityService.js';

export default class HomeAuthController {
  constructor({
    root,
    countdownBlocks = [],
    countdownController = null,
    authVisibilityService,
    eventBus,
    onAuthenticationChange,
  }) {
    this.root = root;
    this.countdownBlocks = countdownBlocks;
    this.countdownController = countdownController;
    this.authVisibilityService = authVisibilityService;
    this.eventBus = eventBus;
    this.onAuthenticationChange = onAuthenticationChange;
    this.unsubscribe = null;
  }

  init() {
    this.unsubscribe = this.eventBus?.on?.(AUTH_VISIBILITY_EVENTS.UPDATED, (visibility) =>
      this.applyVisibility(visibility),
    );
    this.applyVisibility(this.authVisibilityService?.getSnapshot?.());
  }

  dispose() {
    this.unsubscribe?.();
  }

  applyVisibility(visibility) {
    const authenticated = visibility?.status === 'authenticated';
    if (this.root) {
      this.root.classList.toggle('gm-hero--authenticated', authenticated);
    }
    this.countdownBlocks.forEach((block) => {
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
