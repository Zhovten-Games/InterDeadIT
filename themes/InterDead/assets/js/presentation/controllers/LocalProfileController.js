import ProfilePageController from './ProfilePageController.js';
import { MAX_BYTES, AXES } from '../../application/profile/poll-progress.mjs';

export default class LocalProfileController {
  constructor({ profile, root, windowRef = window }) {
    this.profile = profile;
    this.root = root;
    this.window = windowRef;
    this.urls = new Set();
    this.abort = new AbortController();
  }
  init() {
    const query = (selector) => this.root.querySelector(selector);
    this.renderer = new ProfilePageController({
      elements: {
        efbdCard: query('[data-profile-efbd-card]'),
        efbdAxes: query('[data-profile-efbd-axes]'),
        efbdUpdated: query('[data-profile-efbd-updated]'),
        efbdStatus: query('[data-profile-efbd-status]'),
      },
    });
    this.root
      .querySelectorAll('[data-profile-authenticated], [data-profile-efbd-card]')
      .forEach((node) => {
        node.hidden = false;
        node.classList.remove('gm-profile__layout--hidden', 'gm-profile__card--hidden');
      });
    this.root.querySelectorAll('[data-profile-unauthenticated]').forEach((node) => {
      node.hidden = true;
    });
    const set = (selector, value) =>
      this.root.querySelectorAll(selector).forEach((node) => {
        node.textContent = value;
      });
    set('[data-profile-display-name]', this.root.dataset.localVisitor);
    set('[data-profile-username]', this.root.dataset.localMode);
    set('[data-profile-id]', 'LOCAL');
    const avatar = query('[data-profile-avatar]');
    if (avatar) avatar.hidden = true;
    const options = { signal: this.abort.signal };
    this.window.addEventListener('interdead:poll-progress-updated', () => this.render(), options);
    query('[data-local-profile-export]')?.addEventListener('click', () => this.download(), options);
    query('[data-local-profile-import]')?.addEventListener(
      'change',
      (event) => {
        void this.importFile(event);
      },
      options,
    );
    this.root.querySelectorAll('[data-profile-delete]').forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          if (!this.window.confirm(this.root.dataset.localConfirm)) return;
          try {
            this.profile.clear();
            this.feedback(this.root.dataset.localCleared);
          } catch {
            this.feedback(this.root.dataset.localTemporary);
          }
        },
        options,
      );
    });
    this.render();
  }
  render() {
    const state = this.profile.reload();
    this.renderer.renderEfbd(this.profile.summary());
    const status = this.root.querySelector('[data-local-profile-persistence]');
    if (status)
      status.textContent =
        state.persistence === 'persistent'
          ? this.root.dataset.localPersistent
          : state.persistence === 'corrupt'
            ? this.root.dataset.localCorrupt
            : this.root.dataset.localTemporary;
    const count = this.root.querySelector('[data-local-completed-count]');
    if (count) count.textContent = String(state.completedPolls.length);
    // Imported completion flags carry no answer or invented axis score.
    if (Object.keys(state.answers).length === 0) {
      for (const axis of AXES) {
        const value = this.root.querySelector(`[data-axis-code="${axis}"] [data-axis-value]`);
        if (value) value.textContent = '—';
      }
    }
  }
  feedback(text) {
    const status = this.root.querySelector('[data-local-profile-feedback]');
    if (status) {
      status.hidden = false;
      status.textContent = text;
    }
  }
  download() {
    const url = URL.createObjectURL(
      new Blob([this.profile.exportBytes()], { type: 'application/json' }),
    );
    this.urls.add(url);
    const link = this.root.ownerDocument.createElement('a');
    link.href = url;
    link.download = 'interdead-poll-progress.json';
    this.root.append(link);
    link.click();
    link.remove();
    this.window.setTimeout(() => {
      URL.revokeObjectURL(url);
      this.urls.delete(url);
    }, 1000);
  }
  async importFile(event) {
    const input = event.target,
      file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > MAX_BYTES) throw new Error('progress.size');
      const bytes = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
      if (this.abort.signal.aborted) return;
      this.profile.import(bytes);
      this.feedback(this.root.dataset.localImported);
    } catch {
      this.feedback(this.root.dataset.localInvalid);
    } finally {
      input.value = '';
    }
  }
  dispose() {
    this.abort.abort();
    for (const url of this.urls) URL.revokeObjectURL(url);
    this.urls.clear();
  }
}
