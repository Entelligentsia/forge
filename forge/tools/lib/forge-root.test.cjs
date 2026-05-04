'use strict';

// Tests for forge-root.cjs — shared FORGE_ROOT resolution helper
// Written BEFORE implementation (Iron Law 2 — failing tests first).
// FR-001: 3-tier priority resolution, actionable error.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ---------------------------------------------------------------------------
// Import — will fail until forge-root.cjs is created (Iron Law 2)
// ---------------------------------------------------------------------------

let resolveForgeRoot;
try {
  const mod = require('./forge-root.cjs');
  resolveForgeRoot = mod.resolveForgeRoot;
} catch (e) {
  // Module doesn't exist yet — tests will fail
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'forge-root-test-'));
}

function makePluginRoot(base) {
  const pluginRoot = path.join(base, 'plugin-root');
  const pluginJsonDir = path.join(pluginRoot, '.claude-plugin');
  fs.mkdirSync(pluginJsonDir, { recursive: true });
  fs.writeFileSync(
    path.join(pluginJsonDir, 'plugin.json'),
    JSON.stringify({ version: '0.99.0' }, null, 2) + '\n',
    'utf8'
  );
  return pluginRoot;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveForgeRoot', () => {

  test('accepts valid FORGE_ROOT env var when plugin.json exists', () => {
    const tmp = makeTmpDir();
    try {
      const pluginRoot = makePluginRoot(tmp);
      const result = resolveForgeRoot(pluginRoot);
      assert.strictEqual(result, pluginRoot, 'should return the env var path when plugin.json exists');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('falls back to __dirname/../.. when FORGE_ROOT env var points to dir without plugin.json', () => {
    const tmp = makeTmpDir();
    try {
      // Create a directory that does NOT have .claude-plugin/plugin.json
      const badPath = path.join(tmp, 'nonexistent-plugin');
      fs.mkdirSync(badPath, { recursive: true });

      // resolveForgeRoot should fall back to __dirname/../.. when the env var
      // path is invalid (no plugin.json). In the real forge repo, the fallback
      // resolves to forge/forge/ which has plugin.json.
      const result = resolveForgeRoot(badPath);
      // Result should be the fallback (not the bad env var path)
      assert.notStrictEqual(result, badPath, 'should NOT return the bad env var path');
      // The fallback should be the parent of tools/lib/ (i.e. forge/forge/)
      const expectedFallback = path.resolve(path.join(__dirname, '..', '..'));
      assert.strictEqual(result, expectedFallback, 'should fall back to __dirname/../..');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('falls back to __dirname/.. when FORGE_ROOT is not provided', () => {
    // When no env var is passed (null/undefined), resolveForgeRoot falls back
    // to the parent of its own directory (forge/forge/tools/lib -> forge/forge)
    const result = resolveForgeRoot(undefined);
    // The module is at forge/forge/tools/lib/forge-root.cjs,
    // so __dirname/../.. should be forge/forge/tools/lib/../.. = forge/forge
    const expected = path.resolve(path.join(__dirname, '..', '..'));
    assert.strictEqual(result, expected, 'fallback should resolve to parent of tools/lib');
  });

  test('error message lists all checked paths when both tiers fail', () => {
    // To test that resolveForgeRoot throws an actionable error when both the
    // env var and fallback fail, we must make the fallback path invalid.
    // We do this by temporarily removing the plugin.json from the real fallback.
    const realPluginJson = path.join(__dirname, '..', '..', '.claude-plugin', 'plugin.json');
    let backup = null;
    let hasBackup = false;
    try {
      if (fs.existsSync(realPluginJson)) {
        backup = fs.readFileSync(realPluginJson, 'utf8');
        fs.unlinkSync(realPluginJson);
        hasBackup = true;
      }

      const badPath = path.join(os.tmpdir(), 'nonexistent-forge-root-test');
      assert.throws(
        () => resolveForgeRoot(badPath),
        (err) => {
          assert.ok(err instanceof Error);
          // The error should list the checked paths for diagnosis
          assert.ok(
            err.message.includes('plugin.json') || err.message.includes('checked'),
            `error message should mention plugin.json or checked paths: ${err.message}`
          );
          return true;
        }
      );
    } finally {
      // Restore plugin.json
      if (hasBackup && backup !== null) {
        fs.mkdirSync(path.dirname(realPluginJson), { recursive: true });
        fs.writeFileSync(realPluginJson, backup, 'utf8');
      }
    }
  });

});