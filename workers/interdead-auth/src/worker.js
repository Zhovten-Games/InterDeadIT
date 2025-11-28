import { createIdentityCore, ProfileMetadata } from '@interdead/identity-core';
import {
  CloudflareScaleRepositoryAdapter,
  CloudflareTriggerLogAdapter,
  ConsoleLogger,
  InMemoryTriggerLogRepository,
  ScaleIngestionService,
  SystemClock,
  assertAxisCode,
} from '@interdead/efbd-scale';

const DISCORD_AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';

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

class D1TableAdapter {
  constructor(binding) {
    this.binding = binding;
  }

  async execute(query, params = []) {
    const statement = this.binding.prepare(query);
    const bound = params.length ? statement.bind(...params) : statement;
    const lowered = query.trim().toLowerCase();
    if (lowered.startsWith('select')) {
      return bound.all();
    }
    await bound.run();
    return { results: [] };
  }
}

class DiscordAuthController {
  constructor(env) {
    this.env = env;
  }

  isConfigured() {
    return Boolean(
      this.env.IDENTITY_DISCORD_CLIENT_ID &&
        this.env.IDENTITY_DISCORD_CLIENT_SECRET &&
        this.env.IDENTITY_DISCORD_REDIRECT_URI,
    );
  }

  buildAuthorizeUrl(stateToken) {
    const discordUrl = new URL(DISCORD_AUTHORIZE_URL);
    discordUrl.searchParams.set('client_id', this.env.IDENTITY_DISCORD_CLIENT_ID);
    discordUrl.searchParams.set('response_type', 'code');
    discordUrl.searchParams.set('scope', 'identify');
    discordUrl.searchParams.set('redirect_uri', this.env.IDENTITY_DISCORD_REDIRECT_URI);
    if (stateToken) {
      discordUrl.searchParams.set('state', stateToken);
    }
    return discordUrl.toString();
  }

  buildIdentity(cookies) {
    const sessionStore = new CookieSessionStore(
      this.env.IDENTITY_JWT_SECRET || this.env.IDENTITY_DISCORD_CLIENT_SECRET,
      cookies,
    );
    const cloudflareBindings = this.env.INTERDEAD_CORE
      ? { table: new D1TableAdapter(this.env.INTERDEAD_CORE), kv: this.env.IDENTITY_KV }
      : undefined;

    const identity = createIdentityCore({
      discord: this.isConfigured()
        ? {
            clientId: this.env.IDENTITY_DISCORD_CLIENT_ID,
            clientSecret: this.env.IDENTITY_DISCORD_CLIENT_SECRET,
            redirectUri: this.env.IDENTITY_DISCORD_REDIRECT_URI,
          }
        : undefined,
      cloudflare: cloudflareBindings,
      sessionStore,
      logger: console,
    });

    return { identity, sessionStore };
  }

  async buildStartRedirect(requestUrl, cookies) {
    if (!this.isConfigured()) {
      return new Response('Discord authentication is disabled', { status: 503 });
    }

    const { identity, sessionStore } = this.buildIdentity(cookies);
    const redirectTarget = requestUrl.searchParams.get('redirect') || '/';
    const existingSession = await sessionStore.readSession();
    const statePayload = {
      redirect: redirectTarget,
      profileId: existingSession?.profileId ?? crypto.randomUUID(),
      issuedAt: Date.now(),
    };

    await identity.linkService.beginDiscordLogin(sessionStore.stateKey, statePayload);
    const stateToken = sessionStore.getRaw(sessionStore.stateKey);
    if (!stateToken) {
      return new Response('Failed to issue OAuth state', { status: 500 });
    }
    const authorizeUrl = this.buildAuthorizeUrl(stateToken);
    const response = Response.redirect(authorizeUrl, 302);
    sessionStore.collectCookies().forEach((cookie) => {
      response.headers.append('Set-Cookie', cookie);
    });
    return response;
  }

