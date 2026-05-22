'use strict';
// FORGE-S24-T07 — queue drain at sprint close (per-task curator → batched review).
//
// Iron Law 2: this test is written BEFORE queue-drain.cjs lands.
//
// Contract under test (per TASK_PROMPT.md acceptance criteria):
//   AC1. Queue path: `.forge/enhancement-proposals/queue/<sprint>/<task>-<ts>.json`.
//        Append-only by curators; never overwritten.
//   AC2. Multiple per-task curator runs append to queue without collision —
//        each call produces a fresh `<task>-<ts>.json` file; nothing is
//        overwritten because the timestamp suffix differentiates writes.
//   AC3. Phase 2 reads queue, dedupes by `{op, target_path, body-hash}`.
//   AC4. One drain produces a single batch (the input to the downstream
//        compression gate / replay scoring / judge); not one batch per task.
//   AC5. Empty / missing queue → drain returns `{ proposals: [], files: [] }`
//        without throwing, so Phase 2 can exit cleanly on first-run.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const os     = require('node:os');
const path   = require('node:path');
const crypto = require('node:crypto');

const {
  bodyHash,
  dedupeKey,
  dedupeProposals,
  queuePathFor,
  appendToQueue,
  drainQueue,
} = require('../queue-drain.cjs');

const SPRINT = 'FORGE-S24';
const TASK   = 'FORGE-S24-T07';

function mkTmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'forge-queue-drain-'));
}

function makeProposal(over = {}) {
  return {
    op:          'update_skill',
    target_path: 'forge/skills/engineer-skills.md',
    diff_body:   '+ new guidance',
    rationale:   'fixture',
    sourceFrictionIds: ['f-1'],
    ...over,
  };
}

describe('queue-drain — exports', () => {
  test('all required functions exported', () => {
    assert.equal(typeof bodyHash,        'function');
    assert.equal(typeof dedupeKey,       'function');
    assert.equal(typeof dedupeProposals, 'function');
    assert.equal(typeof queuePathFor,    'function');
    assert.equal(typeof appendToQueue,   'function');
    assert.equal(typeof drainQueue,      'function');
  });
});

