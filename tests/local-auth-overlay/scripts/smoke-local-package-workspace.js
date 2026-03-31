#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  KNOWN_LOCAL_PACKAGES,
  CliOptions,
  LocalPackageResolver,
  LocalPackageLinker,
  LocalPackageWorkspaceManager,
  NpmCommandRunner,
} = require('./local-auth-overlay');

class SmokeAsserts {
  static ok(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }
}

class SmokeFixtureBuilder {
  constructor() {
    this.sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'local-auth-overlay-smoke-'));
    this.projectRoot = path.join(this.sandboxRoot, 'InterDeadIT');
    this.interDeadCoreRoot = path.join(this.sandboxRoot, 'InterDeadCore');
    this.packageNames = Object.keys(KNOWN_LOCAL_PACKAGES);
  }

  setup() {
    fs.mkdirSync(this.projectRoot, { recursive: true });
    fs.mkdirSync(this.interDeadCoreRoot, { recursive: true });
    this.createSourcePackages();
    this.createExistingNodeModulesPackages();
    return this;
  }

  teardown() {
    fs.rmSync(this.sandboxRoot, { recursive: true, force: true });
  }

  createSourcePackages() {
    this.packageNames.forEach((packageName) => {
      const packageFolder = KNOWN_LOCAL_PACKAGES[packageName];
      const packagePath = path.join(this.interDeadCoreRoot, packageFolder);
      this.writeJson(path.join(packagePath, 'package.json'), {
        name: packageName,
        version: '0.0.0-smoke',
        scripts: {
          build: "node -e \"require('fs').mkdirSync('dist',{recursive:true}); require('fs').writeFileSync('dist/index.js','module.exports={ok:true};')\"",
        },
        main: './dist/index.js',
        exports: './dist/index.js',
      });
    });
  }

  createExistingNodeModulesPackages() {
    this.packageNames.forEach((packageName) => {
      const existingPackagePath = path.join(this.projectRoot, 'node_modules', ...packageName.split('/'));
      fs.mkdirSync(existingPackagePath, { recursive: true });
      fs.writeFileSync(path.join(existingPackagePath, 'restore-marker.txt'), `existing-${packageName}`, 'utf8');
    });
  }

  writeJson(filePath, value) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
  }
}

class FakeAuditPolicy {
  constructor({ mode, threshold = 'moderate' }) {
    this.mode = mode;
    this.threshold = threshold;
  }

  resolve() {
    return {
      mode: this.mode,
      threshold: this.threshold,
      shouldRun: this.mode !== 'off',
      blocking: this.mode === 'strict',
    };
  }
}

class FakeAuditRunner {
  constructor({ counts }) {
    this.counts = counts;
    this.runCount = 0;
    this.thresholdWeight = { low: 1, moderate: 2, high: 3, critical: 4 };
  }

  run({ threshold }) {
    this.runCount += 1;
    const thresholdScore = this.thresholdWeight[threshold] || this.thresholdWeight.moderate;
    const thresholdExceeded = ['moderate', 'high', 'critical'].some((level) => {
      const score = this.thresholdWeight[level];
      return score >= thresholdScore && Number(this.counts[level] || 0) > 0;
    });

    return {
      commandString: 'npm audit --json',
      counts: this.counts,
      thresholdExceeded,
      rawExitCode: thresholdExceeded ? 1 : 0,
    };
  }
}

