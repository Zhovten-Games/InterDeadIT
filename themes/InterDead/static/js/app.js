import LocalStorageAdapter from './infrastructure/storage/LocalStorageAdapter.js';
import ModalService from './application/modal/ModalService.js';
import AgeModeService from './application/age/AgeModeService.js';
import AgeGateController from './presentation/controllers/AgeGateController.js';
import HeaderActionsController from './presentation/controllers/HeaderActionsController.js';
import HeaderLogoController from './presentation/controllers/HeaderLogoController.js';
import MetadataController from './presentation/controllers/MetadataController.js';
import CountdownController from './presentation/controllers/CountdownController.js';
import SliderController from './presentation/controllers/SliderController.js';
import FaqController from './presentation/controllers/FaqController.js';
import ModalTriggerController from './presentation/controllers/ModalTriggerController.js';
import ModalCloseController from './presentation/controllers/ModalCloseController.js';
import ModalView from './infrastructure/ui/ModalView.js';
import ModalDomMapper from './infrastructure/ui/ModalDomMapper.js';
import DocumentScrollController from './infrastructure/ui/DocumentScrollController.js';
import FeatureFlagService from './application/config/FeatureFlagService.js';
import EventBus from './application/events/EventBus.js';
import DiscordAuthService from './application/auth/DiscordAuthService.js';
import AuthStateService from './application/auth/AuthStateService.js';
import AuthVisibilityService from './application/auth/AuthVisibilityService.js';
import DiscordOAuthAdapter from './infrastructure/auth/DiscordOAuthAdapter.js';
import AuthSessionAdapter from './infrastructure/auth/AuthSessionAdapter.js';
import AuthButtonController from './presentation/controllers/AuthButtonController.js';
import AuthBadgeController from './presentation/controllers/AuthBadgeController.js';
import ProfilePageController from './presentation/controllers/ProfilePageController.js';
import EfbdApiAdapter from './infrastructure/efbd/EfbdApiAdapter.js';
import EfbdScaleBridgeService from './application/efbd/EfbdScaleBridgeService.js';
import HomeAuthController from './presentation/controllers/HomeAuthController.js';

const storage = new LocalStorageAdapter();
const scrollController = new DocumentScrollController({ target: document.body });
const modalService = new ModalService({ storage, eventTarget: document, scrollController });
const modalMapper = new ModalDomMapper();
Array.from(document.querySelectorAll('[data-modal]')).forEach(element => {
  const entity = modalMapper.createEntity(element);
  const view = new ModalView(element);
  modalService.register({ entity, view });
});

const metadataController = new MetadataController({
  canonicalLink: document.querySelector('link[rel="canonical"]'),
  ogUrlMeta: document.querySelector('meta[property="og:url"]'),
});
metadataController.syncWithLocation();

const ctaAnchors = Array.from(document.querySelectorAll('[data-cta-anchor]'));

const headerActionsController = new HeaderActionsController({
  header: document.querySelector('.gm-header'),
  actionsContainer: document.querySelector('[data-header-actions]'),
  anchors: ctaAnchors,
  stickyWhenNoAnchor: ctaAnchors.length === 0,
});
headerActionsController.boot();

const headerLogoController = new HeaderLogoController({
  logoElement: document.querySelector('[data-header-logo]'),
  targetElement: document.querySelector('[data-hero-media]'),
});
headerLogoController.init();

const ageService = new AgeModeService(storage);
const ageGateController = new AgeGateController({
  body: document.body,
  adultButton: document.querySelector('[data-age-gate-action="adult"]'),
  ageService,
  modalService,
  onModeChange: () => headerActionsController.refresh(),
});
ageGateController.init();

const modalTriggerController = new ModalTriggerController({
  triggers: Array.from(document.querySelectorAll('[data-modal-trigger]')),
  modalService,
});
modalTriggerController.init();

const modalCloseController = new ModalCloseController({
  controls: Array.from(document.querySelectorAll('[data-modal-close]')),
  modalService,
});
modalCloseController.init();

modalService.autoShow();

const runtimeConfig = window.__INTERDEAD_CONFIG__ ?? {};
const featureFlags = new FeatureFlagService(runtimeConfig.featureFlags);
const eventBus = new EventBus();
const apiConfig = {
  baseUrl: runtimeConfig.api?.baseUrl || runtimeConfig.api?.defaultBaseUrl,
  defaultBaseUrl: runtimeConfig.api?.defaultBaseUrl,
  identityStartPath: runtimeConfig.api?.identityStartPath,
  identitySessionPath: runtimeConfig.api?.identitySessionPath,
  efbdTriggerPath: runtimeConfig.api?.efbdTriggerPath,
  efbdSummaryPath: runtimeConfig.api?.efbdSummaryPath,
};

const profileLink = document.body?.dataset?.profileUrl || '';

