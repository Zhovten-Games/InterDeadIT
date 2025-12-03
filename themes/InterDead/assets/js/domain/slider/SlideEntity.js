export default class SlideEntity {
  constructor({ id = null, mediums = null, order = 0 } = {}) {
    this.id = id;
    this.order = Number.isFinite(order) ? order : 0;
    this.mediums = null;
    this.setMediums(mediums);
  }

  setMediums(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      this.mediums = null;
      return;
    }
    this.mediums = Math.trunc(numeric);
  }

  hasMediums() {
    return Number.isFinite(this.mediums) && this.mediums > 0;
  }

  getMediumsOr(fallback) {
    if (this.hasMediums()) {
      return this.mediums;
    }
    return Number.isFinite(fallback) ? fallback : 0;
  }

  getDisplayCount() {
    if (!this.hasMediums()) {
      return '';
    }
    return `+${this.mediums}`;
  }

  getAnnouncement({ baseText = '', template = '' } = {}) {
    const normalized = this.hasMediums() ? String(this.mediums) : '0';
    if (template.includes('__COUNT__')) {
      return template.replace(/__COUNT__/g, normalized);
    }
    const decorated = this.hasMediums() ? `+${normalized}` : '';
    if (!baseText && !decorated) {
      return '';
    }
    return [baseText, decorated].filter(Boolean).join(' — ');
  }
}
