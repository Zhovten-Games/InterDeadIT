import assert from 'assert';
import { CookieSessionStore } from '../workers/interdead-auth/src/session.js';

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

  it('stores avatar and username metadata and refreshes session tokens on read', async () => {
    const store = new CookieSessionStore('refresh-secret', new Map());
    const profile = {
      profileId: 'profile-001',
      displayName: 'Ghost Walker',
      avatarUrl: 'https://cdn.example/avatar.png',
      username: 'specter',
    };

    const initialToken = await store.issueSession(profile);
    const sessionBeforeRefresh = await store.readSession();

    assert.strictEqual(sessionBeforeRefresh.avatarUrl, profile.avatarUrl);
    assert.strictEqual(sessionBeforeRefresh.username, profile.username);

    const persistedCookies = new Map([[store.sessionKey, initialToken]]);
    const refreshedStore = new CookieSessionStore('refresh-secret', persistedCookies);
    const refreshedSession = await refreshedStore.readSession({ refresh: true });
    const cookies = refreshedStore.collectCookies();

    assert.strictEqual(refreshedSession.displayName, profile.displayName);
    assert.ok(cookies.some(cookie => cookie.startsWith(`${store.sessionKey}=`)));
  });
});
