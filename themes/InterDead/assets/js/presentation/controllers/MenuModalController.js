export default class MenuModalController {
  constructor({
    modalService,
    modalId = 'menu',
    options = [],
    isHome = false,
    scrollOffset = 0,
  } = {}) {
    this.modalService = modalService;
    this.modalId = modalId;
    this.options = options;
    this.isHome = isHome;
    this.scrollOffset = scrollOffset;
    this.cleanups = [];
  }

  init() {
    if (!this.modalService || !Array.isArray(this.options)) {
      return;
    }

    this.options.forEach((option) => {
      const body = option?.querySelector?.('[data-menu-option-body]');
      const link = option?.querySelector?.('[data-menu-option-link]');
      const targetId = option?.dataset?.menuTarget || '';
      const url = option?.dataset?.menuUrl || '';
      const bodyDisabled = body?.hasAttribute('disabled');

      if (body && !bodyDisabled) {
        const handleBodyClick = (event) => {
          event.preventDefault();
          this.handleBodyAction({ targetId, url });
        };
        body.addEventListener('click', handleBodyClick);
        this.cleanups.push(() => body.removeEventListener('click', handleBodyClick));
      }

      if (link) {
        const handleLinkClick = () => {
          this.modalService.close(this.modalId);
        };
        link.addEventListener('click', handleLinkClick);
        this.cleanups.push(() => link.removeEventListener('click', handleLinkClick));
      }
    });
  }

  handleBodyAction({ targetId, url } = {}) {
    if (this.isHome && targetId) {
      const scrolled = this.scrollToTarget(targetId);
      if (scrolled) {
        this.modalService.close(this.modalId);
        return;
      }
    }

    if (url) {
      this.modalService.close(this.modalId);
      window.location.assign(url);
    }
  }

  scrollToTarget(targetId) {
    if (!targetId) {
      return false;
    }
    const element = document.getElementById(targetId);
    if (!element) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    const top = rect.top + window.scrollY - this.scrollOffset;
    window.scrollTo({ top, behavior: 'smooth' });
    return true;
  }

  dispose() {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
  }
}
