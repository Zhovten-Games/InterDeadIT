#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

class CliOptions {
  constructor(argv) {
    this.rawArgs = argv.slice(2);
    this.localAuthKey = null;
    this.sessionConfigPath = null;
    this.help = false;
    this.hugoArgs = [];
    this.parse();
  }

  parse() {
    for (let index = 0; index < this.rawArgs.length; index += 1) {
      const current = this.rawArgs[index];
      if (current === '--help' || current === '-h') {
        this.help = true;
        continue;
      }
      if (current === '--local-auth-key') {
        this.localAuthKey = this.rawArgs[index + 1] || '';
        index += 1;
        continue;
      }
      if (current.startsWith('--local-auth-key=')) {
        this.localAuthKey = current.slice('--local-auth-key='.length);
        continue;
      }
      if (current === '--local-auth-config') {
        this.sessionConfigPath = this.rawArgs[index + 1] || '';
        index += 1;
        continue;
      }
      if (current.startsWith('--local-auth-config=')) {
        this.sessionConfigPath = current.slice('--local-auth-config='.length);
        continue;
      }
      this.hugoArgs.push(current);
    }
  }

  isServerMode() {
    return this.hugoArgs.includes('server');
  }
}

class OverlayConfig {
  constructor({ projectRoot, options }) {
    this.projectRoot = projectRoot;
    this.options = options;
  }

  load() {
    const defaultPath = path.join(
      this.projectRoot,
      'tests/local-auth-overlay/config/default-session.json',
    );
    const configPath = this.options.sessionConfigPath
      ? path.resolve(this.projectRoot, this.options.sessionConfigPath)
      : defaultPath;

    if (!fs.existsSync(configPath)) {
      throw new Error(`Overlay config file was not found: ${configPath}`);
    }

    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return {
      profileId: parsed.profileId || 'LOCAL-TEST-PROFILE',
      displayName: parsed.displayName || 'NIRO Operator',
      username: parsed.username || 'niro_local',
      avatarUrl: parsed.avatarUrl || '',
    };
  }
}

class HugoCommandBuilder {
  constructor({ options, outputDir, supportsRenderToDisk }) {
    this.options = options;
    this.outputDir = outputDir;
    this.supportsRenderToDisk = Boolean(supportsRenderToDisk);
  }

  buildArgs() {
    const result = [...this.options.hugoArgs];
    const hasDestination = result.some((arg, index) => {
      if (arg === '-d' || arg === '--destination') {
        return true;
      }
      if (arg.startsWith('--destination=')) {
        return true;
      }
      if (arg.startsWith('-d=') && index >= 0) {
        return true;
      }
      return false;
    });

    if (!hasDestination) {
      result.push('--destination', this.outputDir);
    }

    if (
      this.options.isServerMode() &&
      this.supportsRenderToDisk &&
      !result.includes('--renderToDisk')
    ) {
      result.push('--renderToDisk');
    }

    return result;
  }
}

class HugoCapabilityDetector {
  constructor({ projectRoot }) {
    this.projectRoot = projectRoot;
  }

  supportsRenderToDisk() {
    const help = spawnSync('hugo', ['server', '--help'], {
      cwd: this.projectRoot,
      encoding: 'utf8',
    });

    const text = `${help.stdout || ''}\n${help.stderr || ''}`;
    return text.includes('--renderToDisk');
  }
}

class OverlayInjector {
  constructor({ outputDir, session, localAuthKey }) {
    this.outputDir = outputDir;
    this.session = session;
    this.localAuthKey = localAuthKey;
    this.overlayScriptRelative = 'local-auth-overlay/local-auth-overlay.js';
  }

  inject() {
    if (!fs.existsSync(this.outputDir)) {
      return;
    }

    this.writeOverlayScript();
    const htmlFiles = this.collectHtmlFiles(this.outputDir);
    htmlFiles.forEach((filePath) => this.injectScriptTag(filePath));
  }

