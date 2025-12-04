import assert from 'assert';
import EfbdScaleBridgeService, {
  EFBD_EVENTS,
} from '../themes/InterDead/assets/js/application/efbd/EfbdScaleBridgeService.js';

describe('EfbdScaleBridgeService', () => {
  it('emits nested context payloads to the adapter and event bus', async () => {
    const adapterCalls = [];
    const emittedEvents = [];
    const adapter = {
      sendTrigger: async (payload) => {
        adapterCalls.push(payload);
        return { status: 'ok', payload: { received: true } };
      },
    };
    const featureFlags = { isEfbdScaleEnabled: () => true };
    const eventBus = { emit: (...args) => emittedEvents.push(args) };
    const service = new EfbdScaleBridgeService({ adapter, featureFlags, eventBus });

    const trigger = {
      axis: 'EBF-SOCIAL',
      value: 2,
      context: { source: 'poll', locale: 'en' },
    };

    const response = await service.emitTrigger(trigger);

    assert.strictEqual(response.status, 'ok');
    assert.deepStrictEqual(adapterCalls[0], trigger);
    assert.deepStrictEqual(emittedEvents[0], [EFBD_EVENTS.UPDATED, { received: true }]);
  });
});