class LocalPackageWorkspaceFlowSmokeTest {
  run() {
    const fixture = new SmokeFixtureBuilder().setup();

    try {
      const options = new CliOptions([
        'node',
        'local-auth-overlay.js',
        '--local-packages',
        'all',
        '--local-packages-root',
        '../InterDeadCore',
        '--cleanup-local-packages-workspace',
      ]);

      const targets = new LocalPackageResolver({
        projectRoot: fixture.projectRoot,
        options,
      }).resolveTargets();

      SmokeAsserts.ok(
        targets.length === fixture.packageNames.length,
        'Expected resolver to return all known local packages.',
      );

      const workspaceManager = new LocalPackageWorkspaceManager({
        projectRoot: fixture.projectRoot,
        options,
      });
      const preparedTargets = workspaceManager.prepare(targets);

      preparedTargets.forEach((target) => {
        SmokeAsserts.ok(
          fs.existsSync(path.join(target.sourcePath, 'package.json')),
          `Prepared package.json is missing for ${target.packageName}.`,
        );
        SmokeAsserts.ok(
          fs.existsSync(path.join(target.sourcePath, 'dist', 'index.js')),
          `Prepared build artifact is missing for ${target.packageName}.`,
        );
      });

      const linker = new LocalPackageLinker({ projectRoot: fixture.projectRoot });
      linker.apply(preparedTargets);

      preparedTargets.forEach((target) => {
        const linkedPath = path.join(fixture.projectRoot, 'node_modules', ...target.packageName.split('/'));
        SmokeAsserts.ok(
          fs.lstatSync(linkedPath).isSymbolicLink(),
          `Expected linked package to be a symlink for ${target.packageName}.`,
        );
        SmokeAsserts.ok(
          fs.realpathSync(linkedPath) === fs.realpathSync(target.sourcePath),
          `Expected symlink target to match prepared package for ${target.packageName}.`,
        );
      });

      linker.restore();
      fixture.packageNames.forEach((packageName) => {
        const restoredPath = path.join(fixture.projectRoot, 'node_modules', ...packageName.split('/'));
        SmokeAsserts.ok(
          fs.existsSync(path.join(restoredPath, 'restore-marker.txt')),
          `Original package was not restored for ${packageName}.`,
        );
      });

      workspaceManager.cleanupWorkspaceIfRequested();
      SmokeAsserts.ok(
        !fs.existsSync(path.join(fixture.projectRoot, 'tests', 'local-auth-overlay', 'packages-workspace')),
        'Workspace cleanup flag did not remove workspace directory.',
      );

      this.runAuditModeChecks(fixture);
      this.runNpmCommandRunnerChecks();

      console.log('[Smoke] Workspace prepare/link/restore flow completed successfully for all known packages.');
    } finally {
      fixture.teardown();
    }
  }


  runNpmCommandRunnerChecks() {
    const spawnCalls = [];
    const spawnSyncStub = (command, commandArgs) => {
      spawnCalls.push({ command, commandArgs });
      return { status: 0 };
    };

    const originalComspec = process.env.comspec;
    process.env.comspec = 'C:\\Windows\\System32\\cmd.exe';

    try {
      const windowsRunner = new NpmCommandRunner({
        platform: 'win32',
        spawnSyncFn: spawnSyncStub,
      });
      const linuxRunner = new NpmCommandRunner({
        platform: 'linux',
        spawnSyncFn: spawnSyncStub,
      });

      SmokeAsserts.ok(
        windowsRunner.resolveExecutable() === 'npm.cmd',
        'Expected NpmCommandRunner to resolve npm.cmd on win32 platform.',
      );
      SmokeAsserts.ok(
        linuxRunner.resolveExecutable() === 'npm',
        'Expected NpmCommandRunner to resolve npm on non-win32 platform.',
      );

      windowsRunner.run({ args: ['ci'], cwd: process.cwd() });
      linuxRunner.run({ args: ['ci'], cwd: process.cwd() });

      SmokeAsserts.ok(
        spawnCalls[0].command === process.env.comspec,
        'Expected Windows npm command to execute through COMSPEC/cmd.exe.',
      );
      SmokeAsserts.ok(
        JSON.stringify(spawnCalls[0].commandArgs.slice(0, 4)) === JSON.stringify(['/d', '/s', '/c', 'npm.cmd']),
        'Expected Windows npm command args to start with /d /s /c npm.cmd.',
      );
      SmokeAsserts.ok(
        spawnCalls[0].commandArgs[4] === 'ci',
        'Expected Windows npm command to keep original npm args.',
      );
      SmokeAsserts.ok(
        spawnCalls[1].command === 'npm',
        'Expected non-Windows npm command to execute npm directly.',
      );
      SmokeAsserts.ok(
        JSON.stringify(spawnCalls[1].commandArgs) === JSON.stringify(['ci']),
        'Expected non-Windows npm command args to be passed unchanged.',
      );
    } finally {
      if (typeof originalComspec === 'undefined') {
        delete process.env.comspec;
      } else {
        process.env.comspec = originalComspec;
      }
    }
  }