  writeOverlayScript() {
    const targetPath = path.join(this.outputDir, this.overlayScriptRelative);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });

    const payload = {
      key: this.localAuthKey,
      session: this.session,
    };

    const source = `(function () {
  const payload = ${JSON.stringify(payload, null, 2)};
  window.__INTERDEAD_LOCAL_AUTH__ = payload;

  const clone = () => ({ ...payload.session, authenticated: true });
  const listeners = new Set();

  const authPort = {
    getSnapshot() {
      return { status: 'authenticated', authenticated: true, session: clone() };
    },
    onChange(listener) {
      if (typeof listener === 'function') {
        listeners.add(listener);
        listener(this.getSnapshot());
      }
      return () => listeners.delete(listener);
    },
    isAuthenticated() {
      return true;
    },
  };

  const emitAuthChange = () => {
    const snapshot = authPort.getSnapshot();
    listeners.forEach((listener) => listener(snapshot));
  };

  const removeHiddenVariant = (element, basePrefix) => {
    if (!element || !element.classList) {
      return;
    }
    Array.from(element.classList).forEach((className) => {
      if (className.startsWith(basePrefix) && className.endsWith('--hidden')) {
        element.classList.remove(className);
      }
    });
  };

  const applyDomOverrides = () => {
    window.InterdeadPorts = window.InterdeadPorts || {};
    window.InterdeadPorts.authVisibility = authPort;

    const profileLink = document.body?.dataset?.profileUrl || '/profile/';

    document.querySelectorAll('[data-auth-badge]').forEach((badge) => {
      badge.classList.remove('auth-badge--hidden');
      const usernameNode = badge.querySelector('[data-auth-badge-username]');
      if (usernameNode) {
        usernameNode.textContent = '@' + (payload.session.username || payload.session.displayName || 'local');
      }

      const linkTarget = badge.matches('[data-auth-badge-link]')
        ? badge
        : badge.querySelector('[data-auth-badge-link]');
      if (linkTarget) {
        linkTarget.setAttribute('href', profileLink);
      }

      const avatarImage = badge.querySelector('[data-auth-badge-avatar-img]');
      if (avatarImage && payload.session.avatarUrl) {
        avatarImage.src = payload.session.avatarUrl;
      }
    });

    document.querySelectorAll('[data-auth-button]').forEach((button) => {
      button.classList.add('gm-cta--hidden');
      button.setAttribute('hidden', 'true');
    });

    document.querySelectorAll('[data-profile-authenticated]').forEach((node) => {
      node.hidden = false;
      removeHiddenVariant(node, 'gm-profile__');
    });

    document.querySelectorAll('[data-profile-unauthenticated]').forEach((node) => {
      node.classList.add('gm-profile__card--hidden');
      node.hidden = true;
    });

    document.querySelectorAll('[data-profile-display-name]').forEach((node) => {
      node.textContent = payload.session.displayName || 'Local operator';
    });

    document.querySelectorAll('[data-profile-username]').forEach((node) => {
      node.textContent = payload.session.username || 'local_user';
    });

    document.querySelectorAll('[data-profile-id]').forEach((node) => {
      node.textContent = payload.session.profileId || 'LOCAL-TEST-PROFILE';
    });

    const profileAvatar = document.querySelector('[data-profile-avatar]');
    if (profileAvatar) {
      profileAvatar.classList.remove('gm-profile__avatarFrame--empty');
      const avatarImage = profileAvatar.querySelector('[data-profile-avatar-img]');
      if (avatarImage && payload.session.avatarUrl) {
        avatarImage.src = payload.session.avatarUrl;
      }
    }

    document.querySelectorAll('[data-minigame-fallback]').forEach((node) => {
      node.setAttribute('hidden', 'true');
    });

    document.querySelectorAll('[data-minigame-mount]').forEach((node) => {
      node.removeAttribute('hidden');
    });

    document.querySelectorAll('.gm-hero').forEach((node) => {
      node.classList.add('gm-hero--authenticated');
    });

    document.querySelectorAll('.gm-hero__countdown, .gm-hero__beta').forEach((node) => {
      node.classList.add('gm-hero__countdown--hidden');
    });

    emitAuthChange();
    window.dispatchEvent(new CustomEvent('interdead:ports-ready', { detail: { ports: window.InterdeadPorts } }));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyDomOverrides, { once: true });
  } else {
    applyDomOverrides();
  }
})();
`;

    fs.writeFileSync(targetPath, source, 'utf8');
  }

  collectHtmlFiles(root) {
    const queue = [root];
    const result = [];

    while (queue.length > 0) {
      const current = queue.shift();
      const entries = fs.readdirSync(current, { withFileTypes: true });
      entries.forEach((entry) => {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          queue.push(fullPath);
          return;
        }
        if (entry.isFile() && entry.name.endsWith('.html')) {
          result.push(fullPath);
        }
      });
    }

    return result;
  }

  injectScriptTag(filePath) {
    const existing = fs.readFileSync(filePath, 'utf8');
    const scriptTag = `<script src="/${this.overlayScriptRelative}"></script>`;
    if (existing.includes(scriptTag)) {
      return;
    }

    const withTag = existing.includes('</body>')
      ? existing.replace('</body>', `  ${scriptTag}\n</body>`)
      : `${existing}\n${scriptTag}\n`;
    fs.writeFileSync(filePath, withTag, 'utf8');
  }
}

