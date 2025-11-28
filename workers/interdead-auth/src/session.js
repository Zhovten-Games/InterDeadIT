const BASE64_TEXT_ENCODER = new TextEncoder();
const BASE64_TEXT_DECODER = new TextDecoder();
const BASE64_BTOA = typeof btoa === 'function'
  ? btoa
  : (input) => Buffer.from(input, 'binary').toString('base64');
const BASE64_ATOB = typeof atob === 'function'
  ? atob
  : (input) => Buffer.from(input, 'base64').toString('binary');

class CryptoService {
  constructor(secret) {
    this.secret = secret;
    this.encoder = new TextEncoder();
  }

  async sign(value) {
    if (!this.secret) {
      return null;
    }
    const key = await crypto.subtle.importKey(
      'raw',
      this.encoder.encode(this.secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', key, this.encoder.encode(value));
    return base64UrlEncodeBuffer(signature);
  }
}

class CookieSessionStore {
  constructor(secret, cookies, options = {}) {
    this.crypto = new CryptoService(secret);
    this.cookies = new Map(cookies);
    this.pendingCookies = [];
    this.stateKey = 'discord_oauth_state';
    this.sessionKey = 'interdead_session';
    this.stateTtlSeconds = options.stateTtlSeconds ?? 600;
    this.sessionTtlSeconds = options.sessionTtlSeconds ?? 60 * 60 * 24 * 30;
  }

  async set(key, value) {
    await this.storeAndEncode(key, value, this.stateTtlSeconds);
  }

  async get(key) {
    const raw = this.cookies.get(key);
    if (!raw) {
      return undefined;
    }
    return this.decode(raw).catch(() => undefined);
  }

  async delete(key) {
    this.cookies.delete(key);
    this.pendingCookies.push(this.buildCookie(key, 'deleted', 0));
  }

  async storeAndEncode(key, value, ttlSeconds) {
    const encoded = await this.encode(value);
    this.cookies.set(key, encoded);
    this.pendingCookies.push(this.buildCookie(key, encoded, ttlSeconds));
    return encoded;
  }

  async decode(token) {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) {
      throw new Error('Invalid token format');
    }
    const expected = await this.crypto.sign(encoded);
    if (!expected || !timingSafeEqual(expected, signature)) {
      throw new Error('Token signature mismatch');
    }
    const decoded = base64UrlDecode(encoded);
    try {
      return JSON.parse(decoded);
    } catch (error) {
      return decoded;
    }
  }

  getRaw(key) {
    return this.cookies.get(key);
  }

  async decodeToken(token) {
    return this.decode(token);
  }

  async readSession() {
    const raw = this.cookies.get(this.sessionKey);
    if (!raw) {
      return undefined;
    }
    return this.decode(raw).catch(() => undefined);
  }

  async issueSession(profile) {
    return this.storeAndEncode(
      this.sessionKey,
      {
        profileId: profile.profileId,
        displayName: profile.displayName,
        issuedAt: Date.now(),
      },
      this.sessionTtlSeconds,
    );
  }

  collectCookies() {
    return [...this.pendingCookies];
  }

  buildCookie(name, value, maxAge) {
    return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
  }

  async encode(value) {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const encoded = base64UrlEncode(serialized);
    const signature = await this.crypto.sign(encoded);
    if (!signature) {
      throw new Error('Session signing key is missing');
    }
    return `${encoded}.${signature}`;
  }
}

function base64UrlEncode(value) {
  const bytes = BASE64_TEXT_ENCODER.encode(value);
  return base64UrlEncodeBuffer(bytes);
}

function base64UrlEncodeBuffer(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return BASE64_BTOA(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(encoded) {
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = BASE64_ATOB(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return BASE64_TEXT_DECODER.decode(bytes);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export { CookieSessionStore, timingSafeEqual };
