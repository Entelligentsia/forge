'use strict';
// Tests for rewrite-plugin-urls.cjs (S-12).
// Added in FORGE-S25-T13 — Iron Law: every new .cjs tool has a test written first.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL = path.join(__dirname, '..', 'rewrite-plugin-urls.cjs');

const MAIN_UPDATE_URL =
  'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';
const MAIN_MIGRATIONS_URL =
  'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/migrations.json';
const RELEASE_UPDATE_URL =
  'https://raw.githubusercontent.com/Entelligentsia/forge/release/forge/.claude-plugin/plugin.json';
const RELEASE_MIGRATIONS_URL =
  'https://raw.githubusercontent.com/Entelligentsia/forge/release/forge/migrations.json';

function makePluginJson(tmpDir, extra = {}) {
  const content = {
    name: 'forge',
    version: '0.48.1',
    updateUrl: RELEASE_UPDATE_URL,
    migrationsUrl: RELEASE_MIGRATIONS_URL,
    ...extra,
  };
  const p = path.join(tmpDir, 'plugin.json');
  fs.writeFileSync(p, JSON.stringify(content, null, 2) + '\n', 'utf8');
  return p;
}

describe('rewrite-plugin-urls.cjs', () => {
  test('--target main rewrites URLs to main-branch raw GitHub content', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpu-test-'));
    try {
      const pluginPath = makePluginJson(tmpDir);
      execFileSync('node', [TOOL, '--plugin', pluginPath, '--target', 'main']);
      const result = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
      assert.strictEqual(result.updateUrl, MAIN_UPDATE_URL,
        'updateUrl must point to main branch after --target main');
      assert.strictEqual(result.migrationsUrl, MAIN_MIGRATIONS_URL,
        'migrationsUrl must point to main branch after --target main');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('--target release rewrites URLs to release-branch raw GitHub content', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpu-test-'));
    try {
      // Start from main URLs
      const pluginPath = makePluginJson(tmpDir, {
        updateUrl: MAIN_UPDATE_URL,
        migrationsUrl: MAIN_MIGRATIONS_URL,
      });
      execFileSync('node', [TOOL, '--plugin', pluginPath, '--target', 'release']);
      const result = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
      assert.strictEqual(result.updateUrl, RELEASE_UPDATE_URL,
        'updateUrl must point to release branch after --target release');
      assert.strictEqual(result.migrationsUrl, RELEASE_MIGRATIONS_URL,
        'migrationsUrl must point to release branch after --target release');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('rewrite preserves all other plugin.json fields unchanged', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpu-test-'));
    try {
      const pluginPath = makePluginJson(tmpDir, { customField: 'preserved' });
      const before = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
      execFileSync('node', [TOOL, '--plugin', pluginPath, '--target', 'main']);
      const after = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
      assert.strictEqual(after.name, before.name, 'name must be preserved');
      assert.strictEqual(after.version, before.version, 'version must be preserved');
      assert.strictEqual(after.customField, before.customField, 'customField must be preserved');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('unknown --target value exits non-zero', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpu-test-'));
    try {
      const pluginPath = makePluginJson(tmpDir);
      let threw = false;
      try {
        execFileSync('node', [TOOL, '--plugin', pluginPath, '--target', 'staging'], { stdio: 'pipe' });
      } catch {
        threw = true;
      }
      assert.ok(threw, 'process must exit non-zero for unknown --target');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('missing --plugin argument exits non-zero', () => {
    let threw = false;
    try {
      execFileSync('node', [TOOL, '--target', 'main'], { stdio: 'pipe' });
    } catch {
      threw = true;
    }
    assert.ok(threw, 'process must exit non-zero when --plugin is missing');
  });

  test('missing --target argument exits non-zero', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpu-test-'));
    try {
      const pluginPath = makePluginJson(tmpDir);
      let threw = false;
      try {
        execFileSync('node', [TOOL, '--plugin', pluginPath], { stdio: 'pipe' });
      } catch {
        threw = true;
      }
      assert.ok(threw, 'process must exit non-zero when --target is missing');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('writes atomically — file is valid JSON after rewrite even if target was already correct', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpu-test-'));
    try {
      const pluginPath = makePluginJson(tmpDir, {
        updateUrl: MAIN_UPDATE_URL,
        migrationsUrl: MAIN_MIGRATIONS_URL,
      });
      // Rewrite to main when already pointing to main — idempotent, still valid
      execFileSync('node', [TOOL, '--plugin', pluginPath, '--target', 'main']);
      const result = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
      assert.strictEqual(result.updateUrl, MAIN_UPDATE_URL);
      assert.strictEqual(result.migrationsUrl, MAIN_MIGRATIONS_URL);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