  async handleCallback(url, cookies) {
    if (!this.isConfigured()) {
      return new Response('Discord authentication is disabled', { status: 503 });
    }

    const { identity, sessionStore } = this.buildIdentity(cookies);
    const code = url.searchParams.get('code');
    const stateToken = url.searchParams.get('state');
    if (!code || !stateToken) {
      return new Response('Missing OAuth parameters', { status: 400 });
    }

    const storedToken = sessionStore.getRaw(sessionStore.stateKey);
    if (!storedToken || !timingSafeEqual(storedToken, stateToken)) {
      return new Response('Invalid OAuth state', { status: 400 });
    }

    let state;
    try {
      state = await sessionStore.decodeToken(stateToken);
    } catch (error) {
      return new Response('Invalid OAuth state token', { status: 400 });
    }

    const profileId = state?.profileId || crypto.randomUUID();
    const metadata = new ProfileMetadata({
      profileId,
      displayName: state?.displayName || 'Discord traveler',
      avatarUrl: state?.avatarUrl,
    });

    let identityAggregate;
    try {
      identityAggregate = await identity.linkService.completeDiscordLogin(profileId, code, metadata);
    } catch (error) {
      return new Response('Failed to complete Discord login', { status: 502 });
    }

    await sessionStore.delete(sessionStore.stateKey);
    await sessionStore.issueSession(identityAggregate.state.metadata);

    const redirectTo = state.redirect || '/';
    const response = Response.redirect(redirectTo, 302);
    sessionStore.collectCookies().forEach((cookie) => {
      response.headers.append('Set-Cookie', cookie);
    });
    return response;
  }
}

class EfbdController {
  constructor(env) {
    this.env = env;
  }

  async handleTrigger(request) {
    const trigger = await request.json().catch(() => null);
    const axisCandidate = trigger?.axisCode || trigger?.axis;
    if (!axisCandidate) {
      return new Response('Invalid trigger', { status: 400 });
    }

    let axisCode;
    try {
      axisCode = assertAxisCode(String(axisCandidate));
    } catch (error) {
      return new Response('Unknown axis code', { status: 400 });
    }

    const increment = this.normalizeIncrement(trigger?.value);
    if (increment === null) {
      return new Response('Invalid trigger score', { status: 400 });
    }

    const ingestion = this.buildIngestionService(increment);
    if (!ingestion) {
      return new Response('EFBD scale persistence unavailable', { status: 503 });
    }

    try {
      await ingestion.recordTriggers({
        profileId: this.resolveProfileId(trigger),
        triggers: [
          {
            axis: axisCode,
            source: trigger?.source || 'interdead-it',
            metadata: trigger?.metadata,
          },
        ],
      });
    } catch (error) {
      return new Response('Failed to persist trigger', { status: 502 });
    }

    return new Response(null, { status: 204 });
  }

  buildIngestionService(increment) {
    const repository = this.buildScaleRepository();
    if (!repository) {
      return null;
    }
    const triggerLogRepository = this.buildTriggerLogRepository();
    const clock = new SystemClock();
    const logger = new ConsoleLogger();
    return new ScaleIngestionService(repository, triggerLogRepository, clock, logger, {
      maxIncrementPerEvent: increment,
    });
  }

  buildScaleRepository() {
    if (!this.env.INTERDEAD_CORE) {
      return null;
    }
    return new CloudflareScaleRepositoryAdapter(this.env.INTERDEAD_CORE);
  }

  buildTriggerLogRepository() {
    if (this.env.IDENTITY_KV) {
      return new CloudflareTriggerLogAdapter(this.env.IDENTITY_KV, 'efbd-trigger-log');
    }
    return new InMemoryTriggerLogRepository();
  }

  normalizeIncrement(rawValue) {
    const value = rawValue ?? 1;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return null;
    }
    return Math.min(Math.floor(numeric), 100);
  }

  resolveProfileId(trigger) {
    return trigger?.profileId || trigger?.profile_id || 'anonymous';
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cookies = parseCookies(request.headers.get('Cookie'));
    const authController = new DiscordAuthController(env);
    const efbdController = new EfbdController(env);

    if (request.method === 'GET' && url.pathname === '/auth/discord/start') {
      return authController.buildStartRedirect(url, cookies);
    }

    if (request.method === 'GET' && url.pathname === '/auth/discord/callback') {
      return authController.handleCallback(url, cookies);
    }

    if (request.method === 'POST' && url.pathname === '/efbd/trigger') {
      return efbdController.handleTrigger(request);
    }

    return new Response('Not found', { status: 404 });
  },
};

function base64UrlEncode(value) {
  return btoa(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlEncodeBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64UrlEncode(binary);
}

function base64UrlDecode(encoded) {
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  return atob(padded);
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

function parseCookies(cookieHeader) {
  const cookies = new Map();
  if (!cookieHeader) {
    return cookies;
  }
  const pairs = cookieHeader.split(';');
  pairs.forEach((pair) => {
    const [name, ...rest] = pair.trim().split('=');
    cookies.set(name, rest.join('='));
  });
  return cookies;
}
