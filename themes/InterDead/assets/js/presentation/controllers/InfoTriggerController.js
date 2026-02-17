export default class InfoTriggerController {
  constructor({ triggers = [], infoService, defaultModalId = null } = {}) {
    this.triggers = triggers;
    this.infoService = infoService;
    this.defaultModalId = defaultModalId;
  }

  init() {
    this.triggers.forEach((trigger) => {
      if (!trigger) {
        return;
      }
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        const payload = this._buildPayload(trigger);
        this.infoService?.open?.(payload);
      });
    });
  }

  _buildPayload(trigger) {
    const wrapper = trigger.closest('[data-info-wrapper]');
    const inlineTemplate = wrapper?.querySelector('[data-info-content]');
    const inlineContent = inlineTemplate?.innerHTML?.trim() || '';

    return {
      title: trigger.dataset.infoTitle || '',
      source: trigger.dataset.infoSource || '',
      selector: trigger.dataset.infoSelector || '',
      format: trigger.dataset.infoFormat || 'html',
      inlineContent: inlineContent || null,
      modalId: trigger.dataset.infoModal || this.defaultModalId,
      resume: trigger.dataset.infoResume === 'true',
    };
  }
}
