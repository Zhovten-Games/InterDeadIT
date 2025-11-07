import { AGE_MODES } from '../../application/age/AgeModeService.js';

export default class AgeGateController {
  constructor({ body, adultButton, ageService, modalService, onModeChange }) {
    this.body = body || document.body;
    this.adultButton = adultButton;
    this.ageService = ageService;
    this.modalService = modalService;
    this.onModeChange = onModeChange;
  }

  init() {
    const stored = this.ageService.load();
    if (stored?.hasValue?.()) {
      const persistedMode = stored.getValue();
      this.updateBodyMode(persistedMode);
      this.onModeChange?.(persistedMode);
    }
    this.adultButton?.addEventListener('click', event => {
      event.preventDefault();
      this.applyMode(AGE_MODES.ADULT);
    });
  }

  applyMode(mode) {
    const result = this.ageService.setMode(mode);
    if (!result) {
      return;
    }
    const nextMode = result.getValue?.() ?? null;
    this.updateBodyMode(nextMode);
    this.modalService?.close('ageGate');
    this.onModeChange?.(nextMode);
  }

  updateBodyMode(modeValue) {
    if (!this.body) {
      return;
    }
    if (modeValue) {
      this.body.setAttribute('data-mode', modeValue);
      return;
    }
    this.body.removeAttribute('data-mode');
  }
}
