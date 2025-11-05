export default class CtaLinkService {
  constructor({ url, target = '_blank' }) {
    this.url = typeof url === 'string' ? url.trim() : '';
    this.target = typeof target === 'string' && target.trim() ? target.trim() : '_blank';
  }

  getAttributes() {
    const attributes = { rel: 'noopener', target: this.target };
    if (this.url) {
      attributes.href = this.url;
    }
    return attributes;
  }

  getNavigation() {
    return { url: this.url, target: this.target };
  }
}
