import assert from 'assert';
import { CookieSessionStore } from '../InterDeadIT/workers/interdead-auth/src/session.js';

describe('interdead-auth worker encoding', () => {
  it('preserves Unicode display names when issuing and validating sessions', async () => {
    const store = new CookieSessionStore('unicode-secret', new Map());
    const profile = {
      profileId: 'profile-🔒',
      displayName: '测试ユーザー 🌟',
    };

    const token = await store.issueSession(profile);
    const session = await store.readSession();

    assert.strictEqual(store.getRaw(store.sessionKey), token);
    assert.strictEqual(session.displayName, profile.displayName);

    const [payload, signature] = token.split('.');
    const tamperedPayload = `${payload.slice(0, -1)}${payload.slice(-1) === 'a' ? 'b' : 'a'}`;

    await assert.rejects(store.decodeToken(`${tamperedPayload}.${signature}`), /Token signature mismatch/);
  });
});
