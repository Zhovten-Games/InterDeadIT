/**
 * Ensures the landing ModalService supports resuming suspended modals.
 */
import assert from 'assert';
import ModalService from '../../landing/themes/InterDead/static/js/application/modal/ModalService.js';
import ModalEntity, { MODAL_SCROLL_BEHAVIORS } from '../../landing/themes/InterDead/static/js/domain/modal/ModalEntity.js';
import ModalViewPort from '../../landing/themes/InterDead/static/js/ports/ModalViewPort.js';

class StubView extends ModalViewPort {
  constructor(id) {
    super();
    this.id = id;
    this.isOpen = false;
  }

  open() {
    if (this.isOpen) {
      return false;
    }
    this.isOpen = true;
    return true;
  }

  close() {
    if (!this.isOpen) {
      return false;
    }
    this.isOpen = false;
    return true;
  }
}

describe('Landing ModalService resume behaviour', () => {
  it('reopens a suspended modal when the active modal closes', () => {
    const scrollEvents = [];
    const modalService = new ModalService({
      scrollController: {
        lock: id => scrollEvents.push(`lock:${id}`),
        unlock: id => scrollEvents.push(`unlock:${id}`),
      },
    });

    const ageGate = new ModalEntity({ id: 'ageGate', scrollBehavior: MODAL_SCROLL_BEHAVIORS.LOCK });
    const language = new ModalEntity({ id: 'language' });
    modalService.register({ entity: ageGate, view: new StubView('ageGate') });
    modalService.register({ entity: language, view: new StubView('language') });

    assert.strictEqual(modalService.open('ageGate'), true);
    assert.strictEqual(modalService.open('language', { resume: true }), true);
    assert.strictEqual(modalService.close('language'), true);

    const ageView = modalService.modals.get('ageGate').view;
    const langView = modalService.modals.get('language').view;
    assert.strictEqual(langView.isOpen, false);
    assert.strictEqual(ageView.isOpen, true);
    assert.deepStrictEqual(scrollEvents, ['lock:ageGate', 'unlock:ageGate', 'lock:ageGate']);
  });

  it('does not resume a modal that was removed while suspended', () => {
    const modalService = new ModalService();
    const ageGate = new ModalEntity({ id: 'ageGate' });
    const language = new ModalEntity({ id: 'language' });
    modalService.register({ entity: ageGate, view: new StubView('ageGate') });
    modalService.register({ entity: language, view: new StubView('language') });

    modalService.open('ageGate');
    modalService.open('language', { resume: true });
    assert.strictEqual(modalService.close('ageGate'), true);
    modalService.close('language');

    const ageView = modalService.modals.get('ageGate').view;
    assert.strictEqual(ageView.isOpen, false);
  });

  it('supports nested resume chains', () => {
    const modalService = new ModalService();
    modalService.register({ entity: new ModalEntity({ id: 'ageGate' }), view: new StubView('ageGate') });
    modalService.register({ entity: new ModalEntity({ id: 'language' }), view: new StubView('language') });
    modalService.register({ entity: new ModalEntity({ id: 'info' }), view: new StubView('info') });

    modalService.open('ageGate');
    modalService.open('language', { resume: true });
    modalService.open('info', { resume: true });

    modalService.close('info');
    const languageView = modalService.modals.get('language').view;
    assert.strictEqual(languageView.isOpen, true);

    modalService.close('language');
    const ageView = modalService.modals.get('ageGate').view;
    assert.strictEqual(ageView.isOpen, true);
  });
});
