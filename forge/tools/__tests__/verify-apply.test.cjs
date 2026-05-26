'use strict';
// verify-apply.test.cjs — tests for verify-apply.cjs
// Test-first per Iron Law 2: these tests are written before verify-apply.cjs exists.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VERIFY_APPLY_CJS = path.join(__dirname, '..', 'verify-apply.cjs');
const GEN_MANIFEST_CJS = path.join(__dirname, '..', 'generation-manifest.cjs');

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTempProject() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-verify-apply-test-'));
  fs.mkdirSync(path.join(tmpDir, '.forge'), { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, '.forge', 'config.json'),
    JSON.stringify({ paths: { store: '.forge/store' }, version: '0.52.0' }, null, 2)
  );
  return tmpDir;
}

function recordManifest(tmpDir, filePath) {
  const result = spawnSync('node', [GEN_MANIFEST_CJS, 'record', filePath], {
    cwd: tmpDir,
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(`record failed: ${result.stderr}`);
}

function runVerifyApply(args, cwd) {
  return spawnSync('node', [VERIFY_APPLY_CJS, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 10_000,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('verify-apply.cjs — single path classification', () => {
  test('modified: file changed after recording → in modified array', () => {
    const tmpDir = makeTempProject();
    try {
      const filePath = path.join(tmpDir, 'test.md');
      fs.writeFileSync(filePath, '# Original', 'utf8');
      recordManifest(tmpDir, filePath);
      // Modify the file
      fs.writeFileSync(filePath, '# Modified content', 'utf8');

      const r = runVerifyApply([filePath], tmpDir);
      assert.equal(r.status, 0, `expected exit 0 (all modified), got ${r.status}\n${r.stderr}`);
      const result = JSON.parse(r.stdout);
      assert.ok(result.modified.some((p) => p.includes('test.md')), `expected test.md in modified: ${r.stdout}`);
      assert.deepEqual(result.unchanged, []);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('unchanged: pristine file returns in unchanged array', () => {
    const tmpDir = makeTempProject();
    try {
      const filePath = path.join(tmpDir, 'pristine.md');
      fs.writeFileSync(filePath, '# Unchanged', 'utf8');
      recordManifest(tmpDir, filePath);
      // Do NOT modify the file

      const r = runVerifyApply([filePath], tmpDir);
      assert.equal(r.status, 1, `expected exit 1 (unchanged paths), got ${r.status}\n${r.stderr}`);
      const result = JSON.parse(r.stdout);
      assert.ok(result.unchanged.some((p) => p.includes('pristine.md')), `expected pristine.md in unchanged: ${r.stdout}`);
      assert.deepEqual(result.modified, []);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('untracked: file not in manifest returns in untracked array', () => {
    const tmpDir = makeTempProject();
    try {
      const filePath = path.join(tmpDir, 'untracked.md');
      fs.writeFileSync(filePath, '# Untracked', 'utf8');
      // Do NOT record in manifest

      const r = runVerifyApply([filePath], tmpDir);
      // untracked should not cause exit 1 (that's for unchanged)
      const result = JSON.parse(r.stdout);
      assert.ok(result.untracked.some((p) => p.includes('untracked.md')), `expected untracked.md in untracked: ${r.stdout}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('missing: tracked-then-deleted file returns in missing array', () => {
    const tmpDir = makeTempProject();
    try {
      // Record a file in the manifest, then delete it
      const filePath = path.join(tmpDir, 'was-tracked.md');
      fs.writeFileSync(filePath, '# Tracked', 'utf8');
      recordManifest(tmpDir, filePath);
      fs.unlinkSync(filePath); // Delete after recording

      const r = runVerifyApply([filePath], tmpDir);
      const result = JSON.parse(r.stdout);
      assert.ok(result.missing.some((p) => p.includes('was-tracked.md')), `expected in missing: ${r.stdout}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('verify-apply.cjs — multiple paths mixed results', () => {
  test('mixed: returns correct buckets for each file', () => {
    const tmpDir = makeTempProject();
    try {
      // modified file
      const modFile = path.join(tmpDir, 'modified.md');
      fs.writeFileSync(modFile, '# Original', 'utf8');
      recordManifest(tmpDir, modFile);
      fs.writeFileSync(modFile, '# Changed', 'utf8');

      // unchanged file
      const unFile = path.join(tmpDir, 'unchanged.md');
      fs.writeFileSync(unFile, '# Same', 'utf8');
      recordManifest(tmpDir, unFile);

      // untracked file
      const utFile = path.join(tmpDir, 'untracked.md');
      fs.writeFileSync(utFile, '# Untracked', 'utf8');

      // missing file: tracked in manifest then deleted
      const misFile = path.join(tmpDir, 'was-tracked.md');
      fs.writeFileSync(misFile, '# Was tracked', 'utf8');
      recordManifest(tmpDir, misFile);
      fs.unlinkSync(misFile); // Delete after recording

      const r = runVerifyApply([modFile, unFile, utFile, misFile], tmpDir);
      // exit 1 because there are unchanged files
      assert.equal(r.status, 1, `expected exit 1 due to unchanged: ${r.stderr}`);
      const result = JSON.parse(r.stdout);
      assert.ok(result.modified.some((p) => p.includes('modified.md')));
      assert.ok(result.unchanged.some((p) => p.includes('unchanged.md')));
      assert.ok(result.untracked.some((p) => p.includes('untracked.md')));
      assert.ok(result.missing.some((p) => p.includes('was-tracked.md')));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('verify-apply.cjs — exit codes', () => {
  test('exits 0 when all paths are modified', () => {
    const tmpDir = makeTempProject();
    try {
      const f1 = path.join(tmpDir, 'a.md');
      const f2 = path.join(tmpDir, 'b.md');
      fs.writeFileSync(f1, '# A', 'utf8');
      fs.writeFileSync(f2, '# B', 'utf8');
      recordManifest(tmpDir, f1);
      recordManifest(tmpDir, f2);
      fs.writeFileSync(f1, '# A modified', 'utf8');
      fs.writeFileSync(f2, '# B modified', 'utf8');

      const r = runVerifyApply([f1, f2], tmpDir);
      assert.equal(r.status, 0, `expected exit 0 (all modified): ${r.stderr}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('exits 1 when any unchanged paths present', () => {
    const tmpDir = makeTempProject();
    try {
      const f = path.join(tmpDir, 'pristine.md');
      fs.writeFileSync(f, '# Pristine', 'utf8');
      recordManifest(tmpDir, f);
      // Do not modify

      const r = runVerifyApply([f], tmpDir);
      assert.equal(r.status, 1, `expected exit 1 for unchanged: ${r.stderr}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('exits 2 when no arguments provided (usage error)', () => {
    const tmpDir = makeTempProject();
    try {
      const r = runVerifyApply([], tmpDir);
      assert.equal(r.status, 2, `expected exit 2 for usage error, got ${r.status}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
