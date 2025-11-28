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
import { CookieSessionStore, timingSafeEqual } from './session.js';

const DISCORD_AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';

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

    const profile =
      identityAggregate?.state?.metadata ? identityAggregate.state.metadata : metadata;

    try {
      await sessionStore.issueSession(profile);
    } catch (error) {
      console.error('Failed to issue session', error);
      return new Response('Failed to complete Discord login (session)', { status: 500 });
    }

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
    try {
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
    } catch (error) {
      console.error('Unhandled worker error', error);
      return new Response('Internal server error', { status: 500 });
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
