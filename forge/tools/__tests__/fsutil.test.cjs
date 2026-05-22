'use strict';
// Tests for lib/fsutil.cjs
// Written red-bar first (Iron Law 2) — these tests fail until lib/fsutil.cjs is created.

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { ensureDir, isFile, isDirectory } = require('../lib/fsutil.cjs');

// Temp directory for all tests
let tmpBase;

before(() => {
  tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'fsutil-test-'));
});

after(() => {
  // Clean up
  fs.rmSync(tmpBase, { recursive: true, force: true });
});

describe('lib/fsutil.cjs — ensureDir', () => {

  test('creates directory that does not exist', () => {
    const dir = path.join(tmpBase, 'new-dir');
    assert.ok(!fs.existsSync(dir), 'precondition: dir must not exist');
    ensureDir(dir);
    assert.ok(fs.existsSync(dir), 'ensureDir must create the directory');
    assert.ok(fs.statSync(dir).isDirectory(), 'created path must be a directory');
  });

  test('creates nested directories recursively', () => {
    const dir = path.join(tmpBase, 'nested', 'deep', 'dir');
    assert.ok(!fs.existsSync(dir), 'precondition: dir must not exist');
    ensureDir(dir);
    assert.ok(fs.existsSync(dir), 'ensureDir must create nested directories');
  });

  test('is idempotent on existing directory', () => {
    const dir = path.join(tmpBase, 'existing-dir');
    fs.mkdirSync(dir, { recursive: true });
    assert.ok(fs.existsSync(dir), 'precondition: dir must exist');
    // Must not throw
    assert.doesNotThrow(() => ensureDir(dir), 'ensureDir must be idempotent on existing dir');
  });

});

describe('lib/fsutil.cjs — isFile', () => {

  test('returns true for a file', () => {
    const filePath = path.join(tmpBase, 'test-file.txt');
    fs.writeFileSync(filePath, 'content');
    assert.strictEqual(isFile(filePath), true);
  });

  test('returns false for a directory', () => {
    const dir = path.join(tmpBase, 'dir-for-isfile');
    fs.mkdirSync(dir, { recursive: true });
    assert.strictEqual(isFile(dir), false);
  });

  test('returns false for a missing path', () => {
    const missing = path.join(tmpBase, 'does-not-exist.txt');
    assert.strictEqual(isFile(missing), false);
  });

});

describe('lib/fsutil.cjs — isDirectory', () => {

  test('returns true for a directory', () => {
    const dir = path.join(tmpBase, 'check-dir');
    fs.mkdirSync(dir, { recursive: true });
    assert.strictEqual(isDirectory(dir), true);
  });

  test('returns false for a file', () => {
    const filePath = path.join(tmpBase, 'file-for-isdir.txt');
    fs.writeFileSync(filePath, 'content');
    assert.strictEqual(isDirectory(filePath), false);
  });

  test('returns false for a missing path', () => {
    const missing = path.join(tmpBase, 'no-such-dir');
    assert.strictEqual(isDirectory(missing), false);
  });

});

describe('lib/fsutil.cjs — regression: build-base-pack consumer', () => {

  test('ensureDir enables writing into a newly created directory', () => {
    // Simulates what build-base-pack.cjs does: ensureDir then write file
    const outRoot = path.join(tmpBase, 'build-output');
    const personasDir = path.join(outRoot, 'personas');
    ensureDir(personasDir);
    const filePath = path.join(personasDir, 'test.md');
    fs.writeFileSync(filePath, '# test');
    assert.ok(fs.existsSync(filePath), 'file can be written after ensureDir');
    assert.strictEqual(isFile(filePath), true);
    assert.strictEqual(isDirectory(personasDir), true);
  });

});
