const DISCORD_AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_USER_URL = 'https://discord.com/api/users/@me';

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

class StateService {
  constructor(secret) {
    this.crypto = new CryptoService(secret);
    this.cookieName = 'discord_oauth_state';
  }

  async issueState(payload) {
    const statePayload = {
      ...payload,
      nonce: crypto.randomUUID(),
      issuedAt: Date.now(),
    };
    const encoded = base64UrlEncode(JSON.stringify(statePayload));
    const signature = await this.crypto.sign(encoded);
    if (!signature) {
      throw new Error('Discord state signing key is missing');
    }
    return `${encoded}.${signature}`;
  }

  async verifyState(stateToken, cookieValue) {
    if (!stateToken) {
      return null;
    }
    const [encoded, signature] = stateToken.split('.');
    if (!encoded || !signature) {
      return null;
    }
    const expectedSignature = await this.crypto.sign(encoded);
    if (!expectedSignature || !timingSafeEqual(expectedSignature, signature)) {
      return null;
    }
    if (cookieValue && !timingSafeEqual(cookieValue, stateToken)) {
      return null;
    }
    const decoded = base64UrlDecode(encoded);
    return JSON.parse(decoded);
  }

  buildCookie(value) {
    return `${this.cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
  }

  clearCookie() {
    return `${this.cookieName}=deleted; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
  }
}

class SessionService {
  constructor(secret) {
    this.crypto = new CryptoService(secret);
    this.cookieName = 'interdead_session';
  }

