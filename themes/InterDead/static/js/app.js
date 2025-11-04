// All in-code comments are in English per project guidelines.
(function () {
  const body = document.body;
  const btnAdult = document.getElementById('gm-btnAdult');
  const btnDemo = document.getElementById('gm-btnDemo');
  const toast = document.getElementById('gm-toast');
  const timerEl = document.getElementById('gm-timer');
  const betaTimerEl = document.getElementById('gm-beta-timer');
  const ctaStart = document.getElementById('gm-ctaStart');
  const ctaDemo = document.getElementById('gm-ctaDemo');
  const noise = document.querySelector('.gm-noise');
  const header = document.querySelector('.gm-header');
  const headerActions = document.querySelector('[data-header-actions]');
  const headerLogo = document.querySelector('[data-header-logo]');
  const headerCtaStart = document.getElementById('gm-ctaStartHeader');
  const headerCtaDemo = document.getElementById('gm-ctaDemoHeader');
  const ctaAnchors = Array.from(document.querySelectorAll('[data-cta-anchor]'));
  const heroMedia = document.querySelector('[data-hero-media]');
  const modalTriggers = Array.from(document.querySelectorAll('[data-modal-trigger]'));
  const modalClosers = Array.from(document.querySelectorAll('[data-modal-close]'));
  const CTA_URL = 'https://discord.gg/vAWYg3jFEp';
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  const ogUrlMeta = document.querySelector('meta[property="og:url"]');

  const storage = {
    get(key) {
      if (!key) return null;
      try {
        return localStorage.getItem(key);
      } catch (error) {
        return null;
      }
    },
    set(key, value) {
      if (!key) return;
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        // No persistent storage available.
      }
    },
  };

  class Modal {
    constructor(element, service) {
      this.element = element;
      this.service = service;
      this.id = element?.dataset?.modal || null;
      this.storageKey = element?.dataset?.modalStorage || '';
      this.auto = element?.dataset?.modalAuto === 'true';
      this.closeOnOverlay = element?.dataset?.modalCloseOnOverlay !== 'false';
      this.isOpen = element?.classList?.contains('gm-modal--open') || false;
      this.handleOverlayClick = this.handleOverlayClick.bind(this);
    }

    open() {
      if (!this.element || this.isOpen) {
        return false;
      }
      this.element.classList.add('gm-modal--open');
      this.element.setAttribute('aria-hidden', 'false');
      this.isOpen = true;
      if (this.closeOnOverlay) {
        this.element.addEventListener('click', this.handleOverlayClick);
      }
      return true;
    }

    close(options = {}) {
      if (!this.element || !this.isOpen) {
        return false;
      }
      this.element.classList.remove('gm-modal--open');
      this.element.setAttribute('aria-hidden', 'true');
      this.isOpen = false;
      if (this.closeOnOverlay) {
        this.element.removeEventListener('click', this.handleOverlayClick);
      }
      if (options.remember) {
        this.remember();
      }
      return true;
    }

    remember() {
      if (!this.storageKey || storage.get(this.storageKey)) {
        return;
      }
      storage.set(this.storageKey, 'hidden');
    }

    shouldAutoOpen() {
      if (!this.auto) {
        return false;
      }
      if (this.storageKey && storage.get(this.storageKey)) {
        return false;
      }
      return true;
    }

    handleOverlayClick(event) {
      if (event.target === this.element) {
        this.service.close(this.id);
      }
    }
  }

  class ModalService {
    constructor() {
      this.modals = new Map();
      this.activeModal = null;
      this.handleKeydown = this.handleKeydown.bind(this);
    }

    register(element) {
      if (!element) {
        return null;
      }
      const modal = new Modal(element, this);
      if (modal.id) {
        this.modals.set(modal.id, modal);
      }
      return modal;
    }

    has(id) {
      return this.modals.has(id);
    }

    open(id) {
      const modal = this.modals.get(id);
      if (!modal) {
        return;
      }
      if (this.activeModal && this.activeModal.id !== modal.id) {
        this.close(this.activeModal.id);
      }
      if (modal.open()) {
        this.activeModal = modal;
        document.addEventListener('keydown', this.handleKeydown);
      }
    }

    close(id, options = {}) {
      const modal = this.modals.get(id);
      if (!modal) {
        return;
      }
      if (modal.close(options)) {
        if (this.activeModal && this.activeModal.id === modal.id) {
          this.activeModal = null;
          document.removeEventListener('keydown', this.handleKeydown);
        }
      }
    }

    autoShow(predicate) {
      this.modals.forEach((modal) => {
        if (modal.shouldAutoOpen() && (!predicate || predicate(modal))) {
          this.open(modal.id);
        }
      });
    }

    handleKeydown(event) {
      if (event.key === 'Escape' && this.activeModal) {
        this.close(this.activeModal.id);
      }
    }
  }

  const modalService = new ModalService();
  Array.from(document.querySelectorAll('[data-modal]')).forEach((element) => modalService.register(element));

  if (canonicalLink) {
    canonicalLink.setAttribute('href', window.location.href);
  }
  if (ogUrlMeta) {
    ogUrlMeta.setAttribute('content', window.location.href);
  }

  function getVisibleCtaAnchor() {
    for (const anchor of ctaAnchors) {
      if (anchor && anchor.offsetParent !== null) {
        return anchor;
      }
    }
    return null;
  }

  function updateHeaderActionsVisibility() {
    if (!headerActions || !header) return;
    const anchor = getVisibleCtaAnchor();
    if (!anchor) {
      headerActions.classList.remove('gm-header__actions--visible');
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const headerBottom = header.offsetHeight;
    const shouldShow = rect.top <= headerBottom;
    headerActions.classList.toggle('gm-header__actions--visible', shouldShow);
  }

  function refreshHeaderActionsVisibility() {
    if (!headerActions || !header) return;
    requestAnimationFrame(updateHeaderActionsVisibility);
  }

  // Render selected mode and optionally trigger demo toast.
  function setMode(mode, opts = {}) {
    body.setAttribute('data-mode', mode);
    storage.set('gm_age_mode', mode);
    if (mode === 'demo' && opts.toast && toast) {
      toast.classList.add('gm-toast--show');
      setTimeout(() => toast.classList.remove('gm-toast--show'), 10_000);
    }
    modalService.close('ageGate');
    refreshHeaderActionsVisibility();
  }

  // Restore previous mode or show the gate.
  const saved = storage.get('gm_age_mode');
  if (saved === 'adult' || saved === 'demo') {
    setMode(saved);
  }

  btnAdult?.addEventListener('click', () => setMode('adult'));
  btnDemo?.addEventListener('click', () => setMode('demo', { toast: true }));

  modalTriggers.forEach((trigger) => {
    const target = trigger?.dataset?.modalTrigger;
    if (!target) {
      return;
    }
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      modalService.open(target);
    });
  });

  modalClosers.forEach((control) => {
    const remember = control?.dataset?.modalRemember === 'true';
    control.addEventListener('click', (event) => {
      event.preventDefault();
      const target = control.dataset.modalClose;
      if (target) {
        modalService.close(target, { remember });
        return;
      }
      const parent = control.closest('[data-modal]');
      if (parent?.dataset?.modal) {
        modalService.close(parent.dataset.modal, { remember });
      }
    });
  });

  modalService.autoShow();

  class HeaderLogoController {
    constructor({ logoElement, targetElement, visibleClass = 'gm-header__logo--visible' }) {
      this.logoElement = logoElement;
      this.targetElement = targetElement;
      this.visibleClass = visibleClass;
      this.observer = null;
      this.handleIntersection = this.handleIntersection.bind(this);
    }

    init() {
      if (!this.logoElement) {
        return;
      }
      if (!this.targetElement || typeof IntersectionObserver !== 'function') {
        this.updateVisibility(true);
        return;
      }
      this.updateVisibility(false);
      this.observer = new IntersectionObserver(this.handleIntersection, {
        threshold: 0.35,
      });
      this.observer.observe(this.targetElement);
    }

    handleIntersection(entries) {
      if (!Array.isArray(entries) || entries.length === 0) {
        return;
      }
      const entry = entries[entries.length - 1];
      this.updateVisibility(!entry.isIntersecting);
    }

    updateVisibility(shouldShow) {
      this.logoElement.classList.toggle(this.visibleClass, Boolean(shouldShow));
    }
  }

  const headerLogoController = new HeaderLogoController({
    logoElement: headerLogo,
    targetElement: heroMedia,
  });
  headerLogoController.init();

  // CTA feedbacks in English.
  function handleStartClick(event) {
    event?.preventDefault();
    window.open(CTA_URL, '_blank', 'noopener');
  }

  function handleDemoClick() {
    if (noise) {
      noise.style.animationDuration = '0.3s';
      setTimeout(() => (noise.style.animationDuration = '6s'), 700);
    }
  }

  [ctaStart, headerCtaStart].forEach((btn) => {
    if (btn) {
      btn.setAttribute('href', CTA_URL);
      btn.setAttribute('rel', 'noopener');
      btn.setAttribute('target', '_blank');
      btn.addEventListener('click', handleStartClick);
    }
  });
  [ctaDemo, headerCtaDemo].forEach((btn) => btn?.addEventListener('click', handleDemoClick));

  if (headerActions && header) {
    updateHeaderActionsVisibility();
    window.addEventListener('scroll', updateHeaderActionsVisibility, { passive: true });
    window.addEventListener('resize', updateHeaderActionsVisibility);
  }

  // Countdown to midnight (local time) for both timers if present.
  function updateTimer() {
    if (!timerEl && !betaTimerEl) return;
    const now = new Date();
    const end = new Date(now);
    end.setHours(24, 0, 0, 0);
    const ms = end.getTime() - now.getTime();
    const display = ms <= 0 ? ['00', '00', '00'] : [
      String(Math.floor(ms / 3_600_000)).padStart(2, '0'),
      String(Math.floor((ms % 3_600_000) / 60_000)).padStart(2, '0'),
      String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0'),
    ];
    const formatted = display.join(':');
    if (timerEl) timerEl.textContent = formatted;
    if (betaTimerEl) betaTimerEl.textContent = formatted;
  }

  updateTimer();
  setInterval(updateTimer, 1000);

  // --- Slider logic (BEM selectors) ---
  const slider = document.querySelector('.gm-slider');
  const track = slider?.querySelector('.js-slider-track');
  const dotsEl = slider?.querySelector('.js-slider-dots');
  const prev = slider?.querySelector('.gm-slider__nav--prev');
  const next = slider?.querySelector('.gm-slider__nav--next');
  const scoreboard = slider?.querySelector('[data-scoreboard]');
  const scoreboardInner = slider?.querySelector('[data-scoreboard-inner]');
  const scoreboardText = slider?.querySelector('[data-scoreboard-text]');
  const scoreboardAnnouncer = slider?.querySelector('[data-scoreboard-announcer]');
  const scoreboardCount = slider?.querySelector('[data-scoreboard-count]');
  const scoreboardFadeMedia = window.matchMedia('(max-width: 960px)');
  const scoreboardBaseText = scoreboard?.dataset.stampText?.trim() ?? '';
  const scoreboardAnnounceTemplate = scoreboard?.dataset.stampAnnounce?.trim() ?? '';
  let scoreboardFadeTimeout = null;
  let idx = 0;

  function clearScoreboardFadeTimer() {
    if (scoreboardFadeTimeout !== null) {
      window.clearTimeout(scoreboardFadeTimeout);
      scoreboardFadeTimeout = null;
    }
  }

  function revealScoreboard() {
    if (!scoreboard) return;
    scoreboard.classList.remove('gm-slider__scoreboard--faded');
    clearScoreboardFadeTimer();
    if (!scoreboardFadeMedia.matches) return;
    scoreboardFadeTimeout = window.setTimeout(() => {
      if (scoreboardFadeMedia.matches && scoreboard) {
        scoreboard.classList.add('gm-slider__scoreboard--faded');
      }
    }, 1600);
  }

  function syncScoreboardFade() {
    if (!scoreboard) return;
    clearScoreboardFadeTimer();
    if (scoreboardFadeMedia.matches) {
      revealScoreboard();
    } else {
      scoreboard.classList.remove('gm-slider__scoreboard--faded');
    }
  }

  if (scoreboard) {
    if (typeof scoreboardFadeMedia.addEventListener === 'function') {
      scoreboardFadeMedia.addEventListener('change', syncScoreboardFade);
    } else if (typeof scoreboardFadeMedia.addListener === 'function') {
      scoreboardFadeMedia.addListener(syncScoreboardFade);
    }
  }
  if (slider && track && dotsEl && prev && next) {
    const ordered = Array.from(track.children)
      .slice()
      .sort((a, b) => {
        const aVal = Number(a.dataset.mediums ?? a.dataset.index ?? 0);
        const bVal = Number(b.dataset.mediums ?? b.dataset.index ?? 0);
        return aVal - bVal;
      });
    ordered.forEach((slide) => track.appendChild(slide));
    const slides = Array.from(track.children);
    slides.forEach((slide, i) => {
      const parsed = Number(slide.dataset.mediums);
      const value = Number.isNaN(parsed) ? i + 1 : parsed;
      slide.dataset.mediums = String(value);
    });
    function formatAnnouncement(countValue) {
      if (!scoreboard) return '';
      const numeric = Number(countValue);
      const normalized = Number.isFinite(numeric) && numeric > 0 ? String(Math.trunc(numeric)) : '0';
      const decorated = numeric > 0 ? `+${normalized}` : '';
      if (scoreboardAnnounceTemplate.includes('__COUNT__')) {
        return scoreboardAnnounceTemplate.replace(/__COUNT__/g, normalized);
      }
      if (!scoreboardBaseText && !decorated) return '';
      return [scoreboardBaseText, decorated]
        .filter(Boolean)
        .join(' — ');
    }

    function setScoreboard(index, shouldAnimate) {
      if (!scoreboard) return;
      const slide = slides[index];
      const mediumsCount = slide?.dataset.mediums ?? '';
      const numeric = Number(mediumsCount);
      const displayCount = Number.isFinite(numeric) && numeric > 0 ? `+${Math.trunc(numeric)}` : '';
      if (scoreboardText && scoreboardBaseText) {
        scoreboardText.textContent = scoreboardBaseText;
      }
      if (scoreboardCount) {
        scoreboardCount.textContent = displayCount;
      }
      const announcement = formatAnnouncement(mediumsCount || '0');
      if (announcement) {
        scoreboard.setAttribute('aria-label', announcement);
      } else {
        scoreboard.removeAttribute('aria-label');
      }
      if (scoreboardAnnouncer) {
        scoreboardAnnouncer.textContent = announcement;
      }
      revealScoreboard();
      if (shouldAnimate && scoreboardInner) {
        scoreboardInner.classList.remove('gm-slider__scoreboardInner--animate');
        void scoreboardInner.offsetWidth;
        scoreboardInner.classList.add('gm-slider__scoreboardInner--animate');
      }
    }
    slides.forEach((_, i) => {
      const d = document.createElement('div');
      d.className = 'gm-slider__dot' + (i === 0 ? ' gm-slider__dot--active' : '');
      d.addEventListener('click', () => go(i));
      dotsEl.appendChild(d);
    });
    function go(targetIndex) {
      const prevIdx = idx;
      const rawTarget = targetIndex;
      idx = (targetIndex + slides.length) % slides.length;
      track.style.transform = `translateX(-${idx * 100}%)`;
      dotsEl.querySelectorAll('.gm-slider__dot').forEach((el, n) => {
        el.classList.toggle('gm-slider__dot--active', n === idx);
      });
      const forwardStep = prevIdx + 1;
      const wrappedForward = prevIdx === slides.length - 1 && rawTarget >= slides.length;
      const isForward = rawTarget === forwardStep || wrappedForward;
      const shouldAnimate = isForward && rawTarget !== prevIdx;
      setScoreboard(idx, shouldAnimate);
    }
    prev.addEventListener('click', () => go(idx - 1));
    next.addEventListener('click', () => go(idx + 1));
    setScoreboard(0, false);
    let x0 = null;
    track.addEventListener('pointerdown', (e) => (x0 = e.clientX));
    track.addEventListener('pointerup', (e) => {
      if (x0 == null) return;
      const dx = e.clientX - x0;
      if (Math.abs(dx) > 30) go(idx + (dx < 0 ? 1 : -1));
      x0 = null;
    });
    track.addEventListener('pointercancel', () => (x0 = null));
    track.addEventListener('pointerleave', () => (x0 = null));
    setScoreboard(idx, false);
  }

  // --- FAQ accordion (single-open) ---
  (function () {
    const root = document.querySelector('#faq');
    if (!root) return;
    root.addEventListener('click', (e) => {
      const q = e.target.closest('.gm-faq__q');
      if (!q) return;
      const item = q.closest('.gm-faq__item');
      const list = root.querySelector('.gm-faq__list');
      list
        .querySelectorAll('.gm-faq__item')
        .forEach((el) => {
          if (el !== item) el.classList.remove('gm-faq__item--active');
        });
      item.classList.toggle('gm-faq__item--active');
    });
  })();

})();

// Language switching is handled via the modal links rendered server-side.

