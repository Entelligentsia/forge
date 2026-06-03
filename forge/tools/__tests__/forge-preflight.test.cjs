'use strict';

// Test-first contract for forge-preflight.cjs (FORGE-S27-T01 / item A1).
// Updated FORGE-S29-T03: fixture no longer passes forgeRoot in config;
// blob.forgeRoot is resolved from forgeRef-based cache lookup instead.
//
// forge-preflight.cjs bundles the deterministic pre-dispatch glue the
// orchestrator currently hand-runs turn-by-turn (FORGE_ROOT resolution,
// config reconciliation, generation-manifest state, calibration freshness,
// MASTER_INDEX hashing, structure check, timestamp) into ONE compact JSON
// blob, emitted once. It is a pure aggregator over existing tools.
//
// Contract pinned here:
//   1. Returns one compact JSON blob with the documented fields.
//   2. ok:true on a healthy fixture project.
//   3. Idempotent: two runs against an unchanged store yield byte-identical
//      blobs modulo the `generatedAt` field.
//   4. Fast-fail-safe: a broken/missing config sets ok:false with a populated
//      warnings[] and a clean exit code — never an uncaught throw.
//   5. Resolves forgeRoot from forgeRef-based cache lookup (not config.paths.forgeRoot).
//   6. Sets ok:false when forgeRef cannot be resolved from cache.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const PREFLIGHT = path.join(__dirname, '..', 'forge-preflight.cjs');
const FORGE_ROOT_ABS = path.resolve(__dirname, '..', '..'); // forge/forge

// The version string from forge-preflight's own plugin.json — used as forgeRef.
const PLUGIN_VERSION = require(path.join(FORGE_ROOT_ABS, '.claude-plugin', 'plugin.json')).version;

// ---------------------------------------------------------------------------
// Fixture helpers.
// ---------------------------------------------------------------------------

// Create a real cache entry under ~/.claude/plugins/cache/forge/forge/<version>/
// pointing at FORGE_ROOT_ABS so forgeRef resolution succeeds in tests.
function ensureCacheEntry(version) {
  const cacheDir = path.join(os.homedir(), '.claude', 'plugins', 'cache', 'forge', 'forge', version);
  const pluginJsonPath = path.join(cacheDir, '.claude-plugin', 'plugin.json');
  if (!fs.existsSync(pluginJsonPath)) {
    fs.mkdirSync(path.join(cacheDir, '.claude-plugin'), { recursive: true });
    fs.writeFileSync(pluginJsonPath, JSON.stringify({ version }), 'utf8');
  }
  return cacheDir;
}

