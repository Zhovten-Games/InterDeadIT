import assert from 'assert';
import EfbdApiAdapter from '../themes/InterDead/assets/js/infrastructure/efbd/EfbdApiAdapter.js';

describe('EfbdApiAdapter', () => {
  it('returns error status when base URL is missing', async () => {
    const adapter = new EfbdApiAdapter({ apiConfig: {} });
    const result = await adapter.fetchSummary();
    assert.strictEqual(result.status, 'error');
  });

  it('surfaces unauthenticated status from summary endpoint', async () => {
    const adapter = new EfbdApiAdapter({
      apiConfig: { baseUrl: 'https://api.test', efbdSummaryPath: '/efbd/summary' },
      fetcher: async () => ({ status: 401 }),
    });
    const result = await adapter.fetchSummary();
    assert.strictEqual(result.status, 'unauthenticated');
  });

  it('parses payload when summary endpoint succeeds', async () => {
    const payload = { profileId: 'p-1', axes: [] };
    const adapter = new EfbdApiAdapter({
      apiConfig: { baseUrl: 'https://api.test', efbdSummaryPath: '/efbd/summary' },
      fetcher: async (url, options) => {
        assert.ok(url.includes('/efbd/summary'));
        assert.strictEqual(options?.credentials, 'include');
        return {
          ok: true,
          status: 200,
          json: async () => payload,
        };
      },
    });

    const result = await adapter.fetchSummary();
    assert.strictEqual(result.status, 'ok');
    assert.deepStrictEqual(result.payload, payload);
  });

  it('includes credentials when sending trigger payloads', async () => {
    const trigger = { axis: 'x', value: 5 };
    const adapter = new EfbdApiAdapter({
      apiConfig: { baseUrl: 'https://api.test', efbdTriggerPath: '/efbd/trigger' },
      fetcher: async (url, options) => {
        assert.ok(url.includes('/efbd/trigger'));
        assert.strictEqual(options?.method, 'POST');
        assert.strictEqual(options?.credentials, 'include');
        return {
          ok: true,
          status: 200,
          json: async () => ({ received: trigger }),
        };
      },
    });

    const result = await adapter.sendTrigger(trigger);
    assert.strictEqual(result.status, 'ok');
    assert.deepStrictEqual(result.payload, { received: trigger });
  });
});