class LocalAuthOverlayRunner {
  constructor({ projectRoot, options }) {
    this.projectRoot = projectRoot;
    this.options = options;
    this.outputDir = path.join(projectRoot, 'tests/local-auth-overlay/public');
    this.capabilityDetector = new HugoCapabilityDetector({ projectRoot });
  }

  printHelp() {
    console.log(`Local Auth Overlay for Hugo\n\nUsage:\n  node tests/local-auth-overlay/scripts/local-auth-overlay.js [hugo args] [--local-auth-key KEY]\n\nExamples:\n  node tests/local-auth-overlay/scripts/local-auth-overlay.js server -D --local-auth-key dev-key\n  node tests/local-auth-overlay/scripts/local-auth-overlay.js --minify --local-auth-key dev-key\n  node tests/local-auth-overlay/scripts/local-auth-overlay.js server -D\n\nBehavior:\n  - Without --local-auth-key: command is proxied to Hugo unchanged.\n  - With --local-auth-key: output is isolated to tests/local-auth-overlay/public and overlay auth is injected.`);
  }

  ensureHugoAvailable() {
    const check = spawnSync('hugo', ['version'], { cwd: this.projectRoot, stdio: 'ignore' });
    if (check.status !== 0) {
      throw new Error('Hugo binary is not available in PATH.');
    }
  }

  run() {
    if (this.options.help) {
      this.printHelp();
      return;
    }

    this.ensureHugoAvailable();

    if (!this.options.localAuthKey) {
      this.execPassthrough();
      return;
    }

    const session = new OverlayConfig({ projectRoot: this.projectRoot, options: this.options }).load();
    const supportsRenderToDisk = this.capabilityDetector.supportsRenderToDisk();
    const commandArgs = new HugoCommandBuilder({
      options: this.options,
      outputDir: this.outputDir,
      supportsRenderToDisk,
    }).buildArgs();
    const injector = new OverlayInjector({
      outputDir: this.outputDir,
      session,
      localAuthKey: this.options.localAuthKey,
    });

    if (this.options.isServerMode()) {
      this.execServer(commandArgs, injector);
      return;
    }

    const status = spawnSync('hugo', commandArgs, {
      cwd: this.projectRoot,
      stdio: 'inherit',
    });
    if (status.status !== 0) {
      process.exit(status.status || 1);
    }
    injector.inject();
    console.log('[LocalAuthOverlay] Overlay injected into isolated output:', this.outputDir);
  }

  execPassthrough() {
    const status = spawnSync('hugo', this.options.hugoArgs, {
      cwd: this.projectRoot,
      stdio: 'inherit',
    });
    process.exit(status.status || 0);
  }

  execServer(commandArgs, injector) {
    console.log('[LocalAuthOverlay] Starting Hugo server with isolated output:', this.outputDir);
    const hugo = spawn('hugo', commandArgs, {
      cwd: this.projectRoot,
      stdio: 'inherit',
    });

    const timer = setInterval(() => {
      try {
        injector.inject();
      } catch (error) {
        console.error('[LocalAuthOverlay] Injection failed during server mode', error);
      }
    }, 1200);

    const shutdown = (signal) => {
      clearInterval(timer);
      if (!hugo.killed) {
        hugo.kill(signal);
      }
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    hugo.on('exit', (code) => {
      clearInterval(timer);
      process.exit(code || 0);
    });
  }
}

const runner = new LocalAuthOverlayRunner({
  projectRoot: process.cwd(),
  options: new CliOptions(process.argv),
});

try {
  runner.run();
} catch (error) {
  console.error('[LocalAuthOverlay] Failed to execute', error.message);
  process.exit(1);
}
