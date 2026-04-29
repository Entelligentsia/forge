'use strict';
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const loggerPath = path.join(__dirname, '..', 'query-logger.cjs');

function makeTempProject() {
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-ql-'));
  const forgeDir = path.join(proj, '.forge');
  const storeDir = path.join(forgeDir, 'store');
  fs.mkdirSync(storeDir, { recursive: true });
  fs.writeFileSync(path.join(forgeDir, 'config.json'), JSON.stringify({
    project: { prefix: 'WI' },
    paths: { store: '.forge/store' },
  }));
  return { proj, storeDir };
}

function run(env, cwd) {
  return spawnSync(process.execPath, [loggerPath], {
    env: { ...process.env, ...env },
    cwd,
    encoding: 'utf8',
  });
}

describe('query-logger.cjs', () => {
  let proj, storeDir;

  beforeEach(() => {
    ({ proj, storeDir } = makeTempProject());
  });

  test('exits 0 and does nothing when TOOL_INPUT does not contain store-cli query', () => {
    const r = run({ TOOL_INPUT: 'node store-cli.cjs list task' }, proj);
    assert.equal(r.status, 0);
    const logPath = path.join(storeDir, 'query-log.jsonl');
    assert.ok(!fs.existsSync(logPath), 'should not create log file');
  });

  test('exits 0 and appends to query-log.jsonl when TOOL_INPUT contains store-cli query', () => {
    const r = run({ TOOL_INPUT: 'node "$FORGE_ROOT/tools/store-cli.cjs" query --sprint S12' }, proj);
    assert.equal(r.status, 0);
    const logPath = path.join(storeDir, 'query-log.jsonl');
    assert.ok(fs.existsSync(logPath), 'log file should be created');
    const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
    assert.equal(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.equal(entry.tool, 'store-cli');
    assert.equal(entry.command, 'query');
    assert.ok(entry.timestamp);
    assert.ok(entry.input.includes('store-cli query') || entry.input.includes('store-cli.cjs" query'));
  });

  test('appends multiple entries on repeated invocations', () => {
    const env = { TOOL_INPUT: 'node store-cli query --sprint S01' };
    run(env, proj);
    run(env, proj);
    const logPath = path.join(storeDir, 'query-log.jsonl');
    const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
    assert.equal(lines.length, 2);
  });

  test('truncates TOOL_INPUT to 500 chars in log entry', () => {
    const longInput = 'node store-cli query ' + 'x'.repeat(600);
    run({ TOOL_INPUT: longInput }, proj);
    const logPath = path.join(storeDir, 'query-log.jsonl');
    const entry = JSON.parse(fs.readFileSync(logPath, 'utf8').trim());
    assert.ok(entry.input.length <= 500);
  });

  test('reads store path from .forge/config.json', () => {
    // Reconfigure with a custom store path
    const customStore = path.join(proj, 'custom-store');
    fs.mkdirSync(customStore, { recursive: true });
    fs.writeFileSync(path.join(proj, '.forge', 'config.json'), JSON.stringify({
      project: { prefix: 'WI' },
      paths: { store: 'custom-store' },
    }));
    run({ TOOL_INPUT: 'node store-cli query --sprint S01' }, proj);
    const logPath = path.join(customStore, 'query-log.jsonl');
    assert.ok(fs.existsSync(logPath), 'should write to custom store path');
  });

  test('exits 0 silently when TOOL_INPUT env var is missing', () => {
    const r = run({}, proj);
    assert.equal(r.status, 0);
  });
});
