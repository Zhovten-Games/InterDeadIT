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
import { DiscordOAuthAdapter } from '@interdead/identity-core';
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

class ProfileGuardRepository {
  constructor(tableAdapter, clock = () => new Date()) {
    this.tableAdapter = tableAdapter;
    this.clock = clock;
  }

  async findByProfileId(profileId) {
    if (!profileId) return null;
    const row = await this.fetchProfileRow(profileId);
    return this.deserializeGuardRow(row);
  }

  async findByDiscordId(discordId) {
    if (!discordId) return null;
    const result = await this.tableAdapter.execute(
      `SELECT profile_id, data, last_cleanup_at, last_cleanup_timezone, delete_count
       FROM profiles
       WHERE json_extract(data, '$.discordLink.discordId') = ?
       LIMIT 1`,
      [discordId],
    );
    return this.deserializeGuardRow(result?.results?.[0]);
  }

  async upsertProfile({ profileId, discordId, displayName, avatarUrl }) {
    if (!profileId) return;
    const current = await this.fetchProfileRow(profileId);
    const payload = this.mergeProfileData(current?.data, {
      profileId,
      discordId,
      displayName,
      avatarUrl,
      completedGames: this.deserializeGuardRow(current)?.completedGames ?? [],
    });
    await this.persistProfile({
      profileId,
      data: payload,
      lastCleanupAt: current?.last_cleanup_at ?? null,
      timezone: current?.last_cleanup_timezone ?? null,
      deleteCount: current?.delete_count ?? 0,
    });
  }

  async recordCleanup({ profileId, timezone, discordId, displayName, avatarUrl, completedGames }) {
    if (!profileId) return null;
    const now = this.clock();
    const isoTimestamp =
      typeof now?.toISOString === 'function' ? now.toISOString() : new Date().toISOString();
    const current = (await this.fetchProfileRow(profileId)) || {};
    const nextDeleteCount = Number(current.delete_count ?? 0) + 1;
    const mergedData = this.mergeProfileData(current?.data, {
      profileId,
      completedGames:
        completedGames ?? this.deserializeGuardRow(current)?.completedGames ?? [],
      discordId,
      displayName,
      avatarUrl,
    });
    await this.persistProfile({
      profileId,
      data: mergedData,
      lastCleanupAt: isoTimestamp,
      timezone: timezone || current.last_cleanup_timezone || 'UTC',
      deleteCount: nextDeleteCount,
    });
    const persisted = await this.fetchProfileRow(profileId);
    return this.deserializeGuardRow(persisted) || {
      profileId,
      lastCleanupAt: isoTimestamp,
      timezone: timezone || current.last_cleanup_timezone || 'UTC',
      deleteCount: nextDeleteCount,
      completedGames: completedGames ?? [],
      discordId,
    };
  }

  async resetCleanupWindow(profileId) {
    if (!profileId) return;
    await this.tableAdapter.execute(
      `UPDATE profiles SET delete_count = 0, last_cleanup_at = NULL, last_cleanup_timezone = NULL WHERE profile_id = ?`,
      [profileId],
    );
  }

  async markCompleted(profileId, gameId) {
    if (!profileId || !gameId) return;
    const current = (await this.fetchProfileRow(profileId)) || {};
    const existing = this.deserializeGuardRow(current) || {};
    const completed = new Set(existing.completedGames || []);
    completed.add(gameId);
    const mergedData = this.mergeProfileData(current?.data, {
      profileId,
      completedGames: Array.from(completed),
      discordId: existing.discordId,
    });
    await this.persistProfile({
      profileId,
      data: mergedData,
      lastCleanupAt: current.last_cleanup_at ?? null,
      timezone: current.last_cleanup_timezone ?? null,
      deleteCount: current.delete_count ?? 0,
    });
  }

  async clearCompleted(profileId) {
    if (!profileId) return;
    const current = (await this.fetchProfileRow(profileId)) || {};
    const mergedData = this.mergeProfileData(current?.data, {
      profileId,
      discordId: this.deserializeGuardRow(current)?.discordId,
      completedGames: [],
    });
    await this.persistProfile({
      profileId,
      data: mergedData,
      lastCleanupAt: current.last_cleanup_at ?? null,
      timezone: current.last_cleanup_timezone ?? null,
      deleteCount: current.delete_count ?? 0,
    });
  }

