// SPDX-License-Identifier: MIT
// Source: InterDeadReferenceLibrary/tools/shared/poll-progress.mjs.
export const FORMAT = 'interdead.poll-progress';
export const VERSION = 1;
export const STORAGE_KEY = 'interdead.poll-profile.v1';
// A player-data wrapper carries an exact native save string (native limit: 16 MiB).
export const MAX_BYTES = 34 * 1024 * 1024;
export const PLAYER_FORMAT = 'interdead.player-data';
export const AXES = Object.freeze([
  'EBF-SOCIAL',
  'EBF-MIND',
  'EBF-DECLINE',
  'EBF-EXPOSURE',
  'EBF-ABANDON',
]);
export const POLLS = Object.freeze({
  '1-efbd-poll': AXES,
  '2-efbd-poll': Object.freeze(['EBF-MIND', 'EBF-SOCIAL', 'EBF-ABANDON']),
});
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const error = (code) => Object.assign(new Error(code), { code });
const empty = () => ({
  storageVersion: VERSION,
  completedPolls: [],
  answers: {},
  startupOffered: false,
});
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
function completed(value) {
  if (
    !Array.isArray(value) ||
    value.length > Object.keys(POLLS).length ||
    value.some((id) => typeof id !== 'string' || !own(POLLS, id)) ||
    new Set(value).size !== value.length
  ) {
    throw error('progress.polls');
  }
  return [...value].sort();
}
function parseJson(input) {
  let value;
  try {
    value = JSON.parse(input);
  } catch {
    throw error('progress.json');
  }
  const stack = [];
  for (const match of input.matchAll(/"(?:[^"\\]|\\.)*"|[{}\[\]:,]/gs)) {
    const token = match[0],
      parent = stack.at(-1);
    if (token === '{') stack.push({ keys: new Set(), key: true });
    else if (token === '[') stack.push({ array: true });
    else if (token === '}' || token === ']') stack.pop();
    else if (token === ',' && parent && !parent.array) parent.key = true;
    else if (token === ':' && parent && !parent.array) parent.key = false;
    else if (token.startsWith('"') && parent?.key) {
      const key = JSON.parse(token);
      if (parent.keys.has(key)) throw error('progress.duplicate_key');
      parent.keys.add(key);
      parent.key = false;
    }
  }
  return value;
}
export function parseProgress(input) {
  let document = input;
  if (typeof input === 'string') {
    if (new TextEncoder().encode(input).length > MAX_BYTES) throw error('progress.size');
    document = parseJson(input);
  }
  if (!isRecord(document)) throw error('progress.shape');
  const value = document.format === FORMAT ? document : document.interdead_poll_progress;
  if (!isRecord(value) || value.format !== FORMAT || value.version !== VERSION)
    throw error('progress.version');
  return { format: FORMAT, version: VERSION, completedPolls: completed(value.completedPolls) };
}
function stored(input) {
  const value = parseJson(input);
  if (
    !isRecord(value) ||
    value.storageVersion !== VERSION ||
    !isRecord(value.answers) ||
    typeof value.startupOffered !== 'boolean'
  )
    throw error('progress.storage');
  const ids = completed(value.completedPolls),
    answers = {};
  for (const [id, axis] of Object.entries(value.answers)) {
    if (!own(POLLS, id) || !POLLS[id].includes(axis) || !ids.includes(id))
      throw error('progress.storage');
    answers[id] = axis;
  }
  return {
    storageVersion: VERSION,
    completedPolls: ids,
    answers,
    startupOffered: value.startupOffered,
  };
}
export class PollProfile {
  constructor({ storage = null, onChange = () => {} } = {}) {
    this.storage = storage;
    this.onChange = onChange;
    this.value = empty();
    this.persistence = storage ? 'persistent' : 'temporary';
    this.reload();
  }
  reload() {
    if (!this.storage || this.persistence === 'corrupt') return this.snapshot();
    try {
      const bytes = this.storage.getItem(STORAGE_KEY);
      if (bytes !== null) {
        let read;
        try {
          read = stored(bytes);
        } catch {
          this.persistence = 'corrupt';
          return this.snapshot();
        }
        this.value.completedPolls = [
          ...new Set([...this.value.completedPolls, ...read.completedPolls]),
        ].sort();
        this.value.answers = { ...read.answers, ...this.value.answers };
        this.value.startupOffered ||= read.startupOffered;
      }
    } catch {
      this.persistence = 'temporary';
    }
    return this.snapshot();
  }
  observeExternal(bytes) {
    if (bytes === null) {
      this.value = empty();
      this.persistence = this.storage ? 'persistent' : 'temporary';
    } else this.reload();
    this.notify();
  }
  snapshot() {
    return { ...structuredClone(this.value), persistence: this.persistence };
  }
  notify() {
    this.onChange(this.snapshot());
  }
  persist() {
    if (this.persistence !== 'corrupt' && this.storage) {
      try {
        this.storage.setItem(STORAGE_KEY, JSON.stringify(this.value));
        this.persistence = 'persistent';
      } catch {
        this.persistence = 'temporary';
      }
    }
    this.notify();
  }
  hasCompleted(id) {
    this.reload();
    return this.value.completedPolls.includes(id);
  }
  complete(id, axis) {
    this.reload();
    if (!own(POLLS, id) || (axis !== undefined && !POLLS[id].includes(axis)))
      throw error('progress.answer');
    if (this.value.completedPolls.includes(id))
      return { status: 'error', code: 'replay_blocked', reason: 'completed' };
    this.value.completedPolls.push(id);
    this.value.completedPolls.sort();
    if (axis !== undefined) this.value.answers[id] = axis;
    this.persist();
    return { status: 'ok', persistent: this.persistence === 'persistent' };
  }
  import(input) {
    const value = parseProgress(input); // Validate completely before changing local data.
    this.reload();
    const added = value.completedPolls.filter(
      (id) => !this.value.completedPolls.includes(id),
    ).length;
    this.value.completedPolls = [
      ...new Set([...this.value.completedPolls, ...value.completedPolls]),
    ].sort();
    this.persist();
    return { status: 'ok', added, persistent: this.persistence === 'persistent' };
  }
  exportObject() {
    this.reload();
    return { format: FORMAT, version: VERSION, completedPolls: [...this.value.completedPolls] };
  }
  exportBytes() {
    return JSON.stringify(this.exportObject(), null, 2) + '\n';
  }
  offerStartup() {
    this.reload();
    this.value.startupOffered = true;
    this.persist();
  }
  summary() {
    this.reload();
    return {
      axes: AXES.map((code) => ({
        code,
        value: Object.values(this.value.answers).filter((axis) => axis === code).length,
        lastTriggerSource: 'local',
      })),
    };
  }
  clear() {
    // This is an explicit visitor action; corrupt bytes are preserved until this action.
    try {
      this.storage?.removeItem(STORAGE_KEY);
      this.persistence = this.storage ? 'persistent' : 'temporary';
    } catch {
      this.persistence = 'temporary';
      throw error('progress.clear');
    }
    this.value = empty();
    this.notify();
  }
}
export function browserStorage(windowRef = globalThis.window) {
  try {
    return windowRef?.localStorage ?? null;
  } catch {
    return null;
  }
}
export function withGameProgress(nativeBytes, profile) {
  if (
    typeof nativeBytes !== 'string' ||
    new TextEncoder().encode(nativeBytes).length > 16 * 1024 * 1024
  )
    throw error('progress.size');
  return (
    JSON.stringify({
      format: PLAYER_FORMAT,
      version: VERSION,
      save: nativeBytes,
      interdead_poll_progress: profile.exportObject(),
    }) + '\n'
  );
}
export async function importGameProgress(bytes, { profile, restore }) {
  if (typeof bytes !== 'string' || new TextEncoder().encode(bytes).length > MAX_BYTES)
    throw error('progress.size');
  const value = parseJson(bytes);
  if (value?.format === FORMAT) {
    profile.import(value);
    return { ok: true, progressOnly: true };
  }
  if (value?.format !== PLAYER_FORMAT) return restore(bytes);
  if (
    value.version !== VERSION ||
    typeof value.save !== 'string' ||
    new TextEncoder().encode(value.save).length > 16 * 1024 * 1024
  )
    throw error('progress.version');
  const progress = parseProgress(value);
  // Keep the exact native bytes: Core still rejects duplicate keys and unknown fields.
  const result = await restore(value.save);
  if (result.ok) profile.import(progress);
  return result;
}
