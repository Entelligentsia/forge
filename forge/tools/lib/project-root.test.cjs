'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { findProjectRoot } = require('./project-root.cjs');

describe('findProjectRoot', () => {

  test('returns CWD when .forge/config.json exists in CWD', (t) => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-test-'));
    t.after(() => { fs.rmSync(tmp, { recursive: true }); });
    fs.mkdirSync(path.join(tmp, '.forge'));
    fs.writeFileSync(path.join(tmp, '.forge', 'config.json'), '{}');

    const result = findProjectRoot(tmp);
    assert.equal(result, tmp);
  });

  test('walks up to find .forge/config.json from nested directory', (t) => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-test-'));
    t.after(() => { fs.rmSync(tmp, { recursive: true }); });
    fs.mkdirSync(path.join(tmp, '.forge'));
    fs.writeFileSync(path.join(tmp, '.forge', 'config.json'), '{}');

    const nested = path.join(tmp, 'src', 'deep', 'dir');
    fs.mkdirSync(nested, { recursive: true });

    const result = findProjectRoot(nested);
    assert.equal(result, tmp);
  });

  test('returns null when no .forge/config.json found', (t) => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-test-'));
    t.after(() => { fs.rmSync(tmp, { recursive: true }); });
    // No .forge directory anywhere

    const result = findProjectRoot(tmp);
    assert.equal(result, null);
  });

  test('skips directories with .forge/ but no config.json', (t) => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-test-'));
    t.after(() => { fs.rmSync(tmp, { recursive: true }); });
    const child = path.join(tmp, 'child');
    fs.mkdirSync(path.join(child, '.forge'), { recursive: true });  // .forge dir exists but no config.json
    fs.mkdirSync(path.join(tmp, '.forge'));
    fs.writeFileSync(path.join(tmp, '.forge', 'config.json'), '{}');

    const result = findProjectRoot(child);
    assert.equal(result, tmp);
  });

  test('resolves project root even when CWD is inside a nested git repo', (t) => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-test-'));
    t.after(() => { fs.rmSync(tmp, { recursive: true }); });
    fs.mkdirSync(path.join(tmp, '.forge'));
    fs.writeFileSync(path.join(tmp, '.forge', 'config.json'), '{}');

    // Simulate forge-engineering/forge/forge nested structure
    const nested = path.join(tmp, 'forge', 'forge');
    fs.mkdirSync(nested, { recursive: true });

    const result = findProjectRoot(nested);
    assert.equal(result, tmp);
  });

  test('finds closest .forge/config.json when multiple exist in hierarchy', (t) => {
    const outer = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-test-'));
    t.after(() => { fs.rmSync(outer, { recursive: true }); });
    fs.mkdirSync(path.join(outer, '.forge'));
    fs.writeFileSync(path.join(outer, '.forge', 'config.json'), '{}');

    const inner = path.join(outer, 'subproject');
    fs.mkdirSync(path.join(inner, '.forge'), { recursive: true });
    fs.writeFileSync(path.join(inner, '.forge', 'config.json'), '{}');

    const deep = path.join(inner, 'src');
    fs.mkdirSync(deep, { recursive: true });

    // Should find inner (closest) project root
    const result = findProjectRoot(deep);
    assert.equal(result, inner);
  });
});