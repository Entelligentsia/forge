'use strict';
// Tests for `read --format flat` — a non-JSON, token-efficient read mode that
// emits flat `key: value` lines (nested objects → dotted keys). Added to cut the
// token cost of reading store records when the model wants the record, not JSON.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const STORE_CLI = path.join(__dirname, '..', 'store-cli.cjs');

function makeTempStore() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-readfmt-'));
  fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'tasks'), { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, '.forge', 'config.json'),
    JSON.stringify({ paths: { store: '.forge/store' } }, null, 2),
  );
  return tmpDir;
}

function writeTaskFile(tmpDir, taskId, data) {
  fs.writeFileSync(
    path.join(tmpDir, '.forge', 'store', 'tasks', `${taskId}.json`),
    JSON.stringify(data, null, 2),
  );
}

function run(tmpDir, ...a) {
  return spawnSync(process.execPath, [STORE_CLI, ...a], { cwd: tmpDir, encoding: 'utf8' });
}

describe('store-cli read --format flat', () => {
  test('emits flat key: value lines, not JSON; flattens nested objects + arrays', () => {
    const tmp = makeTempStore();
    writeTaskFile(tmp, 'T01', {
      taskId: 'T01', sprintId: 'S01', title: 'Test', status: 'implementing', path: 'eng/t01',
      dependencies: ['T00', 'T00b'],
      summaries: { plan: { objective: 'do x', verdict: 'approved' } },
    });
    const r = run(tmp, 'read', 'task', 'T01', '--format', 'flat');
    assert.equal(r.status, 0, r.stderr);
    const out = r.stdout.trim();
    assert.ok(!out.startsWith('{'), 'flat output must not be JSON');
    assert.match(out, /^taskId: T01$/m);
    assert.match(out, /^status: implementing$/m);
    assert.match(out, /^dependencies: T00, T00b$/m);
    assert.match(out, /^summaries\.plan\.objective: do x$/m);
    assert.match(out, /^summaries\.plan\.verdict: approved$/m);
  });

  test('respects --fields projection in flat format', () => {
    const tmp = makeTempStore();
    writeTaskFile(tmp, 'T01', { taskId: 'T01', sprintId: 'S01', title: 'T', status: 'planned', path: 'p' });
    const r = run(tmp, 'read', 'task', 'T01', '--fields', 'status', '--format', 'flat');
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), 'status: planned');
  });

  test('default read stays pretty JSON (back-compat)', () => {
    const tmp = makeTempStore();
    writeTaskFile(tmp, 'T01', { taskId: 'T01', sprintId: 'S01', title: 'T', status: 'planned', path: 'p' });
    const r = run(tmp, 'read', 'task', 'T01');
    assert.equal(r.status, 0, r.stderr);
    assert.ok(r.stdout.trim().startsWith('{'), 'default read must remain JSON');
  });

  test('--json still emits compact JSON (back-compat)', () => {
    const tmp = makeTempStore();
    writeTaskFile(tmp, 'T01', { taskId: 'T01', sprintId: 'S01', title: 'T', status: 'planned', path: 'p' });
    const r = run(tmp, 'read', 'task', 'T01', '--json');
    assert.equal(r.status, 0, r.stderr);
    const out = r.stdout.trim();
    assert.ok(out.startsWith('{') && !out.includes('\n'), 'compact JSON expected');
  });
});
