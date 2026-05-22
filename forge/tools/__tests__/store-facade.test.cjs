'use strict';
// Regression test for tools/lib/store-facade.cjs after json-io.cjs migration.
// Covers getEntity, _loadDir, and loadForgeConfig via a temp-dir fixture.

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { StoreFacade, loadForgeConfig, resetConfigCache } = require('../lib/store-facade.cjs');

let tmpDir;
let storeDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-facade-test-'));
  storeDir = path.join(tmpDir, '.forge', 'store');
  for (const sub of ['tasks', 'bugs', 'sprints', 'features']) {
    fs.mkdirSync(path.join(storeDir, sub), { recursive: true });
  }
  // Reset config cache so loadForgeConfig reads a fresh config each test
  resetConfigCache();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  resetConfigCache();
});

describe('StoreFacade — getEntity (via json-io.cjs readJson)', () => {
  test('returns null for non-existent entity', () => {
    const facade = new StoreFacade(storeDir);
    const result = facade.getEntity('tasks', 'T-MISSING');
    assert.equal(result, null);
  });

  test('returns parsed object for existing entity', () => {
    const taskData = { taskId: 'T-001', sprintId: 'S-01', title: 'Test task', status: 'planned', path: 'eng/t01' };
    fs.writeFileSync(
      path.join(storeDir, 'tasks', 'T-001.json'),
      JSON.stringify(taskData, null, 2)
    );
    const facade = new StoreFacade(storeDir);
    const result = facade.getEntity('tasks', 'T-001');
    assert.deepEqual(result, taskData);
  });

  test('returns null for unknown entity type', () => {
    const facade = new StoreFacade(storeDir);
    const result = facade.getEntity('unknown_type', 'X-001');
    assert.equal(result, null);
  });
});

describe('StoreFacade — _loadDir (via json-io.cjs readJson)', () => {
  test('returns empty array when directory has no JSON files', () => {
    const facade = new StoreFacade(storeDir);
    const result = facade._loadDir('tasks');
    assert.deepEqual(result, []);
  });

  test('returns all JSON records from directory', () => {
    const t1 = { taskId: 'T-001', title: 'One', status: 'planned' };
    const t2 = { taskId: 'T-002', title: 'Two', status: 'implemented' };
    fs.writeFileSync(path.join(storeDir, 'tasks', 'T-001.json'), JSON.stringify(t1));
    fs.writeFileSync(path.join(storeDir, 'tasks', 'T-002.json'), JSON.stringify(t2));
    const facade = new StoreFacade(storeDir);
    const results = facade._loadDir('tasks');
    assert.equal(results.length, 2);
    const ids = results.map(r => r.taskId).sort();
    assert.deepEqual(ids, ['T-001', 'T-002']);
  });

  test('skips malformed JSON files (returns null-filtered)', () => {
    fs.writeFileSync(path.join(storeDir, 'tasks', 'bad.json'), '{ not json }');
    fs.writeFileSync(path.join(storeDir, 'tasks', 'good.json'), JSON.stringify({ taskId: 'T-OK' }));
    const facade = new StoreFacade(storeDir);
    const results = facade._loadDir('tasks');
    // bad.json throws → filtered out; good.json survives
    assert.equal(results.length, 1);
    assert.equal(results[0].taskId, 'T-OK');
  });

  test('returns empty array for non-existent directory', () => {
    const facade = new StoreFacade(storeDir);
    const result = facade._loadDir('nonexistent');
    assert.deepEqual(result, []);
  });
});

describe('loadForgeConfig (via json-io.cjs readJson)', () => {
  test('returns defaults when no config file exists', () => {
    const cfg = loadForgeConfig(tmpDir);
    assert.ok(cfg);
    assert.equal(typeof cfg.prefix, 'string');
    assert.equal(typeof cfg.storePathRel, 'string');
  });

  test('reads config from .forge/config.json', () => {
    const forgeDir = path.join(tmpDir, '.forge');
    fs.mkdirSync(forgeDir, { recursive: true });
    fs.writeFileSync(
      path.join(forgeDir, 'config.json'),
      JSON.stringify({
        project: { prefix: 'MYPROJ', name: 'My Project' },
        paths: { store: '.forge/store', engineering: 'engineering' }
      })
    );
    const cfg = loadForgeConfig(tmpDir);
    assert.equal(cfg.prefix, 'MYPROJ');
    assert.equal(cfg.projectName, 'My Project');
  });
});
