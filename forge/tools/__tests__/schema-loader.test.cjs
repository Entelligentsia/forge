'use strict';
// Unit tests for lib/schema-loader.cjs

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { loadSchemas, resetSchemaCache } = require('../lib/schema-loader.cjs');

// Minimal valid JSON schema to write into test fixtures
const MINIMAL_SCHEMA = JSON.stringify({ type: 'object', required: ['taskId'], properties: {} });

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-schema-loader-test-'));
  resetSchemaCache();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  resetSchemaCache();
});

describe('loadSchemas — fallback when no files present', () => {
  test('returns minimal fallback objects for every entity type when no schema files found', () => {
    // Point all search paths to non-existent locations
    const schemas = loadSchemas({
      cwd: path.join(tmpDir, 'empty-project'),
      pluginDir: path.join(tmpDir, 'no-plugin-schemas'),
      bundledDir: path.join(tmpDir, 'no-bundled-schemas'),
    });
    assert.ok(typeof schemas === 'object');
    // All core entity types should have at least minimal fallback
    for (const type of ['sprint', 'task', 'bug', 'event', 'feature']) {
      assert.ok(schemas[type], `expected fallback for ${type}`);
      assert.ok(Array.isArray(schemas[type].required), `expected required array for ${type}`);
    }
  });
});

describe('loadSchemas — first-hit semantics', () => {
  test('loads from project-installed path when present (first hit)', () => {
    // Write a schema to the project .forge/schemas/ path
    const schemaDir = path.join(tmpDir, '.forge', 'schemas');
    fs.mkdirSync(schemaDir, { recursive: true });
    const taskSchema = { type: 'object', required: ['taskId'], properties: {}, _source: 'project' };
    fs.writeFileSync(path.join(schemaDir, 'task.schema.json'), JSON.stringify(taskSchema));

    const schemas = loadSchemas({
      cwd: tmpDir,
      pluginDir: path.join(tmpDir, 'no-plugin'),
      bundledDir: path.join(tmpDir, 'no-bundled'),
    });
    assert.equal(schemas['task']._source, 'project');
  });

  test('falls back to in-tree when project-installed missing', () => {
    // Write a schema to the in-tree forge/schemas/ path
    const inTreeDir = path.join(tmpDir, 'forge', 'schemas');
    fs.mkdirSync(inTreeDir, { recursive: true });
    const taskSchema = { type: 'object', required: ['taskId'], properties: {}, _source: 'intree' };
    fs.writeFileSync(path.join(inTreeDir, 'task.schema.json'), JSON.stringify(taskSchema));

    const schemas = loadSchemas({
      cwd: tmpDir,
      pluginDir: path.join(tmpDir, 'no-plugin'),
      bundledDir: path.join(tmpDir, 'no-bundled'),
    });
    assert.equal(schemas['task']._source, 'intree');
  });

  test('falls back to plugin-installed when project and in-tree missing', () => {
    const pluginSchemaDir = path.join(tmpDir, 'plugin-schemas');
    fs.mkdirSync(pluginSchemaDir, { recursive: true });
    const taskSchema = { type: 'object', required: ['taskId'], properties: {}, _source: 'plugin' };
    fs.writeFileSync(path.join(pluginSchemaDir, 'task.schema.json'), JSON.stringify(taskSchema));

    const schemas = loadSchemas({
      cwd: path.join(tmpDir, 'empty-project'),
      pluginDir: pluginSchemaDir,
      bundledDir: path.join(tmpDir, 'no-bundled'),
    });
    assert.equal(schemas['task']._source, 'plugin');
  });

  test('falls back to bundled when all three above missing', () => {
    const bundledDir = path.join(tmpDir, 'bundled-schemas');
    fs.mkdirSync(bundledDir, { recursive: true });
    const taskSchema = { type: 'object', required: ['taskId'], properties: {}, _source: 'bundled' };
    fs.writeFileSync(path.join(bundledDir, 'task.schema.json'), JSON.stringify(taskSchema));

    const schemas = loadSchemas({
      cwd: path.join(tmpDir, 'empty-project'),
      pluginDir: path.join(tmpDir, 'no-plugin'),
      bundledDir,
    });
    assert.equal(schemas['task']._source, 'bundled');
  });
});

describe('loadSchemas — memoization', () => {
  test('second call returns same object reference (no extra file I/O)', () => {
    const schemas1 = loadSchemas({ cwd: tmpDir });
    const schemas2 = loadSchemas({ cwd: tmpDir });
    assert.strictEqual(schemas1, schemas2, 'expected same object reference (memoized)');
  });
});

describe('resetSchemaCache', () => {
  test('clears cache so next call reloads', () => {
    const schemas1 = loadSchemas({ cwd: tmpDir });
    resetSchemaCache();
    const schemas2 = loadSchemas({ cwd: tmpDir });
    // After reset the cache should be rebuilt — not the same reference
    assert.notStrictEqual(schemas1, schemas2, 'expected new reference after cache reset');
  });
});
