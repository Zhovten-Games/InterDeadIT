import assert from 'assert';
import InfoPanelService from '../themes/InterDead/assets/js/application/info/InfoPanelService.js';

class StubView {
  constructor() {
    this.modalId = 'info-panel';
    this.lastContent = null;
    this.status = null;
    this.title = null;
  }

  setTitle(title) {
    this.title = title;
  }

  showLoading() {
    this.status = 'loading';
  }

  clearStatus() {
    this.status = null;
  }

  setContent(html) {
    this.lastContent = html;
  }

  showError() {
    this.status = 'error';
  }

  showEmpty() {
    this.status = 'empty';
  }
}

describe('InfoPanelService', () => {
  it('uses cached content when available', async () => {
    let fetchCount = 0;
    const adapter = {
      fetchHtml: async () => {
        fetchCount += 1;
        return { status: 'ok', html: '<p>Spec</p>' };
      },
    };
    const view = new StubView();
    const modalService = { open: () => true };
    const service = new InfoPanelService({ adapter, view, modalService });

    await service.open({ source: '/spec', selector: '.content', modalId: 'info-panel' });
    await service.open({ source: '/spec', selector: '.content', modalId: 'info-panel' });

    assert.strictEqual(fetchCount, 1);
    assert.strictEqual(view.lastContent, '<p>Spec</p>');
  });
});