describe('queue-drain — bodyHash', () => {
  test('stable sha256 hex digest', () => {
    const h = bodyHash('hello');
    assert.equal(typeof h, 'string');
    assert.match(h, /^[0-9a-f]{64}$/);
    // Independent reference value.
    const ref = crypto.createHash('sha256').update('hello', 'utf8').digest('hex');
    assert.equal(h, ref);
  });

  test('different bodies hash differently; identical bodies hash identically', () => {
    assert.notEqual(bodyHash('a'), bodyHash('b'));
    assert.equal(bodyHash('same'), bodyHash('same'));
  });

  test('empty body hashes to the sha256 empty digest', () => {
    assert.equal(
      bodyHash(''),
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });
});

describe('queue-drain — dedupeKey', () => {
  test('keys on op + target_path + body-hash (AC3)', () => {
    const p = makeProposal();
    const k = dedupeKey(p);
    const expected = `${p.op}|${p.target_path}|${bodyHash(p.diff_body)}`;
    assert.equal(k, expected);
  });

  test('differs when any of the three fields differ', () => {
    const base = makeProposal();
    assert.notEqual(dedupeKey(base), dedupeKey({ ...base, op: 'insert_skill' }));
    assert.notEqual(dedupeKey(base), dedupeKey({ ...base, target_path: 'forge/skills/other.md' }));
    assert.notEqual(dedupeKey(base), dedupeKey({ ...base, diff_body: '+ different body' }));
  });
});

describe('queue-drain — dedupeProposals (AC3)', () => {
  test('drops exact duplicates, preserves first occurrence order', () => {
    const a = makeProposal({ diff_body: 'A' });
    const b = makeProposal({ diff_body: 'B' });
    const aDup = makeProposal({ diff_body: 'A', rationale: 'noise — should not matter for dedup' });
    const result = dedupeProposals([a, b, aDup]);
    assert.equal(result.length, 2);
    assert.equal(result[0].diff_body, 'A');
    assert.equal(result[1].diff_body, 'B');
  });

  test('does not mutate input array', () => {
    const a = makeProposal({ diff_body: 'A' });
    const input = [a, makeProposal({ diff_body: 'A' })];
    const snapshot = input.slice();
    dedupeProposals(input);
    assert.deepEqual(input, snapshot);
  });

  test('returns an empty array for an empty input', () => {
    assert.deepEqual(dedupeProposals([]), []);
  });

  test('throws on non-array input', () => {
    assert.throws(() => dedupeProposals(null), /array/);
    assert.throws(() => dedupeProposals({}),   /array/);
  });
});

describe('queue-drain — queuePathFor (AC1)', () => {
  test('produces `.forge/enhancement-proposals/queue/<sprint>/<task>-<ts>.json`', () => {
    const p = queuePathFor({
      queueRoot: '.forge/enhancement-proposals/queue',
      sprintId:  SPRINT,
      taskId:    TASK,
      ts:        '20260522T103045000Z',
    });
    assert.equal(
      p,
      '.forge/enhancement-proposals/queue/FORGE-S24/FORGE-S24-T07-20260522T103045000Z.json',
    );
  });

  test('input validation', () => {
    assert.throws(() => queuePathFor({}), /sprintId/);
    assert.throws(() => queuePathFor({ sprintId: SPRINT }), /taskId/);
    assert.throws(() => queuePathFor({ sprintId: SPRINT, taskId: TASK }), /ts/);
  });
});

describe('queue-drain — appendToQueue (AC1, AC2)', () => {
  test('creates the file with proposals; never overwrites existing files', () => {
    const root = mkTmpdir();
    const queueRoot = path.join(root, '.forge/enhancement-proposals/queue');
    const p1 = appendToQueue({
      queueRoot, sprintId: SPRINT, taskId: TASK, ts: '20260522T103045000Z',
      proposals: [makeProposal({ diff_body: 'A' })],
    });
    const p2 = appendToQueue({
      queueRoot, sprintId: SPRINT, taskId: TASK, ts: '20260522T103046000Z',
      proposals: [makeProposal({ diff_body: 'B' })],
    });
    assert.notEqual(p1, p2);
    assert.ok(fs.existsSync(p1));
    assert.ok(fs.existsSync(p2));
    const a = JSON.parse(fs.readFileSync(p1, 'utf8'));
    const b = JSON.parse(fs.readFileSync(p2, 'utf8'));
    assert.equal(a[0].diff_body, 'A');
    assert.equal(b[0].diff_body, 'B');
  });

  test('refuses to overwrite if the exact path already exists (AC1 append-only)', () => {
    const root = mkTmpdir();
    const queueRoot = path.join(root, '.forge/enhancement-proposals/queue');
    appendToQueue({
      queueRoot, sprintId: SPRINT, taskId: TASK, ts: '20260522T103045000Z',
      proposals: [makeProposal()],
    });
    assert.throws(
      () => appendToQueue({
        queueRoot, sprintId: SPRINT, taskId: TASK, ts: '20260522T103045000Z',
        proposals: [makeProposal()],
      }),
      /exists/i,
    );
  });
});

describe('queue-drain — drainQueue (AC3, AC4, AC5)', () => {
  test('returns empty result when queue dir missing or empty (AC5)', () => {
    const root = mkTmpdir();
    const empty = drainQueue({
      queueRoot: path.join(root, '.forge/enhancement-proposals/queue'),
      sprintId:  SPRINT,
    });
    assert.deepEqual(empty.proposals, []);
    assert.deepEqual(empty.files,     []);

    // After mkdir but no files:
    fs.mkdirSync(path.join(root, '.forge/enhancement-proposals/queue', SPRINT), { recursive: true });
    const stillEmpty = drainQueue({
      queueRoot: path.join(root, '.forge/enhancement-proposals/queue'),
      sprintId:  SPRINT,
    });
    assert.deepEqual(stillEmpty.proposals, []);
    assert.deepEqual(stillEmpty.files,     []);
  });

  test('merges multiple per-task files into one deduped batch (AC3, AC4)', () => {
    const root = mkTmpdir();
    const queueRoot = path.join(root, '.forge/enhancement-proposals/queue');

    appendToQueue({
      queueRoot, sprintId: SPRINT, taskId: 'FORGE-S24-T01', ts: '20260522T100000000Z',
      proposals: [
        makeProposal({ diff_body: 'A' }),
        makeProposal({ diff_body: 'B', target_path: 'forge/skills/architect-skills.md' }),
      ],
    });
    appendToQueue({
      queueRoot, sprintId: SPRINT, taskId: 'FORGE-S24-T02', ts: '20260522T100500000Z',
      proposals: [
        // Exact dup of A (same op + target + body) — should collapse:
        makeProposal({ diff_body: 'A', rationale: 'different rationale, same body' }),
        // New proposal C:
        makeProposal({ diff_body: 'C', op: 'insert_skill', target_path: 'forge/skills/new.md' }),
      ],
    });

    const drained = drainQueue({ queueRoot, sprintId: SPRINT });
    assert.equal(drained.files.length,    2);
    assert.equal(drained.proposals.length, 3); // A, B, C — duplicate A collapsed
    const bodies = drained.proposals.map((p) => p.diff_body).sort();
    assert.deepEqual(bodies, ['A', 'B', 'C']);
  });

  test('only reads files inside the sprint subdir (scoping)', () => {
    const root = mkTmpdir();
    const queueRoot = path.join(root, '.forge/enhancement-proposals/queue');
    appendToQueue({
      queueRoot, sprintId: SPRINT, taskId: 'FORGE-S24-T01', ts: '20260522T100000000Z',
      proposals: [makeProposal({ diff_body: 'IN' })],
    });
    appendToQueue({
      queueRoot, sprintId: 'FORGE-S23', taskId: 'FORGE-S23-T01', ts: '20260522T100000000Z',
      proposals: [makeProposal({ diff_body: 'OUT' })],
    });
    const drained = drainQueue({ queueRoot, sprintId: SPRINT });
    assert.equal(drained.proposals.length, 1);
    assert.equal(drained.proposals[0].diff_body, 'IN');
  });

  test('input validation', () => {
    assert.throws(() => drainQueue({}), /sprintId/);
    assert.throws(() => drainQueue({ sprintId: SPRINT }), /queueRoot/);
  });

  test('skips malformed JSON files but reports them via `errors`', () => {
    const root = mkTmpdir();
    const queueRoot = path.join(root, '.forge/enhancement-proposals/queue');
    const sprintDir = path.join(queueRoot, SPRINT);
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(path.join(sprintDir, 'FORGE-S24-T01-20260522T100000000Z.json'),
      JSON.stringify([makeProposal({ diff_body: 'GOOD' })]));
    fs.writeFileSync(path.join(sprintDir, 'FORGE-S24-T02-20260522T100500000Z.json'),
      '{ not valid json');

    const drained = drainQueue({ queueRoot, sprintId: SPRINT });
    assert.equal(drained.proposals.length, 1);
    assert.equal(drained.proposals[0].diff_body, 'GOOD');
    assert.equal(drained.errors.length, 1);
    assert.match(drained.errors[0].file, /FORGE-S24-T02/);
  });
});
