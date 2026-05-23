'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOOKS_LIB_DIR = path.join(__dirname, '..', 'lib');
const libPath = path.join(HOOKS_LIB_DIR, 'update-url.cjs');

const FALLBACK_URL = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';

function clearCache() {
  delete require.cache[require.resolve(libPath)];
}

describe('hooks/lib/update-url.cjs — extracted module', () => {
  let testDir;
  let originalPluginRoot;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-url-test-'));
    originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
    clearCache();
  });

  afterEach(() => {
    if (originalPluginRoot === undefined) {
      delete process.env.CLAUDE_PLUGIN_ROOT;
    } else {
      process.env.CLAUDE_PLUGIN_ROOT = originalPluginRoot;
    }
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
    clearCache();
  });

  describe('module exports', () => {
    it('exports FALLBACK_UPDATE_URL, ALLOWED_DOMAINS, validateUpdateUrl, getUpdateUrl', () => {
      const mod = require(libPath);
      assert.strictEqual(typeof mod.FALLBACK_UPDATE_URL, 'string');
      assert.ok(Array.isArray(mod.ALLOWED_DOMAINS));
      assert.strictEqual(typeof mod.validateUpdateUrl, 'function');
      assert.strictEqual(typeof mod.getUpdateUrl, 'function');
    });

    it('FALLBACK_UPDATE_URL points to raw.githubusercontent.com', () => {
      const { FALLBACK_UPDATE_URL } = require(libPath);
      assert.ok(FALLBACK_UPDATE_URL.startsWith('https://raw.githubusercontent.com/'));
    });

    it('ALLOWED_DOMAINS includes raw.githubusercontent.com', () => {
      const { ALLOWED_DOMAINS } = require(libPath);
      assert.ok(ALLOWED_DOMAINS.includes('raw.githubusercontent.com'));
    });
  });

  describe('validateUpdateUrl()', () => {
    it('allows raw.githubusercontent.com URLs', () => {
      const { validateUpdateUrl } = require(libPath);
      const url = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';
      assert.strictEqual(validateUpdateUrl(url), url);
    });

    it('rejects URLs with non-allowed domains and returns fallback', () => {
      const { validateUpdateUrl } = require(libPath);
      assert.strictEqual(validateUpdateUrl('https://evil.com/payload'), FALLBACK_URL);
    });

    it('rejects malformed URLs and returns fallback', () => {
      const { validateUpdateUrl } = require(libPath);
      assert.strictEqual(validateUpdateUrl('not-a-url'), FALLBACK_URL);
    });

    it('rejects subdomain spoofing and returns fallback', () => {
      const { validateUpdateUrl } = require(libPath);
      assert.strictEqual(validateUpdateUrl('https://evil.raw.githubusercontent.com.evil.com/steal'), FALLBACK_URL);
    });
  });

  describe('getUpdateUrl()', () => {
    it('returns FALLBACK_UPDATE_URL when CLAUDE_PLUGIN_ROOT is unset', () => {
      delete process.env.CLAUDE_PLUGIN_ROOT;
      clearCache();
      const { getUpdateUrl } = require(libPath);
      const result = getUpdateUrl();
      assert.strictEqual(result, FALLBACK_URL);
    });

    it('returns FALLBACK_UPDATE_URL when plugin.json is missing', () => {
      process.env.CLAUDE_PLUGIN_ROOT = testDir;
      clearCache();
      const { getUpdateUrl } = require(libPath);
      const result = getUpdateUrl();
      assert.strictEqual(result, FALLBACK_URL);
    });

    it('reads updateUrl from plugin.json when CLAUDE_PLUGIN_ROOT is valid', () => {
      const pluginDir = path.join(testDir, '.claude-plugin');
      fs.mkdirSync(pluginDir, { recursive: true });
      const customUrl = 'https://raw.githubusercontent.com/Entelligentsia/forge/release/forge/.claude-plugin/plugin.json';
      fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify({
        version: '0.49.0',
        updateUrl: customUrl,
      }));
      process.env.CLAUDE_PLUGIN_ROOT = testDir;
      clearCache();
      const { getUpdateUrl } = require(libPath);
      const result = getUpdateUrl();
      assert.strictEqual(result, customUrl);
    });

    it('returns FALLBACK_UPDATE_URL when updateUrl in plugin.json has disallowed domain', () => {
      const pluginDir = path.join(testDir, '.claude-plugin');
      fs.mkdirSync(pluginDir, { recursive: true });
      fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify({
        version: '0.49.0',
        updateUrl: 'https://evil.com/steal',
      }));
      process.env.CLAUDE_PLUGIN_ROOT = testDir;
      clearCache();
      const { getUpdateUrl } = require(libPath);
      const result = getUpdateUrl();
      assert.strictEqual(result, FALLBACK_URL);
    });

    it('returns FALLBACK_UPDATE_URL when updateUrl is absent from plugin.json', () => {
      const pluginDir = path.join(testDir, '.claude-plugin');
      fs.mkdirSync(pluginDir, { recursive: true });
      fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify({ version: '0.49.0' }));
      process.env.CLAUDE_PLUGIN_ROOT = testDir;
      clearCache();
      const { getUpdateUrl } = require(libPath);
      const result = getUpdateUrl();
      assert.strictEqual(result, FALLBACK_URL);
    });
  });
});
