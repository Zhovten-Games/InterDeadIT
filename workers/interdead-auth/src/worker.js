import { createIdentityCore, ProfileMetadata } from '@interdead/identity-core';
import {
  CloudflareScaleRepositoryAdapter,
  CloudflareTriggerLogAdapter,
  ConsoleLogger,
  InMemoryTriggerLogRepository,
  ScaleIngestionService,
  ScaleQueryService,
  SystemClock,
  assertAxisCode,
} from '@interdead/efbd-scale';
import { CookieSessionStore, timingSafeEqual } from './session.js';

const DISCORD_AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
const DEFAULT_SITE_BASE_URL = 'https://interdead.phantom-draft.com';
const DEFAULT_ALLOWED_ORIGINS = [DEFAULT_SITE_BASE_URL];

class CorsService {
  constructor(env) {
    this.allowedOrigins = this.buildAllowedOrigins(env);
  }

  buildAllowedOrigins(env) {
    const configuredOrigins = [env.INTERDEAD_SITE_BASE_URL, env.INTERDEAD_ALLOWED_ORIGINS]
      .filter(Boolean)
      .flatMap((origin) => origin.split(',').map((value) => value.trim()))
      .filter(Boolean);

    const normalized = [...configuredOrigins, ...DEFAULT_ALLOWED_ORIGINS]
      .map((value) => this.normalizeOrigin(value))
      .filter(Boolean);

    return new Set(normalized);
  }

  normalizeOrigin(value) {
    try {
      return new URL(value).origin;
    } catch (error) {
      console.warn('Invalid CORS origin ignored', { value, error });
      return null;
    }
  }

  resolveOrigin(request) {
    const requestOrigin = request.headers.get('Origin');
    if (!requestOrigin) {
      return null;
    }
    if (this.allowedOrigins.has(requestOrigin)) {
      return requestOrigin;
    }
    return null;
  }

