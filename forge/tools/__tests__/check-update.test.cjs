'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Load the hook module to test exported functions
const hookPath = path.join(__dirname, '..', '..', 'hooks', 'check-update.js');

describe('check-update.js — Multi-plugin scanning', () => {
  let testDir;
  let originalHomedir;
  let originalCwd;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-test-'));
    originalHomedir = os.homedir;
    originalCwd = process.cwd;
  });

  afterEach(() => {
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
    os.homedir = originalHomedir;
    process.cwd = originalCwd;
  });

  describe('scanPluginInstallations()', () => {
    it('returns empty array when no installations exist', () => {
      delete require.cache[require.resolve(hookPath)];
      const { scanPluginInstallations } = require(hookPath);

      const result = scanPluginInstallations({ homeDir: testDir, cwd: testDir });
      assert.strictEqual(Array.isArray(result), true);
      assert.strictEqual(result.length, 0);
    });

    it('detects single installation correctly', () => {
      // Create user-scope install under homeDir (not under cwd)
      const userHomeDir = path.join(testDir, 'home');
      const userCwd = path.join(testDir, 'work');
      fs.mkdirSync(userHomeDir, { recursive: true });
      fs.mkdirSync(userCwd, { recursive: true });

      const pluginPath = path.join(userHomeDir, '.claude', 'plugins', 'cache', 'forge', 'forge', '.claude-plugin');
      fs.mkdirSync(pluginPath, { recursive: true });
      fs.writeFileSync(path.join(pluginPath, 'plugin.json'), JSON.stringify({
        name: 'forge',
        version: '0.23.0',
        updateUrl: 'https://example.com/plugin.json',
      }));

      delete require.cache[require.resolve(hookPath)];
      const { scanPluginInstallations } = require(hookPath);

      const result = scanPluginInstallations({ homeDir: userHomeDir, cwd: userCwd });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].version, '0.23.0');
      assert.strictEqual(result[0].scope, 'user');
      assert.strictEqual(result[0].enabled, true);
    });

    it('detects both user-scope and project-scope installations', () => {
      // User-scope install
      const userPath = path.join(testDir, '.claude', 'plugins', 'cache', 'forge', 'forge', '.claude-plugin');
      fs.mkdirSync(userPath, { recursive: true });
      fs.writeFileSync(path.join(userPath, 'plugin.json'), JSON.stringify({
        name: 'forge',
        version: '0.23.0',
      }));

      // Project-scope install (different temp dir to simulate separate location)
      const projectPath = path.join(testDir, 'project', '.claude', 'plugins', 'cache', 'forge', 'forge', '.claude-plugin');
      fs.mkdirSync(projectPath, { recursive: true });
      fs.writeFileSync(path.join(projectPath, 'plugin.json'), JSON.stringify({
        name: 'forge',
        version: '0.22.0',
      }));

      delete require.cache[require.resolve(hookPath)];
      const { scanPluginInstallations } = require(hookPath);

      // Pass injected paths — no need to mock os.homedir/process.cwd
      const result = scanPluginInstallations({ homeDir: testDir, cwd: path.join(testDir, 'project') });
      assert.strictEqual(result.length, 2);
      const userInst = result.find(i => i.scope === 'user');
      const projInst = result.find(i => i.scope === 'project');
      assert.ok(userInst);
      assert.ok(projInst);
      assert.strictEqual(userInst.version, '0.23.0');
      assert.strictEqual(projInst.version, '0.22.0');
    });

    it('detects forge@skillforge distribution correctly', () => {
      const skillforgePath = path.join(testDir, '.claude', 'plugins', 'cache', 'skillforge', 'forge', 'forge', '.claude-plugin');
      fs.mkdirSync(skillforgePath, { recursive: true });
      fs.writeFileSync(path.join(skillforgePath, 'plugin.json'), JSON.stringify({
        name: 'forge',
        version: '0.23.0',
      }));

      delete require.cache[require.resolve(hookPath)];
      const { scanPluginInstallations } = require(hookPath);

      const result = scanPluginInstallations({ homeDir: testDir, cwd: testDir });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].distribution, 'forge@skillforge');
    });

    it('respects disabled plugin in user settings', () => {
      const pluginPath = path.join(testDir, '.claude', 'plugins', 'cache', 'forge', 'forge', '.claude-plugin');
      fs.mkdirSync(pluginPath, { recursive: true });
      fs.writeFileSync(path.join(pluginPath, 'plugin.json'), JSON.stringify({
        name: 'forge',
        version: '0.23.0',
      }));

      // Create settings with plugin disabled
      const settingsPath = path.join(testDir, '.claude', 'settings.json');
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify({
        disablePlugin: true,
      }));

      delete require.cache[require.resolve(hookPath)];
      const { scanPluginInstallations } = require(hookPath);

      const result = scanPluginInstallations({ homeDir: testDir, cwd: testDir });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].enabled, false);
    });

    it('handles missing plugin.json gracefully', () => {
      // Create directory structure but no plugin.json
      const brokenPath = path.join(testDir, '.claude', 'plugins', 'cache', 'forge', 'forge');
      fs.mkdirSync(brokenPath, { recursive: true });

      delete require.cache[require.resolve(hookPath)];
      const { scanPluginInstallations } = require(hookPath);

      const result = scanPluginInstallations({ homeDir: testDir, cwd: testDir });
      assert.strictEqual(result.length, 0); // No crash, just empty
    });

    it('deduplicates installations', () => {
      const pluginPath = path.join(testDir, '.claude', 'plugins', 'cache', 'forge', 'forge', '.claude-plugin');
      fs.mkdirSync(pluginPath, { recursive: true });
      fs.writeFileSync(path.join(pluginPath, 'plugin.json'), JSON.stringify({
        name: 'forge',
        version: '0.23.0',
      }));

      delete require.cache[require.resolve(hookPath)];
      const { scanPluginInstallations } = require(hookPath);

      const result = scanPluginInstallations({ homeDir: testDir, cwd: testDir });
      assert.strictEqual(result.length, 1); // Not 2 or more
    });
  });

  describe('isPluginEnabled()', () => {
    it('returns true when no settings files exist', () => {
      delete require.cache[require.resolve(hookPath)];
      const { isPluginEnabled } = require(hookPath);

      const result = isPluginEnabled('/fake/path', 'user', testDir, testDir);
      assert.strictEqual(result, true);
    });

    it('returns false when disablePlugin is true in user settings', () => {
      const settingsPath = path.join(testDir, '.claude', 'settings.json');
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify({ disablePlugin: true }));

      delete require.cache[require.resolve(hookPath)];
      const { isPluginEnabled } = require(hookPath);

      const result = isPluginEnabled('/fake/path', 'user', testDir, testDir);
      assert.strictEqual(result, false);
    });

    it('returns false when plugins.forge is false in user settings', () => {
      const settingsPath = path.join(testDir, '.claude', 'settings.json');
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify({
        plugins: { forge: false },
      }));

      delete require.cache[require.resolve(hookPath)];
      const { isPluginEnabled } = require(hookPath);

      const result = isPluginEnabled('/fake/path', 'user', testDir, testDir);
      assert.strictEqual(result, false);
    });

    it('returns false when disablePlugin is true in project settings', () => {
      const projectDir = path.join(testDir, 'project');
      const settingsPath = path.join(projectDir, '.claude', 'settings.local.json');
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify({ disablePlugin: true }));

      delete require.cache[require.resolve(hookPath)];
      const { isPluginEnabled } = require(hookPath);

      const result = isPluginEnabled('/fake/path', 'project', testDir, projectDir);
      assert.strictEqual(result, false);
    });

    it('returns true when settings file is malformed (non-fatal)', () => {
      const settingsPath = path.join(testDir, '.claude', 'settings.json');
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, '{ invalid json');

      delete require.cache[require.resolve(hookPath)];
      const { isPluginEnabled } = require(hookPath);

      const result = isPluginEnabled('/fake/path', 'user', testDir, testDir);
      assert.strictEqual(result, true); // Non-fatal, defaults to true
    });
  });

  describe('detectDistribution()', () => {
    it('returns forge@forge for cache paths', () => {
      delete require.cache[require.resolve(hookPath)];
      const { detectDistribution } = require(hookPath);

      assert.strictEqual(detectDistribution('/home/user/.claude/plugins/cache/forge/forge'), 'forge@forge');
    });

    it('returns forge@skillforge for skillforge cache paths', () => {
      delete require.cache[require.resolve(hookPath)];
      const { detectDistribution } = require(hookPath);

      assert.strictEqual(detectDistribution('/home/user/.claude/plugins/cache/skillforge/forge/forge'), 'forge@skillforge');
    });

    it('returns forge@skillforge for skillforge marketplaces paths', () => {
      delete require.cache[require.resolve(hookPath)];
      const { detectDistribution } = require(hookPath);

      assert.strictEqual(detectDistribution('/home/user/.claude/plugins/marketplaces/skillforge/forge/forge'), 'forge@skillforge');
    });
  });
});
