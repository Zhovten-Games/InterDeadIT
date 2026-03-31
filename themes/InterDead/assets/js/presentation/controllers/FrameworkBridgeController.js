import { FrameworkRuntime, HugoConfigSourceAdapter } from '@interdead/framework';

export default class FrameworkBridgeController {
  constructor({ windowRef = window, documentRef = document, logger = console } = {}) {
    this.windowRef = windowRef;
    this.documentRef = documentRef;
    this.logger = logger;
    this.runtime = null;
  }

  init() {
    this.runtime = new FrameworkRuntime(new HugoConfigSourceAdapter(this.documentRef), {
      windowRef: this.windowRef,
      documentRef: this.documentRef,
    });

    this.runtime.boot();
    this.logger.info('[InterDead][FrameworkBridge] Framework runtime booted from Hugo adapter.');
  }

  dispose() {
    this.runtime?.destroy?.();
    this.runtime = null;
  }
}