  apply(request, response) {
    const origin = this.resolveOrigin(request);
    if (!origin) {
      return response;
    }

    const headers = new Headers(response.headers);
    this.applyCorsHeaders(headers, origin);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  applyCorsHeaders(headers, origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.append('Vary', 'Origin');
  }

  buildPreflightResponse(request) {
    const origin = this.resolveOrigin(request);
    if (!origin) {
      return null;
    }

    const headers = new Headers();
    this.applyCorsHeaders(headers, origin);
    headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    headers.set(
      'Access-Control-Allow-Headers',
      request.headers.get('Access-Control-Request-Headers') || 'Content-Type',
    );
    headers.set('Access-Control-Max-Age', '86400');
    return new Response(null, { status: 204, headers });
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

  getSiteBaseUrl() {
    return resolveSiteBaseUrl(this.env);
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
    const response = new Response(null, {
      status: 302,
      headers: {
        Location: authorizeUrl,
      },
    });
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
      identityAggregate = await identity.linkService.completeDiscordLogin(
        profileId,
        code,
        metadata,
      );
    } catch (error) {
      return new Response('Failed to complete Discord login', { status: 502 });
    }

    await sessionStore.delete(sessionStore.stateKey);

    const profile = identityAggregate?.state?.metadata
      ? identityAggregate.state.metadata
      : metadata;
    const discordLink = identityAggregate?.state?.discordLink;

    try {
      await sessionStore.issueSession({
        profileId: profile.profileId,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl || discordLink?.avatarUrl,
        username: discordLink?.username,
      });
    } catch (error) {
      console.error('Failed to issue session', error);
      return new Response('Failed to complete Discord login (session)', { status: 500 });
    }

    const rawRedirect =
      state && typeof state.redirect === 'string' && state.redirect.trim()
        ? state.redirect.trim()
        : '/';

    const siteBaseUrl = this.getSiteBaseUrl().replace(/\/+$/, '');
    let redirectLocation;

    if (/^https?:\/\//i.test(rawRedirect)) {
      redirectLocation = rawRedirect;
    } else if (rawRedirect.startsWith('/')) {
      redirectLocation = `${siteBaseUrl}${rawRedirect}`;
    } else {
      redirectLocation = `${siteBaseUrl}/${rawRedirect}`;
    }

    const response = new Response(null, {
      status: 302,
      headers: {
        Location: redirectLocation,
      },
    });
    sessionStore.collectCookies().forEach((cookie) => {
      response.headers.append('Set-Cookie', cookie);
    });
    return response;
  }

  async handleSessionStatus(cookies) {
    const { sessionStore } = this.buildIdentity(cookies);
    const session = await sessionStore.readSession({ refresh: true });
    if (!session) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    const response = new Response(
      JSON.stringify({
        authenticated: true,
        profileId: session.profileId,
        displayName: session.displayName,
        avatarUrl: session.avatarUrl,
        username: session.username,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      },
    );
    sessionStore.collectCookies().forEach((cookie) => {
      response.headers.append('Set-Cookie', cookie);
    });
    return response;
  }
}

function resolveSiteBaseUrl(env) {
  const candidate = env.INTERDEAD_SITE_BASE_URL?.trim();
  if (!candidate) {
    return DEFAULT_SITE_BASE_URL;
  }

  try {
    const resolved = new URL(candidate, DEFAULT_SITE_BASE_URL);
    return resolved.toString();
  } catch (error) {
    console.warn('Falling back to default site base URL', { candidate, error });
    return DEFAULT_SITE_BASE_URL;
  }
}

class EfbdController {
  constructor(env) {
    this.env = env;
  }

  async handleTrigger(request, cookies = new Map()) {
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

    const { sessionStore, session } = await this.readSession(cookies);

    const ingestion = this.buildIngestionService(increment);
    if (!ingestion) {
      return new Response('EFBD scale persistence unavailable', { status: 503 });
    }

    try {
      await ingestion.recordTriggers({
        profileId: this.resolveProfileId(trigger, session?.profileId),
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

    const response = new Response(null, { status: 204 });
    this.appendSessionCookies(response, sessionStore);
    return response;
  }

  async handleSummary(cookies = new Map()) {
    const { sessionStore, session } = await this.readSession(cookies);
    if (!session?.profileId) {
      return this.buildJsonResponse(
        { authenticated: false, reason: 'unauthorized' },
        401,
        sessionStore,
      );
    }

    const queryService = this.buildQueryService();
    if (!queryService) {
      return this.buildJsonResponse({ error: 'EFBD repository unavailable' }, 503, sessionStore);
    }

    let snapshot;
    try {
      snapshot = await queryService.fetchSnapshot(session.profileId);
    } catch (error) {
      console.error('Failed to query EFBD snapshot', error);
      return this.buildJsonResponse({ error: 'Failed to fetch EFBD snapshot' }, 502, sessionStore);
    }

    const payload = this.serializeSnapshot(snapshot);
    return this.buildJsonResponse(
      { authenticated: true, profileId: snapshot.profileId, ...payload },
      200,
      sessionStore,
    );
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

  buildQueryService() {
    const repository = this.buildScaleRepository();
    if (!repository) {
      return null;
    }
    const clock = new SystemClock();
    return new ScaleQueryService(repository, clock);
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

  resolveProfileId(trigger, sessionProfileId) {
    if (sessionProfileId) {
      return sessionProfileId;
    }
    return trigger?.profileId || trigger?.profile_id || 'anonymous';
  }

  buildSessionStore(cookies) {
    const secret = this.env.IDENTITY_JWT_SECRET || this.env.IDENTITY_DISCORD_CLIENT_SECRET;
    if (!secret) {
      return null;
    }
    return new CookieSessionStore(secret, cookies);
  }

  async readSession(cookies) {
    const sessionStore = this.buildSessionStore(cookies);
    if (!sessionStore) {
      return { sessionStore: null, session: null };
    }
    const session = await sessionStore.readSession({ refresh: true });
    return { sessionStore, session };
  }

  appendSessionCookies(response, sessionStore) {
    if (!sessionStore) {
      return;
    }
    sessionStore.collectCookies().forEach((cookie) => {
      response.headers.append('Set-Cookie', cookie);
    });
  }

  buildJsonResponse(body, status, sessionStore) {
    const response = new Response(JSON.stringify(body ?? {}), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
    this.appendSessionCookies(response, sessionStore);
    return response;
  }

  serializeSnapshot(snapshot) {
    const axes = Array.from(snapshot.axisScores.values()).map((axis) => ({
      code: axis.axis,
      value: axis.value,
      lastUpdated: axis.lastUpdated?.toISOString?.() ?? null,
      lastTriggerSource: axis.lastTriggerSource || null,
    }));

    return {
      updatedAt: snapshot.updatedAt?.toISOString?.() ?? null,
      axes,
    };
  }
}

export default {
  async fetch(request, env) {
    const cors = new CorsService(env);

    try {
      const url = new URL(request.url);
      const cookies = parseCookies(request.headers.get('Cookie'));
      const authController = new DiscordAuthController(env);
      const efbdController = new EfbdController(env);

      if (request.method === 'OPTIONS') {
        const preflight = cors.buildPreflightResponse(request);
        if (preflight) {
          return preflight;
        }
        return new Response(null, { status: 204 });
      }

      if (request.method === 'GET' && url.pathname === '/auth/discord/start') {
        const response = await authController.buildStartRedirect(url, cookies);
        return cors.apply(request, response);
      }

      if (request.method === 'GET' && url.pathname === '/auth/discord/callback') {
        const response = await authController.handleCallback(url, cookies);
        return cors.apply(request, response);
      }

      if (request.method === 'GET' && url.pathname === '/auth/session') {
        const response = await authController.handleSessionStatus(cookies);
        return cors.apply(request, response);
      }

      if (request.method === 'POST' && url.pathname === '/efbd/trigger') {
        const response = await efbdController.handleTrigger(request, cookies);
        return cors.apply(request, response);
      }

      if (request.method === 'GET' && url.pathname === '/efbd/summary') {
        const response = await efbdController.handleSummary(cookies);
        return cors.apply(request, response);
      }

      return cors.apply(request, new Response('Not found', { status: 404 }));
    } catch (error) {
      console.error('Unhandled worker error', error);
      return cors.apply(request, new Response('Internal server error', { status: 500 }));
    }
  },
};

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
