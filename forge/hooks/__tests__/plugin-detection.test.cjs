'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOOKS_DIR = path.join(__dirname, '..');
const HOOKS_LIB_DIR = path.join(HOOKS_DIR, 'lib');
const libPath = path.join(HOOKS_LIB_DIR, 'plugin-detection.cjs');

function clearCache() {
  delete require.cache[require.resolve(libPath)];
}

describe('hooks/lib/plugin-detection.cjs — extracted module', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-pd-test-'));
    clearCache();
  });

  afterEach(() => {
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
    clearCache();
  });

  describe('module exports', () => {
    it('exports detectDistribution, scanPluginInstallations, isPluginEnabled', () => {
      const mod = require(libPath);
      assert.strictEqual(typeof mod.detectDistribution, 'function');
      assert.strictEqual(typeof mod.scanPluginInstallations, 'function');
      assert.strictEqual(typeof mod.isPluginEnabled, 'function');
    });
  });

  describe('detectDistribution()', () => {
    it('returns forge@forge for cache paths', () => {
      const { detectDistribution } = require(libPath);
      assert.strictEqual(detectDistribution('/home/user/.claude/plugins/cache/forge/forge'), 'forge@forge');
    });

    it('returns forge@skillforge for skillforge cache paths', () => {
      const { detectDistribution } = require(libPath);
      assert.strictEqual(detectDistribution('/home/user/.claude/plugins/cache/skillforge/forge/forge'), 'forge@skillforge');
    });

    it('returns forge@skillforge for skillforge marketplaces paths', () => {
      const { detectDistribution } = require(libPath);
      assert.strictEqual(detectDistribution('/home/user/.claude/plugins/marketplaces/skillforge/forge/forge'), 'forge@skillforge');
    });

    it('returns forge@forge for unknown paths', () => {
      const { detectDistribution } = require(libPath);
      assert.strictEqual(detectDistribution('/some/random/path'), 'forge@forge');
    });
  });

  describe('isPluginEnabled()', () => {
    it('returns true when no settings files exist', () => {
      const { isPluginEnabled } = require(libPath);
      assert.strictEqual(isPluginEnabled('/fake/path', 'user', testDir, testDir), true);
    });

    it('returns false when disablePlugin is true in user settings', () => {
      const settingsPath = path.join(testDir, '.claude', 'settings.json');
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify({ disablePlugin: true }));
      const { isPluginEnabled } = require(libPath);
      assert.strictEqual(isPluginEnabled('/fake/path', 'user', testDir, testDir), false);
    });

    it('returns false when plugins.forge is false in user settings', () => {
      const settingsPath = path.join(testDir, '.claude', 'settings.json');
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify({ plugins: { forge: false } }));
      const { isPluginEnabled } = require(libPath);
      assert.strictEqual(isPluginEnabled('/fake/path', 'user', testDir, testDir), false);
    });

    it('returns false when disablePlugin is true in project settings', () => {
      const projectDir = path.join(testDir, 'project');
      const settingsPath = path.join(projectDir, '.claude', 'settings.local.json');
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify({ disablePlugin: true }));
      const { isPluginEnabled } = require(libPath);
      assert.strictEqual(isPluginEnabled('/fake/path', 'project', testDir, projectDir), false);
    });

    it('returns true when settings file is malformed (non-fatal)', () => {
      const settingsPath = path.join(testDir, '.claude', 'settings.json');
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, '{ invalid json');
      const { isPluginEnabled } = require(libPath);
      assert.strictEqual(isPluginEnabled('/fake/path', 'user', testDir, testDir), true);
    });
  });

  describe('scanPluginInstallations()', () => {
    it('returns empty array when no installations exist', () => {
      const { scanPluginInstallations } = require(libPath);
      const result = scanPluginInstallations({ homeDir: testDir, cwd: testDir });
      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 0);
    });

    it('detects single user-scope installation correctly', () => {
      const userHomeDir = path.join(testDir, 'home');
      const userCwd = path.join(testDir, 'work');
      fs.mkdirSync(userHomeDir, { recursive: true });
      fs.mkdirSync(userCwd, { recursive: true });

      const pluginPath = path.join(userHomeDir, '.claude', 'plugins', 'cache', 'forge', 'forge', '.claude-plugin');
      fs.mkdirSync(pluginPath, { recursive: true });
      fs.writeFileSync(path.join(pluginPath, 'plugin.json'), JSON.stringify({
        name: 'forge', version: '0.49.0',
      }));

      const { scanPluginInstallations } = require(libPath);
      const result = scanPluginInstallations({ homeDir: userHomeDir, cwd: userCwd });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].version, '0.49.0');
      assert.strictEqual(result[0].scope, 'user');
      assert.strictEqual(result[0].enabled, true);
    });

    it('detects forge@skillforge distribution', () => {
      const skillforgePath = path.join(testDir, '.claude', 'plugins', 'cache', 'skillforge', 'forge', 'forge', '.claude-plugin');
      fs.mkdirSync(skillforgePath, { recursive: true });
      fs.writeFileSync(path.join(skillforgePath, 'plugin.json'), JSON.stringify({ name: 'forge', version: '0.49.0' }));

      const { scanPluginInstallations } = require(libPath);
      const result = scanPluginInstallations({ homeDir: testDir, cwd: testDir });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].distribution, 'forge@skillforge');
    });

    it('handles missing plugin.json gracefully', () => {
      const brokenPath = path.join(testDir, '.claude', 'plugins', 'cache', 'forge', 'forge');
      fs.mkdirSync(brokenPath, { recursive: true });
      const { scanPluginInstallations } = require(libPath);
      const result = scanPluginInstallations({ homeDir: testDir, cwd: testDir });
      assert.strictEqual(result.length, 0);
    });

    it('deduplicates installations at the same path', () => {
      const pluginPath = path.join(testDir, '.claude', 'plugins', 'cache', 'forge', 'forge', '.claude-plugin');
      fs.mkdirSync(pluginPath, { recursive: true });
      fs.writeFileSync(path.join(pluginPath, 'plugin.json'), JSON.stringify({ name: 'forge', version: '0.49.0' }));

      const { scanPluginInstallations } = require(libPath);
      const result = scanPluginInstallations({ homeDir: testDir, cwd: testDir });
      assert.strictEqual(result.length, 1);
    });
  });
});