  deserializeGuardRow(row) {
    if (!row) return null;
    const data = this.parseProfileData(row.data);
    const completedGames = Array.isArray(data.completedGames) ? data.completedGames : [];
    return {
      profileId: row.profile_id || data?.metadata?.profileId || null,
      discordId: data?.discordLink?.discordId || null,
      lastCleanupAt: row.last_cleanup_at || null,
      timezone: row.last_cleanup_timezone || null,
      deleteCount: row.delete_count ?? 0,
      completedGames,
    };
  }

  async fetchProfileRow(profileId) {
    const result = await this.tableAdapter.execute(
      `SELECT profile_id, data, last_cleanup_at, last_cleanup_timezone, delete_count
       FROM profiles WHERE profile_id = ? LIMIT 1`,
      [profileId],
    );
    return result?.results?.[0] || null;
  }

  mergeProfileData(rawData, updates = {}) {
    const existing = this.parseProfileData(rawData);
    const metadata = {
      ...(existing.metadata || {}),
      profileId: updates.profileId || existing.metadata?.profileId,
      displayName:
        updates.displayName || existing.metadata?.displayName || 'Visitor',
      avatarUrl: updates.avatarUrl || existing.metadata?.avatarUrl,
      location: existing.metadata?.location,
    };
    const discordLink = updates.discordId
      ? {
          ...(existing.discordLink || {}),
          discordId: updates.discordId,
          username:
            updates.displayName || existing.discordLink?.username || metadata.displayName,
          avatarUrl: updates.avatarUrl || existing.discordLink?.avatarUrl,
        }
      : existing.discordLink;

    const completedGames = Array.isArray(updates.completedGames)
      ? updates.completedGames
      : Array.isArray(existing.completedGames)
        ? existing.completedGames
        : [];

    return JSON.stringify({
      ...existing,
      metadata,
      ...(discordLink ? { discordLink } : {}),
      completedGames,
    });
  }

