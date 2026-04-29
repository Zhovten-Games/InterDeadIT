import LocalStorageAdapter from './infrastructure/storage/LocalStorageAdapter.js';
import ModalService from './application/modal/ModalService.js';
import AgeModeService from './application/age/AgeModeService.js';
import AgeGateController from './presentation/controllers/AgeGateController.js';
import HeaderActionsController from './presentation/controllers/HeaderActionsController.js';
import MetadataController from './presentation/controllers/MetadataController.js';
import CountdownController from './presentation/controllers/CountdownController.js';
import SliderController from './presentation/controllers/SliderController.js';
import FaqController from './presentation/controllers/FaqController.js';
import ModalTriggerController from './presentation/controllers/ModalTriggerController.js';
import ModalCloseController from './presentation/controllers/ModalCloseController.js';
import MenuModalController from './presentation/controllers/MenuModalController.js';
import MarqueeController from './presentation/controllers/MarqueeController.js';
import ModalView from './infrastructure/ui/ModalView.js';
import ModalDomMapper from './infrastructure/ui/ModalDomMapper.js';
import DocumentScrollController from './infrastructure/ui/DocumentScrollController.js';
import InfoContentAdapter from './infrastructure/info/InfoContentAdapter.js';
import InfoPanelView from './infrastructure/ui/InfoPanelView.js';
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
import NotificationService from './application/notification/NotificationService.js';
import ProfileCleanupAdapter from './infrastructure/auth/ProfileCleanupAdapter.js';
import InfoPanelService from './application/info/InfoPanelService.js';
import MarkdownRenderer from './application/info/MarkdownRenderer.js';
import InfoTriggerController from './presentation/controllers/InfoTriggerController.js';
import AppPreloaderController from './presentation/controllers/AppPreloaderController.js';
import TwemojiController from './presentation/controllers/TwemojiController.js';
import ScrollEffectsController from './presentation/controllers/ScrollEffectsController.js';
import TabsController from './presentation/controllers/TabsController.js';
import FrameworkBridgeController from './presentation/controllers/FrameworkBridgeController.js';

