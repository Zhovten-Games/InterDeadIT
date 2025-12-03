export default class FeatureFlagService {
  constructor(flags = {}) {
    this.identityCoreEnabled = Boolean(flags.identityCoreEnabled ?? true);
    this.efbdScaleEnabled = Boolean(flags.efbdScaleEnabled ?? true);
  }

  enableIdentity() {
    this.identityCoreEnabled = true;
  }

  disableIdentity() {
    this.identityCoreEnabled = false;
  }

  enableEfbdScale() {
    this.efbdScaleEnabled = true;
  }

  disableEfbdScale() {
    this.efbdScaleEnabled = false;
  }

  isIdentityEnabled() {
    return this.identityCoreEnabled === true;
  }

  isEfbdScaleEnabled() {
    return this.efbdScaleEnabled === true;
  }
}