  parseProfileData(rawData) {
    if (!rawData) return {};
    try {
      const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  async persistProfile({
    profileId,
    data,
    lastCleanupAt = null,
    timezone = null,
    deleteCount = 0,
  }) {
    await this.tableAdapter.execute(
      `INSERT INTO profiles (profile_id, data, last_cleanup_at, last_cleanup_timezone, delete_count)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(profile_id) DO UPDATE SET data = excluded.data, last_cleanup_at = excluded.last_cleanup_at, last_cleanup_timezone = excluded.last_cleanup_timezone, delete_count = excluded.delete_count`,
      [profileId, data || JSON.stringify({ metadata: { profileId } }), lastCleanupAt, timezone, deleteCount],
    );
  }

  isCleanupBlocked(guard) {
    if (!guard || !guard.deleteCount || guard.deleteCount <= 2) {
      return false;
    }
    if (!guard.lastCleanupAt) {
      return false;
    }
    const lastCleanup = new Date(guard.lastCleanupAt);
    if (Number.isNaN(lastCleanup.getTime())) {
      return false;
    }
    const now = this.clock();
    const diffMs = now.getTime() - lastCleanup.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    return hours < 24;
  }
}

class DiscordAuthController {
  constructor(env, guardRepository) {
    this.env = env;
    this.guardRepository = guardRepository;
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

  buildGuardResponse(message) {
    return new Response(JSON.stringify({ error: 'login_blocked', message }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async cleanupTransientProfile(identity, transientProfileId, canonicalProfileId) {
    if (
      !identity?.repository ||
      !transientProfileId ||
      transientProfileId === canonicalProfileId
    ) {
      return;
    }

    try {
      await identity.repository.delete(transientProfileId);
      console.info('Removed transient profile after canonical Discord login', {
        transientProfileId,
        canonicalProfileId,
      });
    } catch (error) {
      console.warn('Failed to remove transient profile after canonical Discord login', {
        transientProfileId,
        canonicalProfileId,
        error,
      });
    }
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

  buildDiscordAdapter() {
    if (!this.isConfigured()) {
      return null;
    }
    return new DiscordOAuthAdapter(
      {
        clientId: this.env.IDENTITY_DISCORD_CLIENT_ID,
        clientSecret: this.env.IDENTITY_DISCORD_CLIENT_SECRET,
        redirectUri: this.env.IDENTITY_DISCORD_REDIRECT_URI,
      },
      console,
    );
  }

  async buildStartRedirect(requestUrl, cookies) {
    if (!this.isConfigured()) {
      return new Response('Discord authentication is disabled', { status: 503 });
    }

    const { identity, sessionStore } = this.buildIdentity(cookies);
    const redirectTarget = requestUrl.searchParams.get('redirect') || '/';
    const existingSession = await sessionStore.readSession();
    if (this.guardRepository && existingSession?.profileId) {
      const guard = await this.guardRepository.findByProfileId(existingSession.profileId);
      if (this.guardRepository.isCleanupBlocked(guard)) {
        return this.buildGuardResponse(
          'Account cleanup limit reached. Please try again after cooldown.',
        );
      }
    }
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

    const oauthAdapter = this.buildDiscordAdapter();
    let discordLink;
    try {
      discordLink = await oauthAdapter?.exchangeCode(code);
    } catch (error) {
      console.error('Failed to exchange Discord code before guard checks', error);
      return new Response('Failed to complete Discord login', { status: 502 });
    }

    let canonicalGuard = null;
    if (this.guardRepository && discordLink?.discordId) {
      canonicalGuard = await this.guardRepository.findByDiscordId(discordLink.discordId);
    }

    const stateProfileId = state?.profileId;
    const resolvedProfileId =
      canonicalGuard?.profileId || stateProfileId || crypto.randomUUID();
    if (canonicalGuard?.profileId && canonicalGuard.profileId !== stateProfileId) {
      console.info('Replacing state profile with canonical Discord profile', {
        stateProfileId,
        canonicalProfileId: canonicalGuard.profileId,
      });
    }
    const metadata = new ProfileMetadata({
      profileId: resolvedProfileId,
      displayName: state?.displayName || discordLink?.username || 'Discord traveler',
      avatarUrl: state?.avatarUrl || discordLink?.avatarUrl,
    });

    if (this.guardRepository && discordLink) {
      const guard =
        canonicalGuard || (await this.guardRepository.findByDiscordId(discordLink.discordId));
      if (this.guardRepository.isCleanupBlocked(guard)) {
        return this.buildGuardResponse(
          'Account is temporarily locked after repeated cleanups. Please wait 24 hours.',
        );
      }
      if (guard?.deleteCount > 2 && !this.guardRepository.isCleanupBlocked(guard)) {
        await this.guardRepository.resetCleanupWindow(guard.profileId);
      }
    }

    if (
      canonicalGuard?.profileId &&
      stateProfileId &&
      canonicalGuard.profileId !== stateProfileId
    ) {
      await this.cleanupTransientProfile(
        identity,
        stateProfileId,
        canonicalGuard.profileId,
      );
    }

    let identityAggregate;
    try {
      identityAggregate = await identity.linkService.completeDiscordLogin(
        resolvedProfileId,
        code,
        metadata,
        { discordLink },
      );
    } catch (error) {
      return new Response('Failed to complete Discord login', { status: 502 });
    }

    await sessionStore.delete(sessionStore.stateKey);

    const profile = identityAggregate?.state?.metadata
      ? identityAggregate.state.metadata
      : metadata;
    discordLink = identityAggregate?.state?.discordLink;

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

    if (this.guardRepository) {
      await this.guardRepository.upsertProfile({
        profileId: profile.profileId,
        discordId: discordLink?.discordId,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl || discordLink?.avatarUrl,
      });
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

  async handleCleanup(request, cookies) {
    const { identity, sessionStore } = this.buildIdentity(cookies);
    const session = await sessionStore.readSession();
    if (!session?.profileId) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    }

    const guard = this.guardRepository
      ? await this.guardRepository.findByProfileId(session.profileId)
      : null;

    if (this.guardRepository && guard) {
      if (this.guardRepository.isCleanupBlocked(guard)) {
        console.info('Cleanup blocked by guard window', {
          profileId: session.profileId,
          deleteCount: guard.deleteCount,
          lastCleanupAt: guard.lastCleanupAt,
        });
        return this.buildGuardResponse(
          'Account is temporarily locked after repeated cleanups. Please wait 24 hours.',
        );
      }
      if (guard.deleteCount > 2 && !this.guardRepository.isCleanupBlocked(guard)) {
        await this.guardRepository.resetCleanupWindow(guard.profileId);
        console.info('Reset cleanup window after cooldown before profile deletion', {
          profileId: session.profileId,
        });
      }
    }

    const body = await request.json().catch(() => ({}));
    const timezone = request.headers.get('X-Timezone') || body?.timezone;
    const cachedGuard = guard;
    try {
      await identity.repository.delete(session.profileId);
    } catch (error) {
      console.error('Failed to remove profile from repository', error);
    }
    if (this.guardRepository) {
      const expectedDeleteCount = (cachedGuard?.deleteCount ?? 0) + 1;
      const cleanupRecord = await this.guardRepository.recordCleanup({
        profileId: session.profileId,
        timezone,
        discordId: cachedGuard?.discordId,
        displayName: session.displayName,
        avatarUrl: session.avatarUrl,
        completedGames: cachedGuard?.completedGames,
      });
      const persistedGuard = await this.guardRepository.findByProfileId(session.profileId);
      const hasTimestamp = Boolean(persistedGuard?.lastCleanupAt || cleanupRecord?.lastCleanupAt);
      const hasExpectedCount = (persistedGuard?.deleteCount ?? 0) >= expectedDeleteCount;
      if (!hasTimestamp || !hasExpectedCount) {
        console.error('Guard cleanup state failed to persist', {
          profileId: session.profileId,
          expectedDeleteCount,
          persistedDeleteCount: persistedGuard?.deleteCount,
          persistedLastCleanupAt: persistedGuard?.lastCleanupAt,
        });
        return new Response(
          JSON.stringify({ error: 'cleanup_persistence_failed' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
      }
      await this.guardRepository.clearCompleted(session.profileId);
    }
    await sessionStore.delete(sessionStore.sessionKey);
    const response = new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
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
  constructor(env, guardRepository) {
    this.env = env;
    this.guardRepository = guardRepository;
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
    const profileId = this.resolveProfileId(trigger, session?.profileId);
    if (this.guardRepository && profileId) {
      const guard = await this.guardRepository.findByProfileId(profileId);
      const gameId = trigger?.source || trigger?.context?.source || 'efbd-poll';
      if (guard?.completedGames?.includes?.(gameId)) {
        return this.buildJsonResponse(
          { error: 'replay_blocked', message: 'Mini-game already completed.' },
          409,
          sessionStore,
        );
      }
      if (this.guardRepository.isCleanupBlocked(guard)) {
        return this.buildJsonResponse(
          { error: 'replay_blocked', message: 'Account is locked during cleanup cooldown.' },
          429,
          sessionStore,
        );
      }
    }

    const ingestion = this.buildIngestionService(increment);
    if (!ingestion) {
      return new Response('EFBD scale persistence unavailable', { status: 503 });
    }

    try {
      await ingestion.recordTriggers({
        profileId,
        triggers: [
          {
            axis: axisCode,
            source: trigger?.source || 'interdead-it',
            metadata: trigger?.metadata,
          },
        ],
      });
      if (this.guardRepository && profileId) {
        const gameId = trigger?.source || trigger?.context?.source || 'efbd-poll';
        await this.guardRepository.markCompleted(profileId, gameId);
      }
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
    const guardRepository = env.INTERDEAD_CORE
      ? new ProfileGuardRepository(new D1TableAdapter(env.INTERDEAD_CORE), () => new Date())
      : null;

    try {
      const url = new URL(request.url);
      const cookies = parseCookies(request.headers.get('Cookie'));
      const authController = new DiscordAuthController(env, guardRepository);
      const efbdController = new EfbdController(env, guardRepository);

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

      if (request.method === 'POST' && url.pathname === '/auth/profile/cleanup') {
        const response = await authController.handleCleanup(request, cookies);
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
