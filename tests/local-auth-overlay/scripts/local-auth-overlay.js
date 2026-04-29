#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const KNOWN_LOCAL_PACKAGES = {
  '@interdead/framework': 'framework',
  '@interdead/identity-core': 'identity-core',
  '@interdead/efbd-scale': 'efbd-scale',
};

class DirectoryLinkOperator {
  static create({ sourcePath, targetPath }) {
    try {
      fs.symlinkSync(sourcePath, targetPath, 'dir');
    } catch (error) {
      if (process.platform === 'win32' && error.code === 'EPERM') {
        // Fallback for Windows without admin / developer mode
        fs.symlinkSync(sourcePath, targetPath, 'junction');
        return;
      }
      throw error;
    }
  }
}

class NpmCommandRunner {
  constructor({ spawnSyncFn = spawnSync, platform = process.platform } = {}) {
    this.spawnSync = spawnSyncFn;
    this.platform = platform;
  }

  resolveExecutable() {
    return this.platform === 'win32' ? 'npm.cmd' : 'npm';
  }

  run({ args, cwd, stdio = 'inherit', encoding, maxBuffer }) {
    const options = { cwd, stdio };
    if (encoding) {
      options.encoding = encoding;
    }
    if (typeof maxBuffer === 'number') {
      options.maxBuffer = maxBuffer;
    }

    if (this.platform === 'win32') {
      // Use cmd.exe wrapper on Windows because direct .cmd spawn can fail with EINVAL in some shells/runtimes.
      const commandShell = process.env.comspec || 'cmd.exe';
      const commandArgs = ['/d', '/s', '/c', 'npm.cmd', ...args];
      return this.spawnSync(commandShell, commandArgs, options);
    }

    return this.spawnSync(this.resolveExecutable(), args, options);
  }
}

class CliOptions {
  constructor(argv) {
    this.rawArgs = argv.slice(2);
    this.localAuthKey = null;
    this.sessionConfigPath = null;
    this.help = false;
    this.localPackages = null;
    this.localPackagesRoot = null;
    this.localPackagesWorkspace = null;
    this.localPackagesPrepareMode = 'copy';
    this.skipLocalPackageBuild = false;
    this.forceLocalPackageBuild = false;
    this.cleanupLocalPackagesWorkspace = false;
    this.localPackageAudit = 'off';
    this.localPackageAuditLevel = 'moderate';
    this.localPackageOverrides = new Map();
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
      if (current === '--local-packages') {
        this.localPackages = this.rawArgs[index + 1] || '';
        index += 1;
        continue;
      }
      if (current.startsWith('--local-packages=')) {
        this.localPackages = current.slice('--local-packages='.length);
        continue;
      }
      if (current === '--local-packages-root') {
        this.localPackagesRoot = this.rawArgs[index + 1] || '';
        index += 1;
        continue;
      }
      if (current === '--local-packages-workspace') {
        this.localPackagesWorkspace = this.rawArgs[index + 1] || '';
        index += 1;
        continue;
      }
      if (current.startsWith('--local-packages-workspace=')) {
        this.localPackagesWorkspace = current.slice('--local-packages-workspace='.length);
        continue;
      }
      if (current === '--local-packages-prepare-mode') {
        this.localPackagesPrepareMode = (
          (this.rawArgs[index + 1] || '').trim() || 'copy'
        ).toLowerCase();
        index += 1;
        continue;
      }
      if (current.startsWith('--local-packages-prepare-mode=')) {
        this.localPackagesPrepareMode = (
          current.slice('--local-packages-prepare-mode='.length).trim() || 'copy'
        ).toLowerCase();
        continue;
      }
      if (current === '--skip-local-package-build') {
        this.skipLocalPackageBuild = true;
        continue;
      }
      if (current === '--force-local-package-build') {
        this.forceLocalPackageBuild = true;
        continue;
      }
      if (current === '--cleanup-local-packages-workspace') {
        this.cleanupLocalPackagesWorkspace = true;
        continue;
      }
      if (current === '--local-package-audit') {
        this.localPackageAudit = ((this.rawArgs[index + 1] || '').trim() || 'off').toLowerCase();
        index += 1;
        continue;
      }
      if (current.startsWith('--local-package-audit=')) {
        this.localPackageAudit = (
          current.slice('--local-package-audit='.length).trim() || 'off'
        ).toLowerCase();
        continue;
      }
      if (current === '--local-package-audit-level') {
        this.localPackageAuditLevel = (
          (this.rawArgs[index + 1] || '').trim() || 'moderate'
        ).toLowerCase();
        index += 1;
        continue;
      }
      if (current.startsWith('--local-package-audit-level=')) {
        this.localPackageAuditLevel = (
          current.slice('--local-package-audit-level='.length).trim() || 'moderate'
        ).toLowerCase();
        continue;
      }
      if (current.startsWith('--local-packages-root=')) {
        this.localPackagesRoot = current.slice('--local-packages-root='.length);
        continue;
      }
      if (current === '--local-package-map') {
        this.parseLocalPackageMap(this.rawArgs[index + 1] || '');
        index += 1;
        continue;
      }
      if (current.startsWith('--local-package-map=')) {
        this.parseLocalPackageMap(current.slice('--local-package-map='.length));
        continue;
      }
      this.hugoArgs.push(current);
    }
  }

  parseLocalPackageMap(rawValue) {
    const separatorIndex = rawValue.indexOf('=');
    if (separatorIndex < 1) {
      return;
    }
    const packageName = rawValue.slice(0, separatorIndex).trim();
    const packagePath = rawValue.slice(separatorIndex + 1).trim();
    if (!packageName || !packagePath) {
      return;
    }
    this.localPackageOverrides.set(packageName, packagePath);
  }

  isServerMode() {
    return this.hugoArgs.includes('server');
  }

  hasLocalPackageSelection() {
    return Boolean(this.localPackages) || this.localPackageOverrides.size > 0;
  }
}

