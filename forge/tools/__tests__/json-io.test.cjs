'use strict';
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { readJson, writeJson } = require('../lib/json-io.cjs');

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-json-io-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('readJson', () => {
  test('returns null for non-existent file', () => {
    const result = readJson(path.join(tmpDir, 'missing.json'));
    assert.equal(result, null);
  });

  test('returns parsed object for valid JSON file', () => {
    const filePath = path.join(tmpDir, 'data.json');
    fs.writeFileSync(filePath, JSON.stringify({ foo: 'bar', n: 42 }), 'utf8');
    const result = readJson(filePath);
    assert.deepEqual(result, { foo: 'bar', n: 42 });
  });

  test('throws on malformed JSON', () => {
    const filePath = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(filePath, '{ not valid json }', 'utf8');
    assert.throws(() => readJson(filePath), /JSON/i);
  });
});

describe('writeJson', () => {
  test('creates parent directories and writes canonical JSON', () => {
    const filePath = path.join(tmpDir, 'nested', 'dir', 'file.json');
    const data = { key: 'value', num: 1 };
    writeJson(filePath, data);
    assert.ok(fs.existsSync(filePath));
    const raw = fs.readFileSync(filePath, 'utf8');
    assert.equal(raw, JSON.stringify(data, null, 2) + '\n');
  });

  test('returns the written data object', () => {
    const filePath = path.join(tmpDir, 'out.json');
    const data = { x: 1 };
    const result = writeJson(filePath, data);
    assert.deepEqual(result, data);
  });

  test('overwrites existing file', () => {
    const filePath = path.join(tmpDir, 'out.json');
    writeJson(filePath, { v: 1 });
    writeJson(filePath, { v: 2 });
    const result = readJson(filePath);
    assert.equal(result.v, 2);
  });
});

describe('round-trip', () => {
  test('write then read returns identical object', () => {
    const filePath = path.join(tmpDir, 'rt.json');
    const data = { a: 1, b: [2, 3], c: { d: true } };
    writeJson(filePath, data);
    const result = readJson(filePath);
    assert.deepEqual(result, data);
  });
});