const heroCta = document.querySelector('.gm-hero__cta[data-cta-anchor]');
const authCopy = {
  idle: heroCta?.dataset?.authCopyIdle || heroCta?.querySelector('[data-auth-status]')?.textContent || '',
  disabled: heroCta?.dataset?.authCopyDisabled || '',
  loading: heroCta?.dataset?.authCopyLoading || '',
  error: heroCta?.dataset?.authCopyError || '',
  authenticated: heroCta?.dataset?.authCopyAuthenticated || '',
};

const authAdapter = new DiscordOAuthAdapter({ apiConfig });
const authSessionAdapter = new AuthSessionAdapter({ apiConfig });
const authService = new DiscordAuthService({ authAdapter, eventBus, featureFlags });
const authStateService = new AuthStateService({ sessionAdapter: authSessionAdapter, eventBus });
const authVisibilityService = new AuthVisibilityService({ authStateService, eventBus });
const authButtonController = new AuthButtonController({
  buttons: [
    document.querySelector('[data-auth-button="hero"]'),
    document.querySelector('[data-auth-button="header"]'),
  ],
  helperElement: document.querySelector('[data-auth-helper]'),
  authService,
  featureFlags,
  authStateService,
  eventBus,
  copy: authCopy,
});
authButtonController.init();
authVisibilityService.init();

const authBadgeController = new AuthBadgeController({
  authStateService,
  eventBus,
  profileLink,
  badgeElements: [
    document.querySelector('[data-auth-badge="header"]'),
    document.querySelector('[data-auth-badge="hero"]'),
  ],
  ctaContainers: [
    document.querySelector('.gm-header__cta[data-show="adult"]'),
    document.querySelector('[data-auth-button="hero"]'),
  ],
});
authBadgeController.init();

const efbdAdapter = new EfbdApiAdapter({ apiConfig });
const efbdBridge = new EfbdScaleBridgeService({ adapter: efbdAdapter, featureFlags, eventBus });
window.InterdeadPorts = window.InterdeadPorts || {};
window.InterdeadPorts.emitScaleTrigger = (axis, value, context = {}) =>
  efbdBridge.emitTrigger({ axis, value, ...context });

const countdownController = new CountdownController({
  primaryElement: document.querySelector('[data-countdown="primary"]'),
  betaElement: document.querySelector('[data-countdown="beta"]'),
});

const sliderController = new SliderController({
  sliderElement: document.querySelector('.gm-slider'),
});
sliderController.init();

const faqController = new FaqController({
  root: document.querySelector('[data-faq-root]'),
});
faqController.init();

const profilePageRoot = document.querySelector('[data-profile-page-root]');
const profilePageController = profilePageRoot
  ? new ProfilePageController({
      authVisibilityService,
      eventBus,
      efbdService: efbdBridge,
      elements: {
        authenticatedBlock: Array.from(document.querySelectorAll('[data-profile-authenticated]')),
        unauthenticatedBlock: Array.from(document.querySelectorAll('[data-profile-unauthenticated]')),
        displayName: Array.from(document.querySelectorAll('[data-profile-display-name]')),
        username: Array.from(document.querySelectorAll('[data-profile-username]')),
        profileId: Array.from(document.querySelectorAll('[data-profile-id]')),
        avatar: document.querySelector('[data-profile-avatar]'),
        efbdCard: document.querySelector('[data-profile-efbd-card]'),
        efbdStatus: document.querySelector('[data-profile-efbd-status]'),
        efbdUpdated: document.querySelector('[data-profile-efbd-updated]'),
        efbdAxes: document.querySelector('[data-profile-efbd-axes]'),
      },
    })
  : null;
profilePageController?.init?.();
authStateService.refresh?.();

const heroRoot = document.querySelector('.gm-hero');
const heroCountdownBlocks = [
  document.querySelector('.gm-hero__countdown'),
  document.querySelector('.gm-hero__beta'),
];
const homeAuthController = heroRoot
  ? new HomeAuthController({
      root: heroRoot,
      countdownBlocks: heroCountdownBlocks,
      countdownController,
      authVisibilityService,
      eventBus,
    })
  : null;
homeAuthController?.init?.();

window.InterdeadPorts.authVisibility = {
  getSnapshot: () => authVisibilityService.getSnapshot?.(),
  onChange: listener => authVisibilityService.onChange?.(listener),
  isAuthenticated: () => authVisibilityService.isAuthenticated?.(),
};

window.addEventListener('beforeunload', () => {
  headerLogoController.dispose?.();
  headerActionsController.dispose?.();
  countdownController.stop?.();
  sliderController.dispose?.();
  authBadgeController.dispose?.();
  authButtonController.dispose?.();
  profilePageController?.dispose?.();
  homeAuthController?.dispose?.();
  authVisibilityService.dispose?.();
});
