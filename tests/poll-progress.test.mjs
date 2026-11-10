import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PollProfile,
  parseProgress,
  FORMAT,
  PLAYER_FORMAT,
  STORAGE_KEY,
  withGameProgress,
  importGameProgress,
} from '../themes/InterDead/assets/js/application/profile/poll-progress.mjs';
const memory = () => {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
};
const file = (ids) => JSON.stringify({ format: FORMAT, version: 1, completedPolls: ids });
test('a real local answer survives reload with one point on the selected axis', () => {
  const storage = memory(),
    first = new PollProfile({ storage });
  assert.equal(first.complete('1-efbd-poll', 'EBF-MIND').status, 'ok');
  const restored = new PollProfile({ storage });
  assert.equal(restored.hasCompleted('1-efbd-poll'), true);
  assert.equal(restored.summary().axes.find((axis) => axis.code === 'EBF-MIND').value, 1);
});
test('duplicate local submission cannot add points', () => {
  const profile = new PollProfile({ storage: memory() });
  profile.complete('1-efbd-poll', 'EBF-MIND');
  assert.equal(profile.complete('1-efbd-poll', 'EBF-SOCIAL').code, 'replay_blocked');
  assert.equal(profile.summary().axes.find((axis) => axis.code === 'EBF-SOCIAL').value, 0);
});
test('poll-specific options and unknown poll identifiers are refused', () => {
  const profile = new PollProfile();
  assert.throws(() => profile.complete('2-efbd-poll', 'EBF-DECLINE'));
  assert.throws(() => profile.complete('__proto__', 'EBF-MIND'));
  assert.deepEqual(profile.exportObject().completedPolls, []);
});
test('an import marks completion while preserving existing local answers', () => {
  const profile = new PollProfile({ storage: memory() });
  profile.complete('1-efbd-poll', 'EBF-MIND');
  assert.equal(profile.import(file(['1-efbd-poll', '2-efbd-poll'])).added, 1);
  assert.equal(profile.import(file(['2-efbd-poll'])).added, 0);
  assert.equal(
    profile.summary().axes.reduce((sum, axis) => sum + axis.value, 0),
    1,
  );
});
test('website to game to website keeps completion and transfers no answer or identity', () => {
  const site = new PollProfile(),
    game = new PollProfile(),
    visitor = new PollProfile();
  site.complete('1-efbd-poll', 'EBF-MIND');
  game.import(site.exportBytes());
  game.complete('2-efbd-poll');
  visitor.import(withGameProgress('{"schema_version":20}', game));
  assert.deepEqual(visitor.exportObject().completedPolls, ['1-efbd-poll', '2-efbd-poll']);
  assert.deepEqual(visitor.snapshot().answers, {});
  assert.deepEqual(Object.keys(visitor.exportObject()).sort(), [
    'completedPolls',
    'format',
    'version',
  ]);
});
test('foreign gameplay, identity and score fields have no effect on site projection', () => {
  const profile = new PollProfile();
  profile.import(
    JSON.stringify({
      ...JSON.parse(file(['2-efbd-poll'])),
      identity: { admin: true },
      answers: { '2-efbd-poll': 'EBF-MIND' },
      score: 999,
      story: 'complete',
    }),
  );
  assert.deepEqual(profile.snapshot().answers, {});
  assert.equal(
    profile.summary().axes.reduce((sum, axis) => sum + axis.value, 0),
    0,
  );
});
test('invalid input is atomic across every validation failure', () => {
  const profile = new PollProfile({ storage: memory() });
  profile.complete('1-efbd-poll', 'EBF-MIND');
  const before = JSON.stringify(profile.snapshot());
  for (const input of [
    '{',
    'null',
    '{"format":"other"}',
    file(['unknown']),
    file(['1-efbd-poll', '1-efbd-poll']),
    JSON.stringify({ format: FORMAT, version: 2, completedPolls: [] }),
  ]) {
    assert.throws(() => profile.import(input));
    assert.equal(JSON.stringify(profile.snapshot()), before);
  }
});
test('duplicate and escaped duplicate JSON keys are refused', () => {
  assert.throws(() =>
    parseProgress(
      '{"format":"interdead.poll-progress","version":1,"version":2,"completedPolls":[]}',
    ),
  );
  assert.throws(() =>
    parseProgress(
      '{"format":"interdead.poll-progress","version":1,"\\u0076ersion":1,"completedPolls":[]}',
    ),
  );
});
test('corrupt stored data remains untouched until an explicit clear', () => {
  const storage = memory();
  storage.setItem(STORAGE_KEY, '{broken');
  const profile = new PollProfile({ storage });
  profile.import(file(['1-efbd-poll']));
  assert.equal(profile.snapshot().persistence, 'corrupt');
  assert.equal(storage.getItem(STORAGE_KEY), '{broken');
  profile.clear();
  assert.equal(storage.getItem(STORAGE_KEY), null);
});
test('unavailable and quota-limited storage retains downloadable results for the tab', () => {
  const storage = {
    getItem() {
      throw Error('denied');
    },
    setItem() {
      throw Error('quota');
    },
  };
  const profile = new PollProfile({ storage });
  assert.equal(profile.complete('1-efbd-poll', 'EBF-MIND').persistent, false);
  assert.deepEqual(parseProgress(profile.exportBytes()).completedPolls, ['1-efbd-poll']);
});
test('separate visitors merge completion idempotently through a download', () => {
  const left = new PollProfile(),
    right = new PollProfile();
  left.complete('1-efbd-poll');
  right.complete('2-efbd-poll');
  left.import(right.exportBytes());
  right.import(left.exportBytes());
  assert.deepEqual(left.exportObject(), right.exportObject());
});
test('first-run offer is persisted independently of gameplay state', () => {
  const storage = memory(),
    profile = new PollProfile({ storage });
  assert.equal(profile.snapshot().startupOffered, false);
  profile.offerStartup();
  assert.equal(new PollProfile({ storage }).snapshot().startupOffered, true);
});
test('native save bytes reach Core exactly, including duplicate-key refusal input', async () => {
  const source = new PollProfile(),
    destination = new PollProfile();
  source.complete('1-efbd-poll');
  const native = '{ "schema_version": 20, "revision": 1, "revision": 2 }\n';
  let observed;
  const result = await importGameProgress(withGameProgress(native, source), {
    profile: destination,
    restore: async (bytes) => {
      observed = bytes;
      return { ok: false, error_code: 'json.duplicate_key' };
    },
  });
  assert.equal(observed, native);
  assert.equal(result.ok, false);
  assert.deepEqual(destination.exportObject().completedPolls, []);
});
test('valid player-data wrapper restores then merges only poll completion', async () => {
  const profile = new PollProfile(),
    source = new PollProfile();
  source.complete('2-efbd-poll');
  const result = await importGameProgress(withGameProgress('{"schema_version":20}', source), {
    profile,
    restore: async () => ({ ok: true }),
  });
  assert.equal(result.ok, true);
  assert.equal(profile.hasCompleted('2-efbd-poll'), true);
});
test('a website file never invokes a native game restore', async () => {
  let restored = false;
  const profile = new PollProfile();
  const result = await importGameProgress(file(['1-efbd-poll']), {
    profile,
    restore: async () => {
      restored = true;
    },
  });
  assert.equal(result.progressOnly, true);
  assert.equal(restored, false);
});
test('legacy saves keep their original byte stream and unsupported wrappers fail', async () => {
  const native = '{"schema_version":20}\n';
  let observed;
  await importGameProgress(native, {
    profile: new PollProfile(),
    restore: async (bytes) => {
      observed = bytes;
      return { ok: true };
    },
  });
  assert.equal(observed, native);
  await assert.rejects(
    importGameProgress(JSON.stringify({ format: PLAYER_FORMAT, version: 2, save: native }), {
      profile: new PollProfile(),
      restore: async () => ({ ok: true }),
    }),
  );
});

test('an explicit clear in another tab cannot resurrect completed polls', () => {
  const storage = memory(),
    first = new PollProfile({ storage }),
    second = new PollProfile({ storage });
  first.complete('1-efbd-poll', 'EBF-MIND');
  second.reload();
  first.clear();
  second.observeExternal(null);
  second.complete('2-efbd-poll', 'EBF-SOCIAL');
  assert.deepEqual(new PollProfile({ storage }).exportObject().completedPolls, ['2-efbd-poll']);
});
test('the startup offer preserves polls recorded by another tab', () => {
  const storage = memory(),
    first = new PollProfile({ storage }),
    second = new PollProfile({ storage });
  first.complete('1-efbd-poll');
  second.offerStartup();
  assert.equal(new PollProfile({ storage }).hasCompleted('1-efbd-poll'), true);
});
