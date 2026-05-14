'use strict';
// Plan-11 / Slice 2 / #26 — backfill-provider.cjs (test-first, Iron Law 2).
//
// Migration helper for 0.43.13 → 0.43.14. Walks `.forge/store/events/**/*.json`
// and stamps `provider: "unknown"` onto any event missing the field.
// Sidecar files (leading underscore) are skipped.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TOOL = path.join(__dirname, '..', 'backfill-provider.cjs');

function makeStore(events) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-backfill-'));
  const root = path.join(tmp, '.forge', 'store', 'events');
  for (const [relPath, body] of Object.entries(events)) {
    const fp = path.join(root, relPath);
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, JSON.stringify(body, null, 2), 'utf8');
  }
  return tmp;
}

function runTool(cwd, extra = []) {
  return spawnSync(process.execPath, [TOOL, ...extra], { cwd, encoding: 'utf8' });
}

function readEvent(cwd, rel) {
  return JSON.parse(fs.readFileSync(path.join(cwd, '.forge', 'store', 'events', rel), 'utf8'));
}

describe('backfill-provider.cjs', () => {
  test('stamps provider:"unknown" on events missing the field', () => {
    const cwd = makeStore({
      'S01/ev1.json': { eventId: 'ev1', model: 'foo' },
      'S01/ev2.json': { eventId: 'ev2', model: 'bar' },
    });
    const r = runTool(cwd);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.equal(readEvent(cwd, 'S01/ev1.json').provider, 'unknown');
    assert.equal(readEvent(cwd, 'S01/ev2.json').provider, 'unknown');
  });

  test('leaves events that already have a provider untouched', () => {
    const cwd = makeStore({
      'S01/ev1.json': { eventId: 'ev1', provider: 'anthropic', model: 'foo' },
    });
    const r = runTool(cwd);
    assert.equal(r.status, 0);
    assert.equal(readEvent(cwd, 'S01/ev1.json').provider, 'anthropic');
  });

  test('skips sidecar files (leading underscore)', () => {
    const cwd = makeStore({
      'S01/_ev1_usage.json': { eventId: 'ev1', inputTokens: 100 },
      'S01/ev2.json':        { eventId: 'ev2', model: 'foo' },
    });
    const r = runTool(cwd);
    assert.equal(r.status, 0);
    const sidecar = readEvent(cwd, 'S01/_ev1_usage.json');
    assert.equal(sidecar.provider, undefined, 'sidecar must not be stamped');
    assert.equal(readEvent(cwd, 'S01/ev2.json').provider, 'unknown');
  });

  test('runs from any cwd via --root', () => {
    const cwd = makeStore({ 'S01/ev1.json': { eventId: 'ev1' } });
    const r = spawnSync(
      process.execPath,
      [TOOL, '--root', path.join(cwd, '.forge', 'store')],
      { cwd: os.tmpdir(), encoding: 'utf8' },
    );
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.equal(readEvent(cwd, 'S01/ev1.json').provider, 'unknown');
  });

  test('reports a summary line on stdout', () => {
    const cwd = makeStore({
      'S01/ev1.json': { eventId: 'ev1' },
      'S01/ev2.json': { eventId: 'ev2', provider: 'anthropic' },
    });
    const r = runTool(cwd);
    assert.match(r.stdout, /backfill-provider/i);
    assert.match(r.stdout, /1/); // 1 stamped
  });

  test('exits 0 when there are no events to walk', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-backfill-empty-'));
    const r = runTool(cwd);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
  });

  test('skips malformed JSON (does not crash)', () => {
    const cwd = makeStore({ 'S01/ev1.json': { eventId: 'ev1' } });
    fs.writeFileSync(
      path.join(cwd, '.forge', 'store', 'events', 'S01', 'broken.json'),
      'not-json',
      'utf8',
    );
    const r = runTool(cwd);
    assert.equal(r.status, 0);
    assert.equal(readEvent(cwd, 'S01/ev1.json').provider, 'unknown');
  });
});