const storage = new LocalStorageAdapter();
const scrollController = new DocumentScrollController({ target: document.body });
const modalService = new ModalService({ storage, eventTarget: document, scrollController });
const modalMapper = new ModalDomMapper();
Array.from(document.querySelectorAll('[data-modal]')).forEach((element) => {
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

const ageService = new AgeModeService(storage);
const ageGateController = new AgeGateController({
  body: document.body,
  adultButton: document.querySelector('[data-age-gate-action="adult"]'),
  ageService,
  modalService,
  onModeChange: () => headerActionsController.refresh(),
});
ageGateController.init();

const notificationService = new NotificationService({ modalService, documentRef: document });

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

const infoPanelView = new InfoPanelView({
  modalId: 'info-panel',
  titleElement: document.querySelector('[data-info-modal-title]'),
  contentElement: document.querySelector('[data-info-modal-content]'),
  statusElement: document.querySelector('[data-info-modal-status]'),
  defaultTitle: document.querySelector('[data-info-modal-title]')?.textContent || '',
  messages: {
    loading: document.querySelector('[data-info-modal]')?.dataset?.infoLoading || '',
    error: document.querySelector('[data-info-modal]')?.dataset?.infoError || '',
    empty: document.querySelector('[data-info-modal]')?.dataset?.infoEmpty || '',
  },
});
const markedRef = typeof window !== 'undefined' ? window.marked : null;
const infoPanelService = new InfoPanelService({
  sanitizer: window.DOMPurify || null,
  adapter: new InfoContentAdapter(),
  modalService,
  view: infoPanelView,
  markdownRenderer: new MarkdownRenderer({ marked: markedRef }),
});
const infoTriggerController = new InfoTriggerController({
  triggers: Array.from(document.querySelectorAll('[data-info-trigger]')),
  infoService: infoPanelService,
  defaultModalId: 'info-panel',
});
infoTriggerController.init();

const runAutoShowModals = (() => {
  let didRun = false;
  return () => {
    if (didRun) {
      return;
    }
    didRun = true;
    modalService.autoShow();
  };
})();

const isHome = document.body?.dataset?.isHome === 'true';
const headerElement = document.querySelector('.gm-header');
const menuModalController = new MenuModalController({
  modalService,
  modalId: 'menu',
  options: Array.from(document.querySelectorAll('[data-menu-option]')),
  isHome,
  scrollOffset: headerElement?.offsetHeight || 0,
  storage,
});
menuModalController.init();

const marqueeController = new MarqueeController({
  roots: Array.from(document.querySelectorAll('[data-marquee]')),
});
marqueeController.init();

const tabsController = new TabsController({
  roots: Array.from(document.querySelectorAll('[data-tabs]')),
});
tabsController.init();

const frameworkBridgeController = new FrameworkBridgeController({
  windowRef: window,
  documentRef: document,
});
frameworkBridgeController.init();

const twemojiController = new TwemojiController({
  root: document.body,
  observerTarget: document.body,
  twemoji: window.twemoji,
});
twemojiController.init();

const headerLogoElement = document.querySelector('[data-header-logo]');
const heroMediaElement = document.querySelector('[data-hero-media]');
const sliderElement = document.querySelector('.gm-slider');
const sliderScoreboard = sliderElement?.querySelector('[data-scoreboard]') || null;
const headerLogoVisibilityScene =
  isHome && headerLogoElement && heroMediaElement
    ? {
        elements: [heroMediaElement],
        threshold: 0.35,
        onEnter: () => headerLogoElement.classList.remove('gm-header__logo--visible'),
        onLeave: () => headerLogoElement.classList.add('gm-header__logo--visible'),
      }
    : null;

if (!isHome && headerLogoElement) {
  headerLogoElement.classList.add('gm-header__logo--visible');
}

const scrollEffectsController = new ScrollEffectsController({
  intersectionScenes: [
    {
      elements: Array.from(document.querySelectorAll('[data-scroll-reveal]')),
      hiddenClass: 'gm-scrollReveal',
      visibleClass: 'gm-scrollReveal--visible',
      threshold: 0.2,
      rootMargin: '0px 0px -8% 0px',
      revealOnce: true,
    },
    headerLogoVisibilityScene,
  ].filter(Boolean),
  pinScenes:
    sliderElement && sliderScoreboard
      ? [
          {
            element: sliderScoreboard,
            container: sliderElement,
            getTopOffset: () => {
              const styles = window.getComputedStyle(sliderElement);
              const stampOffset =
                parseFloat(styles.getPropertyValue('--gm-stories-stamp-offset')) || 0;
              const headerOffset = headerElement?.offsetHeight || 0;
              return stampOffset + headerOffset;
            },
            getBaseX: () => (window.matchMedia('(max-width: 960px)').matches ? '-50%' : '0px'),
          },
        ]
      : [],
});
scrollEffectsController.init();

const runtimeConfig = window.__INTERDEAD_CONFIG__ ?? {};
const isDebug = runtimeConfig.debug === true;
const silentLogger = { info() {}, warn() {}, error() {} };
const logger = isDebug ? console : silentLogger;
const csrfState = { token: '' };
const csrfTokenProvider = () => csrfState.token;
const featureFlags = new FeatureFlagService(runtimeConfig.featureFlags);
const eventBus = new EventBus();
const appPreloaderController = new AppPreloaderController({
  body: document.body,
  preloader: document.querySelector('[data-preloader]'),
  authStateService: null,
  eventBus,
  onReleased: runAutoShowModals,
});

const apiConfig = {
  baseUrl: runtimeConfig.api?.baseUrl || runtimeConfig.api?.defaultBaseUrl,
  defaultBaseUrl: runtimeConfig.api?.defaultBaseUrl,
  identityStartPath: runtimeConfig.api?.identityStartPath,
  identitySessionPath: runtimeConfig.api?.identitySessionPath,
  efbdTriggerPath: runtimeConfig.api?.efbdTriggerPath,
  efbdSummaryPath: runtimeConfig.api?.efbdSummaryPath,
};

const profileLink = document.body?.dataset?.profileUrl || '';

const heroCta = document.querySelector('[data-cta-anchor][data-auth-copy-idle]');
const authCopy = {
  idle:
    heroCta?.dataset?.authCopyIdle ||
    heroCta?.querySelector('[data-auth-status]')?.textContent ||
    '',
  disabled: heroCta?.dataset?.authCopyDisabled || '',
  loading: heroCta?.dataset?.authCopyLoading || '',
  error: heroCta?.dataset?.authCopyError || '',
  authenticated: heroCta?.dataset?.authCopyAuthenticated || '',
};

const authAdapter = new DiscordOAuthAdapter({ apiConfig });
const authSessionAdapter = new AuthSessionAdapter({ apiConfig });
const authService = new DiscordAuthService({ authAdapter, eventBus, featureFlags });
fetch(new URL('/auth/csrf', runtimeConfig.api?.baseUrl || window.location.origin).toString(), {
  credentials: 'include',
})
  .then((response) => response.json())
  .then((payload) => {
    csrfState.token = payload?.csrfToken || '';
  })
  .catch(() => {
    csrfState.token = '';
  });

const authStateService = new AuthStateService({ sessionAdapter: authSessionAdapter, eventBus });
appPreloaderController.authStateService = authStateService;
appPreloaderController.init();
const profileCleanupAdapter = new ProfileCleanupAdapter({
  csrfTokenProvider,
  apiConfig,
});
const authVisibilityService = new AuthVisibilityService({
  logger,
  authStateService,
  eventBus,
});
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
  notificationService,
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

const efbdAdapter = new EfbdApiAdapter({
  apiConfig,
  csrfTokenProvider,
});
const efbdBridge = new EfbdScaleBridgeService({ adapter: efbdAdapter, featureFlags, eventBus });
window.InterdeadPorts = window.InterdeadPorts || {};
window.InterdeadPorts.modalService = modalService;
window.InterdeadPorts.emitScaleTrigger = (axis, value, context = {}) =>
  efbdBridge.emitTrigger({ axis, value, context });
window.InterdeadNotifications = notificationService;

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
        unauthenticatedBlock: Array.from(
          document.querySelectorAll('[data-profile-unauthenticated]'),
        ),
        displayName: Array.from(document.querySelectorAll('[data-profile-display-name]')),
        username: Array.from(document.querySelectorAll('[data-profile-username]')),
        profileId: Array.from(document.querySelectorAll('[data-profile-id]')),
        deleteButton: Array.from(document.querySelectorAll('[data-profile-delete]')),
        avatar: document.querySelector('[data-profile-avatar]'),
        efbdCard: document.querySelector('[data-profile-efbd-card]'),
        efbdStatus: document.querySelector('[data-profile-efbd-status]'),
        efbdUpdated: document.querySelector('[data-profile-efbd-updated]'),
        efbdAxes: document.querySelector('[data-profile-efbd-axes]'),
        cleanupAdapter: profileCleanupAdapter,
        notificationService,
        authStateService,
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
  onChange: (listener) => authVisibilityService.onChange?.(listener),
  isAuthenticated: () => authVisibilityService.isAuthenticated?.(),
};

class HostWindowModalPort {
  constructor({ documentRef = document } = {}) {
    this.documentRef = documentRef;
    this.overlay = null;
    this.content = null;
  }

  open(node) {
    if (!this.overlay) {
      this._ensure();
    }

    if (node && this.content.firstChild !== node) {
      this.content.innerHTML = '';
      this.content.appendChild(node);
    }

    this.overlay.hidden = false;
  }

  close() {
    if (!this.overlay) {
      return;
    }

    this.overlay.hidden = true;
    this.content.innerHTML = '';
  }

  _ensure() {
    this.overlay = this.documentRef.createElement('div');
    this.overlay.className = 'interdead-host-modal';
    this.overlay.hidden = true;

    this.content = this.documentRef.createElement('div');
    this.content.className = 'interdead-host-modal__content';

    this.overlay.appendChild(this.content);
    this.overlay.addEventListener('click', (event) => {
      if (event.target === this.overlay) {
        this.close();
      }
    });

    this.documentRef.body.appendChild(this.overlay);
  }
}

window.InterdeadPorts.modal = new HostWindowModalPort();

window.dispatchEvent(
  new CustomEvent('interdead:ports-ready', {
    detail: { ports: window.InterdeadPorts },
  }),
);

window.addEventListener('beforeunload', () => {
  scrollEffectsController.dispose?.();
  headerActionsController.dispose?.();
  countdownController.stop?.();
  sliderController.dispose?.();
  authBadgeController.dispose?.();
  authButtonController.dispose?.();
  profilePageController?.dispose?.();
  homeAuthController?.dispose?.();
  menuModalController?.dispose?.();
  marqueeController?.dispose?.();
  tabsController?.dispose?.();
  twemojiController?.dispose?.();
  appPreloaderController?.dispose?.();
  authVisibilityService.dispose?.();
  frameworkBridgeController?.dispose?.();
});