class LocalPackageAuditPolicy {
  constructor({ options }) {
    this.options = options;
    this.allowedModes = new Set(['off', 'report', 'strict']);
    this.allowedLevels = ['moderate', 'high', 'critical'];
  }

  resolve(packageName) {
    const mode = (this.options.localPackageAudit || 'off').toLowerCase();
    if (!this.allowedModes.has(mode)) {
      throw new Error(
        `Invalid --local-package-audit value: ${mode}. Allowed values: off, report, strict. Package: ${packageName}.`,
      );
    }

    const threshold = this.resolveThreshold(packageName);
    return {
      mode,
      threshold,
      shouldRun: mode !== 'off',
      blocking: mode === 'strict',
    };
  }

  resolveThreshold(packageName) {
    const configured = (this.options.localPackageAuditLevel || 'moderate').toLowerCase();
    if (!this.allowedLevels.includes(configured)) {
      throw new Error(
        `Invalid --local-package-audit-level value: ${configured}. Allowed values: moderate, high, critical. Package: ${packageName}.`,
      );
    }
    return configured;
  }
}

class LocalPackageAuditRunner {
  constructor({ npmCommandRunner = new NpmCommandRunner() } = {}) {
    this.npmCommandRunner = npmCommandRunner;
    this.thresholdWeight = { low: 1, moderate: 2, high: 3, critical: 4 };
    this.defaultMaxBuffer = 32 * 1024 * 1024;
  }

  run({ packageName, packagePath, threshold }) {
    const args = ['audit', '--json', `--audit-level=${threshold}`];
    const commandString = `npm ${args.join(' ')}`;
    const status = this.npmCommandRunner.run({
      args,
      cwd: packagePath,
      stdio: 'pipe',
      encoding: 'utf8',
      maxBuffer: this.defaultMaxBuffer,
    });

    if (status.error) {
      throw new Error(
        `Audit execution failed for ${packageName} (${packagePath}). Command: ${commandString}. ${status.error.message}`,
      );
    }

    // npm audit returns non-zero exit code when vulnerabilities are present,
    // so process status alone must not be treated as command execution failure.
    const payload = this.parseAuditJson({
      stdout: status.stdout || '',
      stderr: status.stderr || '',
      exitCode: status.status,
      packageName,
    });
    const counts = this.extractCounts(payload);
    const thresholdExceeded = this.hasFindingsAtOrAboveThreshold(counts, threshold);

    return {
      commandString,
      counts,
      thresholdExceeded,
      rawExitCode: status.status,
    };
  }

