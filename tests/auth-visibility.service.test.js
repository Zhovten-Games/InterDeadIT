import assert from 'assert';
import AuthVisibilityService from '../InterDeadIT/themes/InterDead/static/js/application/auth/AuthVisibilityService.js';
import { AUTH_SESSION_EVENTS } from '../InterDeadIT/themes/InterDead/static/js/application/auth/AuthStateService.js';
import EventBus from '../InterDeadIT/themes/InterDead/static/js/application/events/EventBus.js';

const createService = (initialState = { authenticated: null }) => {
  const eventBus = new EventBus();
  const authStateService = { getState: () => initialState };
  const visibilityService = new AuthVisibilityService({ authStateService, eventBus });
  return { eventBus, visibilityService };
};

describe('AuthVisibilityService', () => {
  it('sanitizes the authenticated session payload before exposing it', () => {
    const { eventBus, visibilityService } = createService();
    const updates = [];
    visibilityService.onChange((state) => updates.push(state));
    visibilityService.init();

    eventBus.emit(AUTH_SESSION_EVENTS.UPDATED, {
      authenticated: true,
      profileId: 42,
      displayName: '  Jane Doe  ',
      username: 'janedoe ',
      avatarUrl: 'avatar.png',
    });

    const snapshot = visibilityService.getSnapshot();
    assert.strictEqual(snapshot.status, 'authenticated');
    assert.strictEqual(snapshot.session.profileId, '42');
    assert.strictEqual(snapshot.session.displayName, 'Jane Doe');
    assert.strictEqual(snapshot.session.username, 'janedoe');
    assert.strictEqual(snapshot.session.avatarUrl.endsWith('/avatar.png'), true);
    assert.deepStrictEqual(
      updates.map((item) => item.status),
      ['pending', 'authenticated'],
    );
  });

  it('emits unauthenticated visibility when the payload is missing or invalid', () => {
    const { eventBus, visibilityService } = createService({ authenticated: false });
    const updates = [];
    visibilityService.onChange((state) => updates.push(state));
    visibilityService.init();

    eventBus.emit(AUTH_SESSION_EVENTS.UPDATED, {});
    eventBus.emit(AUTH_SESSION_EVENTS.UPDATED, { authenticated: false });

    const snapshot = visibilityService.getSnapshot();
    assert.strictEqual(snapshot.status, 'unauthenticated');
    assert.strictEqual(snapshot.session, null);
    assert.deepStrictEqual(
      updates.map((item) => item.status),
      ['unauthenticated', 'pending', 'unauthenticated'],
    );
  });
});