  async issueSession(payload, ttlSeconds = 60 * 60 * 24 * 30) {
    const basePayload = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    };
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64UrlEncode(JSON.stringify(basePayload));
    const unsigned = `${header}.${body}`;
    const signature = await this.crypto.sign(unsigned);
    if (!signature) {
      return `session-${payload.profileId || 'anonymous'}`;
    }
    return `${unsigned}.${signature}`;
  }

  buildCookie(value) {
    return `${this.cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
  }
}

class DiscordApiClient {
  constructor(env) {
    this.clientId = env.IDENTITY_DISCORD_CLIENT_ID;
    this.clientSecret = env.IDENTITY_DISCORD_CLIENT_SECRET;
    this.redirectUri = env.IDENTITY_DISCORD_REDIRECT_URI;
  }

  isConfigured() {
    return Boolean(this.clientId && this.clientSecret && this.redirectUri);
  }

  buildAuthorizeUrl(stateToken) {
    const discordUrl = new URL(DISCORD_AUTHORIZE_URL);
    discordUrl.searchParams.set('client_id', this.clientId);
    discordUrl.searchParams.set('response_type', 'code');
    discordUrl.searchParams.set('scope', 'identify');
    discordUrl.searchParams.set('redirect_uri', this.redirectUri);
    if (stateToken) {
      discordUrl.searchParams.set('state', stateToken);
    }
    return discordUrl.toString();
  }

  async exchangeCode(code) {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
    });

    const response = await fetch(DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      return null;
    }

    const token = await response.json();
    return token?.access_token ? token.access_token : null;
  }

  async fetchUser(accessToken) {
    const response = await fetch(DISCORD_USER_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      return null;
    }
    return response.json();
  }
}

class ProfileRepository {
  constructor(database) {
    this.database = database;
  }

  async saveDiscordProfile(discordUser) {
    if (!this.database || !discordUser?.id) {
      return null;
    }
    const payload = {
      discordId: discordUser.id,
      username: discordUser.username,
      globalName: discordUser.global_name,
      avatar: discordUser.avatar,
      linkedAt: new Date().toISOString(),
    };

    await this.database.prepare(
      'INSERT INTO profiles (profile_id, data) VALUES (?1, ?2) ON CONFLICT(profile_id) DO UPDATE SET data=?2',
    )
      .bind(discordUser.id, JSON.stringify(payload))
      .run();

    return { profileId: discordUser.id, username: discordUser.username, globalName: discordUser.global_name };
  }
}

class DiscordAuthController {
  constructor(env) {
    this.env = env;
    this.discordApi = new DiscordApiClient(env);
    this.stateService = new StateService(env.IDENTITY_JWT_SECRET || env.IDENTITY_DISCORD_CLIENT_SECRET);
    this.sessionService = new SessionService(env.IDENTITY_JWT_SECRET || env.IDENTITY_DISCORD_CLIENT_SECRET);
    this.repository = new ProfileRepository(env.INTERDEAD_CORE);
  }

  async buildStartRedirect(requestUrl) {
    if (!this.discordApi.isConfigured()) {
      return new Response('Discord authentication is disabled', { status: 503 });
    }

    const redirectTarget = requestUrl.searchParams.get('redirect') || '/';
    const stateToken = await this.stateService.issueState({ redirect: redirectTarget });
    const authorizeUrl = this.discordApi.buildAuthorizeUrl(stateToken);
    const response = Response.redirect(authorizeUrl, 302);
    response.headers.append('Set-Cookie', this.stateService.buildCookie(stateToken));
    return response;
  }

  async handleCallback(url, cookies) {
    if (!this.discordApi.isConfigured()) {
      return new Response('Discord authentication is disabled', { status: 503 });
    }

    const code = url.searchParams.get('code');
    const stateToken = url.searchParams.get('state');
    if (!code || !stateToken) {
      return new Response('Missing OAuth parameters', { status: 400 });
    }

    const state = await this.stateService.verifyState(stateToken, cookies.get(this.stateService.cookieName));
    if (!state) {
      return new Response('Invalid OAuth state', { status: 400 });
    }

    const accessToken = await this.discordApi.exchangeCode(code);
    if (!accessToken) {
      return new Response('Failed to exchange Discord code', { status: 502 });
    }

    const user = await this.discordApi.fetchUser(accessToken);
    if (!user) {
      return new Response('Failed to fetch Discord profile', { status: 502 });
    }

    const profile = await this.repository.saveDiscordProfile(user);
    const sessionToken = await this.sessionService.issueSession({
      profileId: profile?.profileId,
      discordId: user.id,
      username: user.username,
      globalName: user.global_name,
    });

    const redirectTo = state.redirect || '/';
    const response = Response.redirect(redirectTo, 302);
    response.headers.append('Set-Cookie', this.sessionService.buildCookie(sessionToken));
    response.headers.append('Set-Cookie', this.stateService.clearCookie());
    return response;
  }
}

class EfbdController {
  constructor(env) {
    this.env = env;
  }

  async handleTrigger(request) {
    const trigger = await request.json().catch(() => null);
    if (!trigger?.axis && !trigger?.axisCode) {
      return new Response('Invalid trigger', { status: 400 });
    }
    await this.persistTrigger(trigger);
    return new Response(null, { status: 204 });
  }

  async persistTrigger(trigger) {
    const db = this.env.INTERDEAD_CORE;
    if (!db) {
      return;
    }
    const profileId = trigger.profileId || trigger.profile_id || 'anonymous';
    const axisCode = trigger.axisCode || trigger.axis;
    const score = Number.isFinite(trigger.value) ? trigger.value : 0;
    const triggerSource = trigger.source || 'interdead-it';

    await db.prepare(
      'INSERT INTO efbd_scale (profile_id, axis_code, score, trigger_source, updated_at) VALUES (?1, ?2, ?3, ?4, datetime("now")) ' +
      'ON CONFLICT(profile_id, axis_code) DO UPDATE SET score=excluded.score, trigger_source=excluded.trigger_source, updated_at=excluded.updated_at',
    )
      .bind(profileId, axisCode, score, triggerSource)
      .run();
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cookies = parseCookies(request.headers.get('Cookie'));
    const authController = new DiscordAuthController(env);
    const efbdController = new EfbdController(env);

    if (request.method === 'GET' && url.pathname === '/auth/discord/start') {
      return authController.buildStartRedirect(url);
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
