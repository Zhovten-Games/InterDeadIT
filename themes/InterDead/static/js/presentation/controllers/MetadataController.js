export default class MetadataController {
  constructor({ canonicalLink, ogUrlMeta }) {
    this.canonicalLink = canonicalLink;
    this.ogUrlMeta = ogUrlMeta;
  }

  syncWithLocation() {
    const href = window.location.href;
    if (this.canonicalLink) {
      this.canonicalLink.setAttribute('href', href);
    }
    if (this.ogUrlMeta) {
      this.ogUrlMeta.setAttribute('content', href);
    }
  }
}
