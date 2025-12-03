export default class CtaController {
  constructor({ startButtons = [], demoButtons = [], ctaService }) {
    this.startButtons = startButtons;
    this.demoButtons = demoButtons;
    this.ctaService = ctaService;
  }

  init() {
    const attributes = this.ctaService?.getAttributes?.() ?? null;
    this.startButtons.forEach(button => {
      if (!button) {
        return;
      }
      if (attributes) {
        Object.entries(attributes).forEach(([name, value]) => {
          if (typeof value === 'string' && value) {
            button.setAttribute(name, value);
          } else {
            button.removeAttribute(name);
          }
        });
      }
      button.addEventListener('click', event => this.handleStartClick(event));
    });
    this.demoButtons.forEach(button => button?.addEventListener('click', () => this.handleDemoClick()));
  }

  handleStartClick(event) {
    event?.preventDefault();
    const { url, target } = this.ctaService?.getNavigation?.() ?? {};
    if (url) {
      window.open(url, target, 'noopener');
    }
  }

  handleDemoClick() {
    // Intentionally left blank. Demo interactions no longer trigger visual noise effects.
  }
}
