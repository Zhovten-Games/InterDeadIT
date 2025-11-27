class DiscordAuthController {
  constructor(env) {
    this.env = env;
  }

  buildStartRedirect(originUrl) {
    const clientId = this.env.IDENTITY_DISCORD_CLIENT_ID;
    const redirectUri = this.env.IDENTITY_DISCORD_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      return new Response('Missing Discord credentials', { status: 500 });
    }
    const discordUrl = new URL('https://discord.com/api/oauth2/authorize');
    discordUrl.searchParams.set('client_id', clientId);
    discordUrl.searchParams.set('response_type', 'code');
    discordUrl.searchParams.set('scope', 'identify');
    discordUrl.searchParams.set('redirect_uri', redirectUri);
    if (originUrl) {
      discordUrl.searchParams.set('state', originUrl);
    }
    return Response.redirect(discordUrl.toString(), 302);
  }

  async handleCallback(url) {
    const code = url.searchParams.get('code');
    if (!code) {
      return new Response('Missing code', { status: 400 });
    }
    const profile = await this.fetchDiscordProfile(code);
    if (!profile) {
      return new Response('Unable to link Discord', { status: 502 });
    }
    const sessionToken = await this.persistProfile(profile);
    const redirectTo = url.searchParams.get('state') || '/';
    return Response.redirect(redirectTo + `#session=${sessionToken}`, 302);
  }

  async fetchDiscordProfile(code) {
    if (!code) {
      return null;
    }
    return { id: 'discord-user', username: 'interdead', code };
  }

  async persistProfile(profile) {
    const db = this.env.INTERDEAD_CORE;
    if (db && profile?.id) {
      await db.prepare('INSERT INTO identity_links (id, username) VALUES (?1, ?2) ON CONFLICT(id) DO UPDATE SET username=?2')
        .bind(profile.id, profile.username)
        .run();
    }
    return `session-${profile?.id || 'anon'}`;
  }
}

class EfbdController {
  constructor(env) {
    this.env = env;
  }

  async handleTrigger(request) {
    const trigger = await request.json().catch(() => null);
    if (!trigger?.axis) {
      return new Response('Invalid trigger', { status: 400 });
    }
    await this.persistTrigger(trigger);
    return Response.json({ status: 'accepted', trigger });
  }

  async persistTrigger(trigger) {
    const db = this.env.INTERDEAD_CORE;
    if (!db) {
      return;
    }
    await db.prepare('INSERT INTO efbd_scale (axis_code, score, trigger_source, updated_at) VALUES (?1, ?2, ?3, datetime())')
      .bind(trigger.axis, trigger.value ?? 0, trigger.source || 'site')
      .run();
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const authController = new DiscordAuthController(env);
    const efbdController = new EfbdController(env);

    if (request.method === 'GET' && url.pathname === '/auth/discord/start') {
      return authController.buildStartRedirect(url.searchParams.get('state'));
    }

    if (request.method === 'GET' && url.pathname === '/auth/discord/callback') {
      return authController.handleCallback(url);
    }

    if (request.method === 'POST' && url.pathname === '/efbd/trigger') {
      return efbdController.handleTrigger(request);
    }

    return new Response('Not found', { status: 404 });
  },
};