  runAuditModeChecks(fixture) {
    const packageName = fixture.packageNames[0];
    const target = {
      packageName,
      fromOverride: false,
      sourcePath: path.join(fixture.interDeadCoreRoot, KNOWN_LOCAL_PACKAGES[packageName]),
    };

    const offRunner = new FakeAuditRunner({
      counts: { low: 0, moderate: 1, high: 0, critical: 0, total: 1 },
    });
    const offManager = new LocalPackageWorkspaceManager({
      projectRoot: fixture.projectRoot,
      options: new CliOptions(['node', 'local-auth-overlay.js']),
      localPackageAuditPolicy: new FakeAuditPolicy({ mode: 'off' }),
      localPackageAuditRunner: offRunner,
    });
    offManager.prepareTarget(target);
    SmokeAsserts.ok(offRunner.runCount === 0, 'Expected audit to be skipped in off mode.');

    const reportRunner = new FakeAuditRunner({
      counts: { low: 0, moderate: 2, high: 0, critical: 0, total: 2 },
    });
    const reportManager = new LocalPackageWorkspaceManager({
      projectRoot: fixture.projectRoot,
      options: new CliOptions(['node', 'local-auth-overlay.js']),
      localPackageAuditPolicy: new FakeAuditPolicy({ mode: 'report' }),
      localPackageAuditRunner: reportRunner,
    });
    reportManager.prepareTarget(target);
    SmokeAsserts.ok(reportRunner.runCount === 1, 'Expected audit to run in report mode.');

    const strictPassRunner = new FakeAuditRunner({
      counts: { low: 0, moderate: 2, high: 0, critical: 0, total: 2 },
    });
    const strictPassManager = new LocalPackageWorkspaceManager({
      projectRoot: fixture.projectRoot,
      options: new CliOptions(['node', 'local-auth-overlay.js']),
      localPackageAuditPolicy: new FakeAuditPolicy({ mode: 'strict', threshold: 'high' }),
      localPackageAuditRunner: strictPassRunner,
    });
    strictPassManager.prepareTarget(target);
    SmokeAsserts.ok(
      strictPassRunner.runCount === 1,
      'Expected strict mode audit to run even when threshold is not exceeded.',
    );

    const strictFailRunner = new FakeAuditRunner({
      counts: { low: 0, moderate: 0, high: 1, critical: 0, total: 1 },
    });
    const strictFailManager = new LocalPackageWorkspaceManager({
      projectRoot: fixture.projectRoot,
      options: new CliOptions(['node', 'local-auth-overlay.js']),
      localPackageAuditPolicy: new FakeAuditPolicy({ mode: 'strict', threshold: 'high' }),
      localPackageAuditRunner: strictFailRunner,
    });

    let strictFailed = false;
    try {
      strictFailManager.prepareTarget(target);
    } catch (error) {
      strictFailed = error.message.includes('blocked by local package audit');
    }

    SmokeAsserts.ok(strictFailed, 'Expected strict mode to fail when findings exceed threshold.');
  }
}

try {
  new LocalPackageWorkspaceFlowSmokeTest().run();
} catch (error) {
  console.error('[Smoke] Failed:', error.message);
  process.exit(1);
}
