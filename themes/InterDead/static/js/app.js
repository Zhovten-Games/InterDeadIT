import LocalStorageAdapter from './infrastructure/storage/LocalStorageAdapter.js';
import ModalService from './application/modal/ModalService.js';
import AgeModeService from './application/age/AgeModeService.js';
import AgeGateController from './presentation/controllers/AgeGateController.js';
import HeaderActionsController from './presentation/controllers/HeaderActionsController.js';
import HeaderLogoController from './presentation/controllers/HeaderLogoController.js';
import CtaLinkService from './application/cta/CtaLinkService.js';
import CtaController from './presentation/controllers/CtaController.js';
import MetadataController from './presentation/controllers/MetadataController.js';
import CountdownController from './presentation/controllers/CountdownController.js';
import SliderController from './presentation/controllers/SliderController.js';
import FaqController from './presentation/controllers/FaqController.js';
import ModalTriggerController from './presentation/controllers/ModalTriggerController.js';
import ModalCloseController from './presentation/controllers/ModalCloseController.js';
import ModalView from './infrastructure/ui/ModalView.js';
import ModalDomMapper from './infrastructure/ui/ModalDomMapper.js';

const storage = new LocalStorageAdapter();
const modalService = new ModalService({ storage, eventTarget: document });
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

const headerActionsController = new HeaderActionsController({
  header: document.querySelector('.gm-header'),
  actionsContainer: document.querySelector('[data-header-actions]'),
  anchors: Array.from(document.querySelectorAll('[data-cta-anchor]')),
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
  demoButton: document.querySelector('[data-age-gate-action="demo"]'),
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

const CTA_URL = 'https://discord.gg/vAWYg3jFEp';
const ctaService = new CtaLinkService({ url: CTA_URL, target: '_blank' });
const ctaController = new CtaController({
  startButtons: [
    document.querySelector('[data-cta="start"]'),
    document.querySelector('[data-header-cta="start"]'),
  ],
  demoButtons: [
    document.querySelector('[data-cta="demo"]'),
    document.querySelector('[data-header-cta="demo"]'),
  ],
  ctaService,
});
ctaController.init();

const countdownController = new CountdownController({
  primaryElement: document.querySelector('[data-countdown="primary"]'),
  betaElement: document.querySelector('[data-countdown="beta"]'),
});
countdownController.start();

const sliderController = new SliderController({
  sliderElement: document.querySelector('.gm-slider'),
});
sliderController.init();

const faqController = new FaqController({
  root: document.querySelector('[data-faq-root]'),
});
faqController.init();

window.addEventListener('beforeunload', () => {
  headerLogoController.dispose?.();
  headerActionsController.dispose?.();
  countdownController.stop?.();
  sliderController.dispose?.();
});
