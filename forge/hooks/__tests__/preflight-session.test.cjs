'use strict';

// Test-first contract for preflight-session.cjs (FORGE-S27-T01 / item A1).
//
// preflight-session.cjs is a SessionStart hook that primes the preflight cache
// blob (.forge/cache/preflight-status.json). Because SessionStart fires before
// any command and carries NO per-command signal, the hook is deliberately
// command-name-INDEPENDENT: scoping to run-task/fix-bug/run-sprint lives in the
// orchestration command-preamble path, not here. The hook only ever:
//   - is a strict no-op when .forge/ is absent (never changes behavior for
//     non-Forge projects / unrelated commands);
//   - primes the cache blob when .forge/ is present;
//   - is freshness-guarded (idempotent: no rewrite when the blob is current);
//   - fails open (any error -> exit 0, never blocks session start).

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const HOOK = path.join(__dirname, '..', 'preflight-session.cjs');
const PLUGIN_ROOT = path.join(__dirname, '..', '..'); // forge/forge
const BLOB_REL = path.join('.forge', 'cache', 'preflight-status.json');

function makeProject({ withForge = true } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-preflight-hook-'));
  if (withForge) {
    fs.mkdirSync(path.join(tmp, '.forge', 'cache'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'engineering'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, '.forge', 'config.json'),
      JSON.stringify({
        version: '1.0',
        project: { prefix: 'TEST', name: 'Test' },
        paths: { engineering: 'engineering', store: '.forge/store', forgeRoot: PLUGIN_ROOT },
      }, null, 2)
    );
    fs.writeFileSync(path.join(tmp, 'engineering', 'MASTER_INDEX.md'), '# MASTER_INDEX\n');
  }
  return tmp;
}

function runHook(cwd, envelope) {
  return spawnSync('node', [HOOK], {
    cwd,
    input: JSON.stringify(envelope || { hook_event_name: 'SessionStart' }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: PLUGIN_ROOT },
  });
}

describe('preflight-session.cjs', () => {
  test('strict no-op when .forge/ is absent — exits 0, writes nothing', () => {
    const dir = makeProject({ withForge: false });
    const res = runHook(dir);
    assert.equal(res.status, 0, `must exit 0, got ${res.status}: ${res.stderr}`);
    assert.equal(fs.existsSync(path.join(dir, BLOB_REL)), false,
      'must not create a blob in a non-Forge project');
  });

  test('primes the cache blob when .forge/ is present — exits 0', () => {
    const dir = makeProject();
    const res = runHook(dir);
    assert.equal(res.status, 0, `must exit 0, got ${res.status}: ${res.stderr}`);
    const blobPath = path.join(dir, BLOB_REL);
    assert.equal(fs.existsSync(blobPath), true, 'must prime the cache blob');
    const blob = JSON.parse(fs.readFileSync(blobPath, 'utf8'));
    assert.ok('ok' in blob && 'masterIndexHash' in blob, 'blob must carry preflight fields');
  });

  test('idempotent — re-running with an unchanged store does not rewrite the blob', () => {
    const dir = makeProject();
    const blobPath = path.join(dir, BLOB_REL);
    runHook(dir);
    const firstMtime = fs.statSync(blobPath).mtimeMs;
    // small spin to ensure mtime resolution would catch a rewrite
    const spinUntil = Date.now() + 25;
    while (Date.now() < spinUntil) { /* noop */ }
    runHook(dir);
    const secondMtime = fs.statSync(blobPath).mtimeMs;
    assert.equal(secondMtime, firstMtime,
      'a fresh blob must not be rewritten on re-run (freshness guard)');
  });

  test('fails open — malformed envelope still exits 0', () => {
    const dir = makeProject();
    const res = spawnSync('node', [HOOK], {
      cwd: dir,
      input: 'this is not json',
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PLUGIN_ROOT: PLUGIN_ROOT },
    });
    assert.equal(res.status, 0, 'malformed envelope must not crash the session');
  });
});