  parseAuditJson({ stdout, stderr, exitCode, packageName }) {
    const candidate = `${stdout || ''}`.trim() || `${stderr || ''}`.trim();
    if (!candidate) {
      return {};
    }

    try {
      return JSON.parse(candidate);
    } catch (error) {
      const stdoutSnippet = this.createSnippet(stdout);
      const stderrSnippet = this.createSnippet(stderr);
      throw new Error(
        `Could not parse npm audit JSON output for ${packageName}. Exit code: ${exitCode}. ${error.message}. stdout: ${stdoutSnippet}. stderr: ${stderrSnippet}.`,
      );
    }
  }

  createSnippet(value) {
    const normalized = `${value || ''}`.replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return '<empty>';
    }
    return normalized.slice(0, 240);
  }

  extractCounts(payload) {
    const fallback = { low: 0, moderate: 0, high: 0, critical: 0, total: 0 };
    if (!payload || typeof payload !== 'object') {
      return fallback;
    }

    if (payload.metadata && payload.metadata.vulnerabilities) {
      const metadata = payload.metadata.vulnerabilities;
      const low = Number(metadata.low || 0);
      const moderate = Number(metadata.moderate || 0);
      const high = Number(metadata.high || 0);
      const critical = Number(metadata.critical || 0);
      const total = Number(metadata.total || low + moderate + high + critical);
      return { low, moderate, high, critical, total };
    }

    if (!payload.vulnerabilities || typeof payload.vulnerabilities !== 'object') {
      return fallback;
    }

    const counts = { ...fallback };
    Object.values(payload.vulnerabilities).forEach((entry) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }
      const severity = `${entry.severity || ''}`.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(counts, severity)) {
        counts[severity] += 1;
      }
    });
    counts.total = counts.low + counts.moderate + counts.high + counts.critical;
    return counts;
  }

  hasFindingsAtOrAboveThreshold(counts, threshold) {
    const thresholdScore = this.thresholdWeight[threshold] || this.thresholdWeight.moderate;
    return ['moderate', 'high', 'critical'].some((level) => {
      const score = this.thresholdWeight[level];
      return score >= thresholdScore && Number(counts[level] || 0) > 0;
    });
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

class LocalPackageResolver {
  constructor({ projectRoot, options }) {
    this.projectRoot = projectRoot;
    this.options = options;
  }

  resolveTargets() {
    const result = new Map();
    const root = this.resolveRoot();

    for (const [packageName, overridePath] of this.options.localPackageOverrides) {
      result.set(packageName, {
        sourcePath: path.resolve(this.projectRoot, overridePath),
        fromOverride: true,
      });
    }

    const requested = this.parseRequestedPackages();
    for (const packageName of requested) {
      if (result.has(packageName)) {
        continue;
      }
      const folderName = KNOWN_LOCAL_PACKAGES[packageName];
      if (!folderName) {
        throw new Error(
          `Unknown package for --local-packages: ${packageName}. Use --local-package-map ${packageName}=<path> for custom mappings.`,
        );
      }
      result.set(packageName, {
        sourcePath: path.join(root, folderName),
        fromOverride: false,
      });
    }

    if (result.size === 0) {
      return [];
    }

    return Array.from(result.entries()).map(([packageName, target]) => ({
      packageName,
      sourcePath: target.sourcePath,
      fromOverride: target.fromOverride,
    }));
  }

  resolveRoot() {
    const defaultRoot = path.resolve(this.projectRoot, '../InterDeadCore');
    if (!this.options.localPackagesRoot) {
      return defaultRoot;
    }
    return path.resolve(this.projectRoot, this.options.localPackagesRoot);
  }

  parseRequestedPackages() {
    if (!this.options.localPackages) {
      return [];
    }

    if (this.options.localPackages === 'all') {
      return Object.keys(KNOWN_LOCAL_PACKAGES);
    }

    return this.options.localPackages
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
  }
}

class LocalPackageWorkspaceManager {
  constructor({
    projectRoot,
    options,
    logger = console,
    localPackageAuditPolicy = null,
    localPackageAuditRunner = null,
    npmCommandRunner = null,
  }) {
    this.projectRoot = projectRoot;
    this.options = options;
    this.logger = logger;
    this.stateInspector = new LocalPackageStateInspector();
    this.preparationPolicy = new LocalPackagePreparationPolicy({
      options,
      logger,
      stateInspector: this.stateInspector,
    });
    this.npmCommandRunner = npmCommandRunner || new NpmCommandRunner();
    this.auditPolicy =
      localPackageAuditPolicy ||
      new LocalPackageAuditPolicy({
        options,
      });
    this.auditRunner =
      localPackageAuditRunner ||
      new LocalPackageAuditRunner({
        npmCommandRunner: this.npmCommandRunner,
      });
  }

  prepare(targets) {
    if (!targets || targets.length === 0) {
      return [];
    }

    const preparedTargets = [];
    for (const target of targets) {
      if (target.fromOverride) {
        this.logger.info(
          `[LocalAuthOverlay] Preparing --local-package-map override for ${target.packageName}: ${target.sourcePath}`,
        );
      }
      preparedTargets.push(this.prepareTarget(target));
    }

    return preparedTargets;
  }

  cleanupWorkspaceIfRequested() {
    if (!this.options.cleanupLocalPackagesWorkspace) {
      return;
    }

    const workspaceRoot = this.resolveWorkspaceRoot();
    if (fs.existsSync(workspaceRoot)) {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
      this.logger.info(`[LocalAuthOverlay] Cleaned local packages workspace: ${workspaceRoot}`);
    }
  }

  prepareTarget(target) {
    const workspacePath = this.resolveWorkspacePackagePath(target.packageName);

    this.logger.info(`[LocalAuthOverlay] Preparing package ${target.packageName}`);
    this.logger.info(`[LocalAuthOverlay] Source: ${target.sourcePath}`);
    this.logger.info(`[LocalAuthOverlay] Workspace target: ${workspacePath}`);

    this.ensureValidNpmPackage(target.packageName, target.sourcePath);
    const sourceSnapshot = this.preparationPolicy.captureSourceSnapshot(target.sourcePath);
    this.prepareWorkspaceCopy(target.sourcePath, workspacePath);
    const preparationPlan = this.preparationPolicy.createPlan({
      packageName: target.packageName,
      packagePath: workspacePath,
      sourceSnapshot,
    });

    this.installDependencies(target.packageName, workspacePath, preparationPlan);
    this.buildPackage(target.packageName, workspacePath, preparationPlan);

    this.validateBuildArtifacts(target.packageName, workspacePath);
    this.runAudit(target.packageName, workspacePath);
    return {
      ...target,
      sourcePath: workspacePath,
    };
  }

  runAudit(packageName, packagePath) {
    const decision = this.auditPolicy.resolve(packageName);
    this.logger.info(
      `[LocalAuthOverlay] Audit policy for ${packageName}: mode=${decision.mode}, threshold=${decision.threshold}, workspace=${packagePath}`,
    );

    if (!decision.shouldRun) {
      this.logger.info(`[LocalAuthOverlay] Audit skipped for ${packageName}: mode is off.`);
      return;
    }

    const result = this.auditRunner.run({
      packageName,
      packagePath,
      threshold: decision.threshold,
    });
    const summary = `low=${result.counts.low}, moderate=${result.counts.moderate}, high=${result.counts.high}, critical=${result.counts.critical}, total=${result.counts.total}`;

    this.logger.info(
      `[LocalAuthOverlay] Audit result for ${packageName}: mode=${decision.mode}, threshold=${decision.threshold}, workspace=${packagePath}, vulnerabilities={${summary}}`,
    );

    if (decision.blocking && result.thresholdExceeded) {
      throw new Error(
        `Package preparation blocked by local package audit for ${packageName}. Workspace: ${packagePath}. Mode: strict. Threshold: ${decision.threshold}. Vulnerabilities above threshold were detected ({${summary}}).`,
      );
    }
  }

  resolveWorkspaceRoot() {
    const defaultRoot = path.resolve(
      this.projectRoot,
      'tests/local-auth-overlay/packages-workspace',
    );
    if (!this.options.localPackagesWorkspace) {
      return defaultRoot;
    }
    return path.resolve(this.projectRoot, this.options.localPackagesWorkspace);
  }

  resolveWorkspacePackagePath(packageName) {
    return path.join(this.resolveWorkspaceRoot(), ...packageName.split('/'));
  }

  prepareWorkspaceCopy(sourcePath, workspacePath) {
    fs.mkdirSync(path.dirname(workspacePath), { recursive: true });
    if (fs.existsSync(workspacePath)) {
      fs.rmSync(workspacePath, { recursive: true, force: true });
    }

    const prepareMode = this.options.localPackagesPrepareMode;
    if (prepareMode !== 'copy' && prepareMode !== 'link') {
      throw new Error(
        `Invalid --local-packages-prepare-mode value: ${prepareMode}. Allowed values: copy, link.`,
      );
    }

    if (prepareMode === 'copy') {
      this.logger.info(`[LocalAuthOverlay] Prepare step copy: ${sourcePath} -> ${workspacePath}`);
      fs.cpSync(sourcePath, workspacePath, { recursive: true, preserveTimestamps: true });
      return;
    }

    this.logger.info(`[LocalAuthOverlay] Prepare step link: ${sourcePath} -> ${workspacePath}`);
    DirectoryLinkOperator.create({ sourcePath, targetPath: workspacePath });
  }

  installDependencies(packageName, packagePath, preparationPlan) {
    if (!preparationPlan.install.required) {
      this.logger.info(
        `[LocalAuthOverlay] ${packageName}: skip install: ${preparationPlan.install.reason}`,
      );
      return;
    }

    this.logger.info(
      `[LocalAuthOverlay] ${packageName}: install required: ${preparationPlan.install.reason}`,
    );

    const command = this.preparationPolicy.resolveInstallCommand(packagePath);
    this.runNpmCommand({
      packageName,
      packagePath,
      args: [command],
      stepLabel: 'install',
    });
  }

  buildPackage(packageName, packagePath, preparationPlan) {
    if (!preparationPlan.build.required) {
      this.logger.info(
        `[LocalAuthOverlay] ${packageName}: skip build: ${preparationPlan.build.reason}`,
      );
      return;
    }

    this.logger.info(
      `[LocalAuthOverlay] ${packageName}: build required: ${preparationPlan.build.reason}`,
    );

    const packageJson = JSON.parse(fs.readFileSync(path.join(packagePath, 'package.json'), 'utf8'));
    if (!packageJson.scripts || !packageJson.scripts.build) {
      this.logger.info(
        `[LocalAuthOverlay] Build script not found for ${packageName}; skipping build.`,
      );
      return;
    }
    this.runNpmCommand({
      packageName,
      packagePath,
      args: ['run', 'build'],
      stepLabel: 'build',
    });
  }

  validateBuildArtifacts(packageName, packagePath) {
    const packageJsonPath = path.join(packagePath, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const distDir = path.join(packagePath, 'dist');
    const expectedEntries = this.collectEntryPoints(packageJson);

    if (fs.existsSync(distDir)) {
      this.logger.info(
        `[LocalAuthOverlay] Validate step passed for ${packageName}: dist directory exists.`,
      );
      return;
    }

    if (expectedEntries.length === 0) {
      throw new Error(
        `Validation failed for ${packageName} (${packagePath}): no dist directory and no export entry points to validate.`,
      );
    }

    const missingEntries = expectedEntries.filter(
      (entry) => !fs.existsSync(path.join(packagePath, entry)),
    );
    if (missingEntries.length > 0) {
      throw new Error(
        `Validation failed for ${packageName} (${packagePath}): missing entry points ${missingEntries.join(', ')}.`,
      );
    }

    this.logger.info(
      `[LocalAuthOverlay] Validate step passed for ${packageName}: export entry points exist.`,
    );
  }

  collectEntryPoints(packageJson) {
    const entries = new Set();
    const appendValue = (value) => {
      if (!value || typeof value !== 'string') {
        return;
      }
      if (value.startsWith('./')) {
        entries.add(value.slice(2));
      } else if (!path.isAbsolute(value) && !value.startsWith('../')) {
        entries.add(value);
      }
    };

    appendValue(packageJson.main);
    appendValue(packageJson.module);
    appendValue(packageJson.types);

    const walkExports = (candidate) => {
      if (!candidate) {
        return;
      }
      if (typeof candidate === 'string') {
        appendValue(candidate);
        return;
      }
      if (Array.isArray(candidate)) {
        candidate.forEach((entry) => walkExports(entry));
        return;
      }
      if (typeof candidate === 'object') {
        Object.values(candidate).forEach((entry) => walkExports(entry));
      }
    };

    walkExports(packageJson.exports);
    return Array.from(entries);
  }

  runNpmCommand({ packageName, packagePath, args, stepLabel }) {
    const commandString = `npm ${args.join(' ')}`;
    this.logger.info(
      `[LocalAuthOverlay] Prepare step ${stepLabel} for ${packageName}: ${commandString}`,
    );

    const status = this.npmCommandRunner.run({
      args,
      cwd: packagePath,
      stdio: 'inherit',
    });

    if (status.error || status.status !== 0) {
      const exitCode = typeof status.status === 'number' ? status.status : 'unknown';
      const errorDetails = status.error ? ` Error: ${status.error.message}.` : '';
      throw new Error(
        `Package preparation failed (${stepLabel}) for ${packageName}. Path: ${packagePath}. Command: ${commandString}. Exit code: ${exitCode}.${errorDetails}`,
      );
    }
  }

  ensureValidNpmPackage(packageName, sourcePath) {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Local package source path does not exist for ${packageName}: ${sourcePath}`);
    }
    const packageJsonPath = path.join(sourcePath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`Local package source does not look like an npm package: ${sourcePath}`);
    }
  }
}

class LocalPackageStateInspector {
  constructor({ fsModule = fs, pathModule = path } = {}) {
    this.fs = fsModule;
    this.path = pathModule;
  }

  hasDistDirectory(packagePath) {
    return this.fs.existsSync(this.path.join(packagePath, 'dist'));
  }

  hasNodeModulesDirectory(packagePath) {
    return this.fs.existsSync(this.path.join(packagePath, 'node_modules'));
  }

  isDistOutdated(packagePath) {
    const distPath = this.path.join(packagePath, 'dist');
    if (!this.fs.existsSync(distPath)) {
      return true;
    }

    const newestDistMTime = this.collectNewestMTime(distPath, {
      ignoredDirectories: new Set(['node_modules', '.git']),
      ignoredExtensions: new Set(),
      ignoredFileNames: new Set(),
    });
    const newestSourceMTime = this.collectNewestMTime(packagePath, {
      ignoredDirectories: new Set([
        'dist',
        'node_modules',
        '.git',
        'test',
        'tests',
        '__tests__',
        'docs',
        'doc',
        'coverage',
      ]),
      ignoredExtensions: new Set(['.md', '.markdown', '.txt']),
      ignoredFileNames: new Set(['pnpm-debug.log', 'npm-debug.log']),
    });

    return newestSourceMTime > newestDistMTime;
  }

  collectNewestMTime(startPath, { ignoredDirectories, ignoredExtensions, ignoredFileNames }) {
    if (!this.fs.existsSync(startPath)) {
      return 0;
    }

    let newest = this.fs.statSync(startPath).mtimeMs;
    const queue = [startPath];

    while (queue.length > 0) {
      const current = queue.shift();
      const entries = this.fs.readdirSync(current, { withFileTypes: true });
      entries.forEach((entry) => {
        const fullPath = this.path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (ignoredDirectories.has(entry.name)) {
            return;
          }
          queue.push(fullPath);
          return;
        }
        if (!entry.isFile()) {
          return;
        }
        const extension = this.path.extname(entry.name).toLowerCase();
        if (ignoredExtensions.has(extension) || ignoredFileNames.has(entry.name)) {
          return;
        }

        const stat = this.fs.statSync(fullPath);
        if (stat.mtimeMs > newest) {
          newest = stat.mtimeMs;
        }
      });
    }

    return newest;
  }
}

class LocalPackagePreparationPolicy {
  constructor({
    options,
    logger = console,
    stateInspector = new LocalPackageStateInspector(),
    fsModule = fs,
    pathModule = path,
  }) {
    this.options = options;
    this.logger = logger;
    this.stateInspector = stateInspector;
    this.fs = fsModule;
    this.path = pathModule;
  }

  captureSourceSnapshot(sourcePath) {
    const hasDist = this.stateInspector.hasDistDirectory(sourcePath);
    const isDistOutdated = hasDist ? this.stateInspector.isDistOutdated(sourcePath) : true;
    return { hasDist, isDistOutdated };
  }

  createPlan({ packageName, packagePath, sourceSnapshot = null }) {
    const snapshot = sourceSnapshot || this.captureSourceSnapshot(packagePath);
    const hasDist = snapshot.hasDist;
    const hasNodeModules = this.stateInspector.hasNodeModulesDirectory(packagePath);

    const build = this.evaluateBuild({
      hasDist,
      isDistOutdated: snapshot.isDistOutdated,
      packagePath,
    });
    const install = this.evaluateInstall({
      hasDist,
      hasNodeModules,
      buildRequired: build.required,
    });

    this.logger.info(
      `[LocalAuthOverlay] Policy for ${packageName}: install=${install.required ? 'run' : 'skip'}, build=${build.required ? 'run' : 'skip'}`,
    );

    return { install, build };
  }

  evaluateInstall({ hasDist, hasNodeModules, buildRequired }) {
    if (this.options.forceLocalPackageBuild) {
      return { required: true, reason: 'forced rebuild' };
    }

    if (!hasDist) {
      return { required: true, reason: 'dist missing' };
    }

    if (buildRequired && !hasNodeModules) {
      return { required: true, reason: 'build required and dependencies missing' };
    }

    if (!buildRequired && !hasNodeModules) {
      return { required: false, reason: 'dist exists and build not required' };
    }

    return { required: false, reason: 'dist exists and dependencies are available' };
  }

  evaluateBuild({ packagePath, hasDist, isDistOutdated }) {
    if (this.options.forceLocalPackageBuild) {
      return { required: true, reason: 'forced rebuild' };
    }

    if (this.options.skipLocalPackageBuild) {
      if (hasDist) {
        return { required: false, reason: 'flag enabled and dist exists' };
      }

      throw new Error(
        `Package preparation policy failed: build skipped but dist artifacts are missing. Package path: ${packagePath}. Use --force-local-package-build or prepare dist before using --skip-local-package-build.`,
      );
    }

    if (!hasDist) {
      return { required: true, reason: 'dist missing' };
    }

    if (isDistOutdated) {
      return { required: true, reason: 'dist outdated' };
    }

    return { required: false, reason: 'dist exists and up-to-date' };
  }

  resolveInstallCommand(packagePath) {
    const lockFilePath = this.path.join(packagePath, 'package-lock.json');
    const shrinkwrapPath = this.path.join(packagePath, 'npm-shrinkwrap.json');
    return this.fs.existsSync(lockFilePath) || this.fs.existsSync(shrinkwrapPath)
      ? 'ci'
      : 'install';
  }
}

class LocalPackageLinker {
  constructor({ projectRoot, logger = console }) {
    this.projectRoot = projectRoot;
    this.logger = logger;
    this.linkedTargets = [];
  }

  apply(targets) {
    if (!targets || targets.length === 0) {
      return;
    }

    for (const target of targets) {
      this.linkTarget(target);
    }
  }

  restore() {
    for (let index = this.linkedTargets.length - 1; index >= 0; index -= 1) {
      const linked = this.linkedTargets[index];
      if (fs.existsSync(linked.packagePath)) {
        fs.rmSync(linked.packagePath, { recursive: true, force: true });
      }
      if (linked.backupPath && fs.existsSync(linked.backupPath)) {
        fs.renameSync(linked.backupPath, linked.packagePath);
      }
      this.logger.info(`[LocalAuthOverlay] Restored package: ${linked.packageName}`);
    }
    this.linkedTargets = [];
  }

  linkTarget({ packageName, sourcePath }) {
    const sourcePackageJson = path.join(sourcePath, 'package.json');
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Local package source path does not exist: ${sourcePath}`);
    }
    if (!fs.existsSync(sourcePackageJson)) {
      throw new Error(`Local package source does not look like an npm package: ${sourcePath}`);
    }

    const packagePath = path.join(this.projectRoot, 'node_modules', packageName);
    fs.mkdirSync(path.dirname(packagePath), { recursive: true });

    let backupPath = null;
    if (fs.existsSync(packagePath)) {
      backupPath = `${packagePath}.overlay-backup-${Date.now()}`;
      fs.renameSync(packagePath, backupPath);
    }

    DirectoryLinkOperator.create({ sourcePath, targetPath: packagePath });
    this.linkedTargets.push({ packageName, packagePath, backupPath });
    this.logger.info(`[LocalAuthOverlay] Linked package ${packageName} -> ${sourcePath}`);
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
    this.localPackageLinker = new LocalPackageLinker({ projectRoot });
    this.localPackageWorkspaceManager = new LocalPackageWorkspaceManager({
      projectRoot,
      options,
    });
  }

  printHelp() {
    console.log(
      `Local Auth Overlay for Hugo\n\nUsage:\n  node tests/local-auth-overlay/scripts/local-auth-overlay.js [hugo args] [--local-auth-key KEY]\n\nExamples:\n  node tests/local-auth-overlay/scripts/local-auth-overlay.js server -D --local-auth-key dev-key\n  node tests/local-auth-overlay/scripts/local-auth-overlay.js --minify --local-auth-key dev-key\n  node tests/local-auth-overlay/scripts/local-auth-overlay.js server -D\n\nLocal packages:
  --local-packages all
  --local-packages @interdead/framework,@interdead/identity-core
  --local-packages-root ../InterDeadCore
  --local-packages-workspace tests/local-auth-overlay/packages-workspace
  --local-packages-prepare-mode copy
  --skip-local-package-build
  --force-local-package-build
  --cleanup-local-packages-workspace
  --local-package-audit off
  --local-package-audit-level moderate
  --local-package-map @interdead/framework=/absolute/or/relative/path

Behavior:
  - Without --local-auth-key: command is proxied to Hugo unchanged.
  - With --local-auth-key: output is isolated to tests/local-auth-overlay/public and overlay auth is injected.
  - Local packages are prepared in a workspace and only then linked into InterDeadIT/node_modules.
  - Local package audit mode defaults to off and never performs dependency mutations.
  - Linked packages are restored after command exit; workspace cleanup is optional via flag.`,
    );
  }

  ensureHugoAvailable() {
    const check = spawnSync('hugo', ['version'], { cwd: this.projectRoot, stdio: 'ignore' });
    if (check.status !== 0) {
      throw new Error('Hugo binary is not available in PATH.');
    }
  }

  applyLocalPackagesIfRequested() {
    if (!this.options.hasLocalPackageSelection()) {
      return;
    }

    const targets = new LocalPackageResolver({
      projectRoot: this.projectRoot,
      options: this.options,
    }).resolveTargets();

    if (targets.length === 0) {
      return;
    }

    const preparedTargets = this.localPackageWorkspaceManager.prepare(targets);
    this.localPackageLinker.apply(preparedTargets);
  }

  restoreLocalPackages() {
    this.localPackageLinker.restore();
    this.localPackageWorkspaceManager.cleanupWorkspaceIfRequested();
  }

  run() {
    if (this.options.help) {
      this.printHelp();
      return;
    }

    this.ensureHugoAvailable();
    this.applyLocalPackagesIfRequested();

    try {
      if (!this.options.localAuthKey) {
        this.execPassthrough();
        return;
      }

      const session = new OverlayConfig({
        projectRoot: this.projectRoot,
        options: this.options,
      }).load();

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
        this.restoreLocalPackages();
        process.exit(status.status || 1);
      }

      injector.inject();
      console.log('[LocalAuthOverlay] Overlay injected into isolated output:', this.outputDir);
      this.restoreLocalPackages();
    } catch (error) {
      this.restoreLocalPackages();
      throw error;
    }
  }

  execPassthrough() {
    const status = spawnSync('hugo', this.options.hugoArgs, {
      cwd: this.projectRoot,
      stdio: 'inherit',
    });
    this.restoreLocalPackages();
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

    let restored = false;
    const restoreOnce = () => {
      if (restored) {
        return;
      }
      restored = true;
      this.restoreLocalPackages();
    };

    const shutdown = (signal) => {
      clearInterval(timer);
      if (!hugo.killed) {
        hugo.kill(signal);
      }
      restoreOnce();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    hugo.on('exit', (code) => {
      clearInterval(timer);
      restoreOnce();
      process.exit(code || 0);
    });
  }
}

module.exports = {
  KNOWN_LOCAL_PACKAGES,
  DirectoryLinkOperator,
  NpmCommandRunner,
  CliOptions,
  LocalPackageResolver,
  LocalPackageLinker,
  LocalPackageAuditPolicy,
  LocalPackageAuditRunner,
  LocalPackageWorkspaceManager,
  LocalAuthOverlayRunner,
};

if (require.main === module) {
  const runner = new LocalAuthOverlayRunner({
    projectRoot: process.cwd(),
    options: new CliOptions(process.argv),
  });

  try {
    runner.run();
  } catch (error) {
    runner.restoreLocalPackages?.();
    console.error('[LocalAuthOverlay] Failed to execute', error.message);
    process.exit(1);
  }
}