// Fixture: a minimal Forge project rooted at an OS tmpdir.
// FORGE-S29-T03: config no longer contains forgeRoot; uses forgeRef instead.
function makeProject({ brokenConfig = false, withForgeRef = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-preflight-'));
  const forgeDir = path.join(dir, '.forge');
  fs.mkdirSync(path.join(forgeDir, 'cache'), { recursive: true });
  fs.mkdirSync(path.join(forgeDir, 'store', 'tasks'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'engineering'), { recursive: true });

  if (brokenConfig) {
    fs.writeFileSync(path.join(forgeDir, 'config.json'), '{ this is not json');
  } else {
    const pathsConfig = {
      engineering: 'engineering',
      store: '.forge/store',
    };
    if (withForgeRef) {
      // Ensure a cache entry exists so forgeRef resolution finds plugin.json
      ensureCacheEntry(PLUGIN_VERSION);
      pathsConfig.forgeRef = PLUGIN_VERSION;
    }
    fs.writeFileSync(
      path.join(forgeDir, 'config.json'),
      JSON.stringify({
        version: '1.0',
        project: { prefix: 'TEST', name: 'Test' },
        paths: pathsConfig,
        calibrationBaseline: {
          lastCalibrated: '2026-01-01',
          version: '1.0.0',
          masterIndexHash: 'deadbeef',
          sprintsCovered: ['TEST-S01'],
        },
      }, null, 2)
    );
  }

  fs.writeFileSync(
    path.join(dir, 'engineering', 'MASTER_INDEX.md'),
    '# MASTER_INDEX\n\n## Tasks\n| Task | Status |\n|---|---|\n| TEST-S01-T01 | planned |\n'
  );
  return dir;
}

function runPreflight(cwd, extraArgs = []) {
  const res = spawnSync('node', [PREFLIGHT, ...extraArgs], {
    cwd,
    encoding: 'utf8',
  });
  let blob = null;
  try { blob = JSON.parse(res.stdout); } catch (_) { /* leave null */ }
  return { res, blob };
}

describe('forge-preflight.cjs', () => {
  test('emits one compact JSON blob with the documented fields on a healthy project', () => {
    const dir = makeProject();
    const { res, blob } = runPreflight(dir);
    assert.equal(res.status, 0, `expected exit 0, got ${res.status}: ${res.stderr}`);
    assert.ok(blob, 'stdout must be a single parseable JSON object');
    for (const field of ['ok', 'forgeRoot', 'masterIndexHash', 'generatedAt', 'warnings']) {
      assert.ok(field in blob, `blob must carry field "${field}"`);
    }
    assert.equal(blob.ok, true, `healthy project must report ok:true; warnings: ${JSON.stringify(blob && blob.warnings)}`);
    assert.ok(Array.isArray(blob.warnings), 'warnings must be an array');
    // forgeRoot resolved from forgeRef cache lookup, not from config.paths.forgeRoot
    assert.ok(typeof blob.forgeRoot === 'string' && blob.forgeRoot.length > 0,
      'forgeRoot must be a non-empty string resolved from forgeRef');
    assert.ok(blob.forgeRoot.includes(PLUGIN_VERSION),
      `forgeRoot must contain the forgeRef version "${PLUGIN_VERSION}"; got "${blob.forgeRoot}"`);
    assert.equal(typeof blob.masterIndexHash, 'string');
    assert.ok(blob.masterIndexHash.length > 0, 'masterIndexHash must be non-empty');
  });

  test('is idempotent — two runs differ only in generatedAt', () => {
    const dir = makeProject();
    const a = runPreflight(dir).blob;
    const b = runPreflight(dir).blob;
    assert.ok(a && b, 'both runs must emit a blob');
    const stripTs = (o) => { const c = { ...o }; delete c.generatedAt; return c; };
    assert.deepEqual(stripTs(b), stripTs(a), 'blob must be stable modulo generatedAt');
  });

  test('fast-fail-safe — broken config yields ok:false + warnings, never an uncaught throw', () => {
    const dir = makeProject({ brokenConfig: true });
    const { res, blob } = runPreflight(dir);
    // Must not crash with an uncaught exception (Node would exit 1 with a stack
    // trace on stderr and no JSON on stdout). We require a parseable blob.
    assert.ok(blob, `broken config must still emit a JSON blob, got stderr: ${res.stderr}`);
    assert.equal(blob.ok, false, 'broken config must report ok:false');
    assert.ok(Array.isArray(blob.warnings) && blob.warnings.length > 0,
      'broken config must populate warnings[]');
  });

  test('sets ok:false and warns when forgeRef is absent and cannot resolve forgeRoot', () => {
    // Config with no forgeRoot and no forgeRef — preflight cannot resolve root
    const dir = makeProject({ withForgeRef: false });
    const { blob } = runPreflight(dir);
    assert.ok(blob, 'must still emit a JSON blob');
    assert.equal(blob.ok, false, 'must report ok:false when forgeRef is absent');
    assert.ok(Array.isArray(blob.warnings) && blob.warnings.some(w => /forgeRef|forgeRoot|resolve/i.test(w)),
      `warnings must mention resolution failure; got: ${JSON.stringify(blob && blob.warnings)}`);
  });
});
