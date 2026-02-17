import assert from 'assert';
import InfoContentAdapter from '../themes/InterDead/assets/js/infrastructure/info/InfoContentAdapter.js';

describe('InfoContentAdapter', () => {
  it('returns an error when source is missing', async () => {
    const adapter = new InfoContentAdapter({ fetcher: null });
    const result = await adapter.fetchHtml();
    assert.strictEqual(result.status, 'error');
    assert.strictEqual(result.reason, 'missing_source');
  });

  it('extracts HTML from the requested selector', async () => {
    const adapter = new InfoContentAdapter({
      fetcher: async () => ({ ok: true, text: async () => '<div class="target">Hello</div>' }),
      parserFactory: () => ({
        parseFromString: () => ({
          body: { innerHTML: '<div>Fallback</div>' },
          querySelector: (selector) =>
            selector === '.target' ? { innerHTML: '<div class="target">Hello</div>' } : null,
        }),
      }),
    });

    const result = await adapter.fetchHtml({ source: '/spec', selector: '.target' });
    assert.strictEqual(result.status, 'ok');
    assert.strictEqual(result.html, '<div class="target">Hello</div>');
  });
});
