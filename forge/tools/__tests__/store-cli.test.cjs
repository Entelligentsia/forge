'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { isLegalTransition, TRANSITION_MAP, TERMINAL_STATES, FAILED_STATES, validateRecord, NULLABLE_FIELDS, VALID_SUMMARY_PHASES, PHASE_SUMMARY_SCHEMA, _isDateOnly, _dateOnlyToISO, _normalizeBugTimestamps, discoverModel } = require('../store-cli.cjs');

const STORE_CLI = path.join(__dirname, '..', 'store-cli.cjs');

function makeTempStore() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-test-'));
  const tasksDir = path.join(tmpDir, '.forge', 'store', 'tasks');
  const bugsDir  = path.join(tmpDir, '.forge', 'store', 'bugs');
  fs.mkdirSync(tasksDir, { recursive: true });
  fs.mkdirSync(bugsDir,  { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, '.forge', 'config.json'),
    JSON.stringify({ paths: { store: '.forge/store' } }, null, 2)
  );
  return tmpDir;
}

function writeTaskFile(tmpDir, taskId, data) {
  fs.writeFileSync(
    path.join(tmpDir, '.forge', 'store', 'tasks', `${taskId}.json`),
    JSON.stringify(data, null, 2)
  );
}

function readTaskFile(tmpDir, taskId) {
  return JSON.parse(
    fs.readFileSync(path.join(tmpDir, '.forge', 'store', 'tasks', `${taskId}.json`), 'utf8')
  );
}

function writeBugFile(tmpDir, bugId, data) {
  fs.writeFileSync(
    path.join(tmpDir, '.forge', 'store', 'bugs', `${bugId}.json`),
    JSON.stringify(data, null, 2)
  );
}

function readBugFile(tmpDir, bugId) {
  return JSON.parse(
    fs.readFileSync(path.join(tmpDir, '.forge', 'store', 'bugs', `${bugId}.json`), 'utf8')
  );
}

const MINIMAL_TASK = {
  taskId: 'T01', sprintId: 'S01', title: 'Test', status: 'implementing', path: 'eng/t01'
};
const MINIMAL_BUG = {
  bugId: 'BUG-001', title: 'Test bug', severity: 'minor', status: 'in-progress',
  path: 'eng/bugs/BUG-001', reportedAt: '2026-04-19T10:00:00Z'
};
const VALID_SUMMARY = {
  objective: 'Add set-summary command to store-cli',
  key_changes: ['Added cmdSetSummary function', 'Updated exports'],
  written_at: '2026-04-19T10:00:00Z',
  verdict: 'approved',
  artifact_ref: 'PLAN.md'
};

describe('store-cli.cjs — isLegalTransition', () => {
  test('same-state transition is always legal (no-op)', () => {
    assert.equal(isLegalTransition('task', 'status', 'implementing', 'implementing'), true);
    assert.equal(isLegalTransition('sprint', 'status', 'active', 'active'), true);
  });

  test('implemented -> review-approved is legal for tasks', () => {
    assert.equal(isLegalTransition('task', 'status', 'implemented', 'review-approved'), true);
  });

  test('implementing -> blocked is legal for tasks (failed state)', () => {
    assert.equal(isLegalTransition('task', 'status', 'implementing', 'blocked'), true);
  });

  test('implementing -> implemented is legal for tasks', () => {
    assert.equal(isLegalTransition('task', 'status', 'implementing', 'implemented'), true);
  });

  test('draft -> planned is legal for tasks', () => {
    assert.equal(isLegalTransition('task', 'status', 'draft', 'planned'), true);
  });

  test('planned -> implemented is REJECTED (T25 ADR D-T-2: must go through plan-approved → implementing → implemented)', () => {
    // FORGE-S25-T26: T25 ADR D-T-2 canonicalization — planned does not allow
    // skipping the plan-approval gate. Workflows must pass through plan-approved
    // before implementing. The old behavior (allowed) was incorrect.
    assert.equal(isLegalTransition('task', 'status', 'planned', 'implemented'), false);
  });

  test('terminal state committed cannot transition out', () => {
    assert.equal(isLegalTransition('task', 'status', 'committed', 'implementing'), false);
  });

  test('terminal state abandoned cannot transition out', () => {
    assert.equal(isLegalTransition('task', 'status', 'abandoned', 'draft'), false);
  });

  test('terminal state fixed (bug) cannot transition out', () => {
    // Post-cleanup, bug terminal is `fixed` (was previously `verified`).
    // The `approved` and `verified` enum members were dropped to remove the
    // runtime trap that surfaced via FORGE-BUG-002 (verified → approved
    // illegal transition driven by LLM-translated task workflow).
    assert.equal(isLegalTransition('bug', 'status', 'fixed', 'reported'), false);
    assert.equal(isLegalTransition('bug', 'status', 'fixed', 'in-progress'), false);
    assert.equal(isLegalTransition('bug', 'status', 'fixed', 'triaged'), false);
  });

  test('terminal state retrospective-done (sprint) cannot transition out', () => {
    assert.equal(isLegalTransition('sprint', 'status', 'retrospective-done', 'active'), false);
  });

  test('terminal state shipped (feature) cannot transition out', () => {
    assert.equal(isLegalTransition('feature', 'status', 'shipped', 'active'), false);
  });

  test('failed state blocked can be entered from any non-terminal state', () => {
    assert.equal(isLegalTransition('task', 'status', 'draft', 'blocked'), true);
    assert.equal(isLegalTransition('task', 'status', 'implementing', 'blocked'), true);
    assert.equal(isLegalTransition('task', 'status', 'approved', 'blocked'), true);
  });

  test('failed state escalated can be entered from any non-terminal state', () => {
    assert.equal(isLegalTransition('task', 'status', 'implementing', 'escalated'), true);
  });

  test('illegal explicit transition returns false', () => {
    assert.equal(isLegalTransition('task', 'status', 'draft', 'committed'), false);
    assert.equal(isLegalTransition('task', 'status', 'implementing', 'planned'), false);
  });

  // gh#98: plan-revision-required must have outgoing transitions
  test('plan-revision-required -> planned is legal (gh#98)', () => {
    assert.equal(isLegalTransition('task', 'status', 'plan-revision-required', 'planned'), true);
  });

  test('plan-revision-required -> blocked is legal', () => {
    assert.equal(isLegalTransition('task', 'status', 'plan-revision-required', 'blocked'), true);
  });

  test('plan-revision-required -> escalated is legal', () => {
    assert.equal(isLegalTransition('task', 'status', 'plan-revision-required', 'escalated'), true);
  });

  test('plan-revision-required -> abandoned is legal', () => {
    assert.equal(isLegalTransition('task', 'status', 'plan-revision-required', 'abandoned'), true);
  });

  test('plan-revision-required -> implementing is illegal (must go through planned)', () => {
    assert.equal(isLegalTransition('task', 'status', 'plan-revision-required', 'implementing'), false);
  });

  // gh#99: code-revision-required must have outgoing transitions
  test('code-revision-required -> implementing is legal (gh#99)', () => {
    assert.equal(isLegalTransition('task', 'status', 'code-revision-required', 'implementing'), true);
  });

  test('code-revision-required -> blocked is legal', () => {
    assert.equal(isLegalTransition('task', 'status', 'code-revision-required', 'blocked'), true);
  });

  test('code-revision-required -> escalated is legal', () => {
    assert.equal(isLegalTransition('task', 'status', 'code-revision-required', 'escalated'), true);
  });

  test('code-revision-required -> abandoned is legal', () => {
    assert.equal(isLegalTransition('task', 'status', 'code-revision-required', 'abandoned'), true);
  });

  test('code-revision-required -> planned is illegal (must go through implementing)', () => {
    assert.equal(isLegalTransition('task', 'status', 'code-revision-required', 'planned'), false);
  });

  test('unknown entity type returns true (no transition rules)', () => {
    assert.equal(isLegalTransition('unknown', 'status', 'foo', 'bar'), true);
  });

  test('unknown current state in task table returns false', () => {
    assert.equal(isLegalTransition('task', 'status', 'nonexistent_state', 'implementing'), false);
  });

  test('bug: reported -> triaged is legal', () => {
    assert.equal(isLegalTransition('bug', 'status', 'reported', 'triaged'), true);
  });

  test('bug: triaged -> in-progress is legal', () => {
    assert.equal(isLegalTransition('bug', 'status', 'triaged', 'in-progress'), true);
  });

  test('bug: in-progress -> fixed is legal', () => {
    assert.equal(isLegalTransition('bug', 'status', 'in-progress', 'fixed'), true);
  });

  test('bug: reported -> fixed is illegal (not in transition table)', () => {
    assert.equal(isLegalTransition('bug', 'status', 'reported', 'fixed'), false);
  });

  test('bug: in-progress -> approved is illegal (approved removed from enum)', () => {
    // Post-cleanup, `approved` is no longer a bug status. Any LLM-translated
    // task workflow attempting this transition must be rejected.
    assert.equal(isLegalTransition('bug', 'status', 'in-progress', 'approved'), false);
  });

  test('bug: fixed -> verified is illegal (verified removed from enum)', () => {
    // Post-cleanup, `verified` is no longer a bug status. Terminal is `fixed`.
    assert.equal(isLegalTransition('bug', 'status', 'fixed', 'verified'), false);
  });

  test('sprint: planning -> active is legal', () => {
    assert.equal(isLegalTransition('sprint', 'status', 'planning', 'active'), true);
  });

  test('sprint: active -> completed is legal', () => {
    assert.equal(isLegalTransition('sprint', 'status', 'active', 'completed'), true);
  });

  test('feature: draft -> active is legal', () => {
    assert.equal(isLegalTransition('feature', 'status', 'draft', 'active'), true);
  });

  test('feature: active -> shipped is legal', () => {
    assert.equal(isLegalTransition('feature', 'status', 'active', 'shipped'), true);
  });
});

describe('store-cli.cjs — TERMINAL_STATES', () => {
  test('contains committed and abandoned (task)', () => {
    assert.ok(TERMINAL_STATES.has('committed'), 'should contain committed');
    assert.ok(TERMINAL_STATES.has('abandoned'), 'should contain abandoned');
  });

  test('contains retrospective-done (sprint)', () => {
    assert.ok(TERMINAL_STATES.has('retrospective-done'), 'should contain retrospective-done');
  });

  test('contains fixed (bug)', () => {
    // Post-cleanup, bug terminal is `fixed` (was previously `verified`).
    assert.ok(TERMINAL_STATES.has('fixed'), 'should contain fixed');
    assert.ok(!TERMINAL_STATES.has('verified'), 'should NOT contain verified (vestigial, removed)');
  });

  test('contains shipped and retired (feature)', () => {
    assert.ok(TERMINAL_STATES.has('shipped'), 'should contain shipped');
    assert.ok(TERMINAL_STATES.has('retired'), 'should contain retired');
  });

  test('does not contain non-terminal states', () => {
    assert.ok(!TERMINAL_STATES.has('implementing'), 'implementing is not terminal');
    assert.ok(!TERMINAL_STATES.has('active'), 'active is not terminal');
  });
});

describe('store-cli.cjs — FAILED_STATES', () => {
  test('does NOT contain blocked (T25 ADR: blocked is an explicit table entry, not a bypass state)', () => {
    // FORGE-S25-T26: blocked removed from FAILED_STATES so isLegalTransition
    // enforces the explicit table for transitions into/out of blocked.
    assert.ok(!FAILED_STATES.has('blocked'), 'blocked must NOT be in FAILED_STATES (T25 ADR)');
  });

  test('contains escalated', () => {
    assert.ok(FAILED_STATES.has('escalated'), 'should contain escalated');
  });

  test('contains abandoned', () => {
    assert.ok(FAILED_STATES.has('abandoned'), 'should contain abandoned');
  });

  test('does NOT contain plan-revision-required (T25 ADR: explicit table entry, not a bypass state)', () => {
    // FORGE-S25-T26: plan-revision-required removed from FAILED_STATES so that
    // D-T-1 is enforced: draft must not allow plan-revision-required.
    assert.ok(!FAILED_STATES.has('plan-revision-required'), 'plan-revision-required must NOT be in FAILED_STATES (T25 ADR)');
  });

  test('does NOT contain code-revision-required (T25 ADR: explicit table entry, not a bypass state)', () => {
    // FORGE-S25-T26: code-revision-required removed from FAILED_STATES so that
    // D-T-2/D-T-3/D-T-4 are enforced properly via the transition table.
    assert.ok(!FAILED_STATES.has('code-revision-required'), 'code-revision-required must NOT be in FAILED_STATES (T25 ADR)');
  });

  test('contains partially-completed (sprint)', () => {
    assert.ok(FAILED_STATES.has('partially-completed'), 'should contain partially-completed');
  });

  test('does not contain happy-path states', () => {
    assert.ok(!FAILED_STATES.has('implementing'), 'implementing is not a failed state');
    assert.ok(!FAILED_STATES.has('committed'), 'committed is terminal, not failed');
  });
});

describe('store-cli.cjs — TRANSITION_MAP', () => {
  test('has entries for all entity types', () => {
    assert.ok(TRANSITION_MAP.task, 'should have task transitions');
    assert.ok(TRANSITION_MAP.sprint, 'should have sprint transitions');
    assert.ok(TRANSITION_MAP.bug, 'should have bug transitions');
    assert.ok(TRANSITION_MAP.feature, 'should have feature transitions');
  });

  test('task transitions have expected keys', () => {
    const taskKeys = Object.keys(TRANSITION_MAP.task);
    assert.ok(taskKeys.includes('draft'), 'task should have draft state');
    assert.ok(taskKeys.includes('implementing'), 'task should have implementing state');
    assert.ok(taskKeys.includes('approved'), 'task should have approved state');
  });

  test('does not have event transitions', () => {
    assert.ok(!TRANSITION_MAP.event, 'events should not have transition rules');
  });
});

describe('store-cli.cjs — validateRecord', () => {
  test('returns empty array for valid record', () => {
    const schema = { required: ['name'], properties: { name: { type: 'string' } } };
    const errors = validateRecord({ name: 'test' }, schema);
    assert.equal(errors.length, 0);
  });

  test('reports missing required fields', () => {
    const schema = { required: ['name', 'age'], properties: {} };
    const errors = validateRecord({}, schema);
    assert.ok(errors.length >= 2, `expected at least 2 errors, got ${errors.length}`);
    assert.ok(errors.some(e => e.includes('name')), 'should report missing name');
    assert.ok(errors.some(e => e.includes('age')), 'should report missing age');
  });

  test('rejects undeclared fields when additionalProperties is false', () => {
    const schema = { required: ['name'], properties: { name: { type: 'string' } }, additionalProperties: false };
    const errors = validateRecord({ name: 'test', extra: 'value' }, schema);
    assert.ok(errors.some(e => e.includes('undeclared field')), 'should report undeclared field');
  });

  test('allows null in nullable fields', () => {
    const schema = { required: ['sprintId'], properties: { sprintId: { type: 'string' } } };
    const errors = validateRecord({ sprintId: null }, schema);
    // sprintId is in NULLABLE_FIELDS so null should be allowed
    assert.equal(errors.length, 0, 'null should be allowed in nullable field');
  });

  test('reports type mismatches', () => {
    const schema = { required: [], properties: { count: { type: 'integer' } } };
    const errors = validateRecord({ count: 'not-a-number' }, schema);
    assert.ok(errors.length > 0, 'should report type mismatch');
    assert.ok(errors[0].includes('expected'), 'error should mention expected type');
  });

  test('reports enum violations', () => {
    const schema = { required: [], properties: { status: { type: 'string', enum: ['active', 'closed'] } } };
    const errors = validateRecord({ status: 'unknown' }, schema);
    assert.ok(errors.length > 0, 'should report enum violation');
    assert.ok(errors[0].includes('not in'), 'error should mention enum violation');
  });

  test('reports minimum violations', () => {
    const schema = { required: [], properties: { count: { type: 'integer', minimum: 1 } } };
    const errors = validateRecord({ count: 0 }, schema);
    assert.ok(errors.length > 0, 'should report minimum violation');
    assert.ok(errors[0].includes('below minimum'), 'error should mention minimum');
  });
});

describe('store-cli.cjs — NULLABLE_FIELDS', () => {
  test('contains sprintId', () => {
    assert.ok(NULLABLE_FIELDS.has('sprintId'), 'should contain sprintId');
  });

  test('contains taskId', () => {
    assert.ok(NULLABLE_FIELDS.has('taskId'), 'should contain taskId');
  });

  test('contains endTimestamp', () => {
    assert.ok(NULLABLE_FIELDS.has('endTimestamp'), 'should contain endTimestamp');
  });

  test('contains durationMinutes', () => {
    assert.ok(NULLABLE_FIELDS.has('durationMinutes'), 'should contain durationMinutes');
  });
});

describe('store-cli.cjs — VALID_SUMMARY_PHASES', () => {
  test('contains plan', () => assert.ok(VALID_SUMMARY_PHASES.has('plan')));
  test('contains review_plan', () => assert.ok(VALID_SUMMARY_PHASES.has('review_plan')));
  test('contains implementation', () => assert.ok(VALID_SUMMARY_PHASES.has('implementation')));
  test('contains code_review', () => assert.ok(VALID_SUMMARY_PHASES.has('code_review')));
  test('contains validation', () => assert.ok(VALID_SUMMARY_PHASES.has('validation')));
  test('does not contain unknown phase', () => assert.ok(!VALID_SUMMARY_PHASES.has('foo')));
  test('does not contain plan-fix (bug phase)', () => assert.ok(!VALID_SUMMARY_PHASES.has('plan-fix')));
});

describe('store-cli.cjs — PHASE_SUMMARY_SCHEMA', () => {
  test('is an object with required and properties', () => {
    assert.ok(PHASE_SUMMARY_SCHEMA && typeof PHASE_SUMMARY_SCHEMA === 'object');
    assert.ok(Array.isArray(PHASE_SUMMARY_SCHEMA.required));
    assert.ok(typeof PHASE_SUMMARY_SCHEMA.properties === 'object');
  });
  test('requires objective and written_at', () => {
    assert.ok(PHASE_SUMMARY_SCHEMA.required.includes('objective'));
    assert.ok(PHASE_SUMMARY_SCHEMA.required.includes('written_at'));
  });
  test('has additionalProperties: false', () => {
    assert.equal(PHASE_SUMMARY_SCHEMA.additionalProperties, false);
  });
  test('objective has maxLength 280', () => {
    assert.equal(PHASE_SUMMARY_SCHEMA.properties.objective.maxLength, 280);
  });
  test('key_changes has maxItems 12', () => {
    assert.equal(PHASE_SUMMARY_SCHEMA.properties.key_changes.maxItems, 12);
  });
  test('findings has maxItems 12', () => {
    assert.equal(PHASE_SUMMARY_SCHEMA.properties.findings.maxItems, 12);
  });
  test('verdict enum has approved, revision, n/a', () => {
    const en = PHASE_SUMMARY_SCHEMA.properties.verdict.enum;
    assert.ok(en.includes('approved'));
    assert.ok(en.includes('revision'));
    assert.ok(en.includes('n/a'));
  });
});

describe('store-cli.cjs — validateRecord maxLength/maxItems extensions', () => {
  test('valid phaseSummary passes', () => {
    const errors = validateRecord(VALID_SUMMARY, PHASE_SUMMARY_SCHEMA);
    assert.equal(errors.length, 0, `unexpected errors: ${errors.join(', ')}`);
  });

  test('missing objective rejects', () => {
    const { objective: _, ...rest } = VALID_SUMMARY;
    const errors = validateRecord(rest, PHASE_SUMMARY_SCHEMA);
    assert.ok(errors.length > 0);
    assert.ok(errors.some(e => e.includes('objective')));
  });

  test('missing written_at rejects', () => {
    const { written_at: _, ...rest } = VALID_SUMMARY;
    const errors = validateRecord(rest, PHASE_SUMMARY_SCHEMA);
    assert.ok(errors.length > 0);
    assert.ok(errors.some(e => e.includes('written_at')));
  });

  test('objective at 281 chars rejects (maxLength: 280)', () => {
    const errors = validateRecord({ ...VALID_SUMMARY, objective: 'x'.repeat(281) }, PHASE_SUMMARY_SCHEMA);
    assert.ok(errors.length > 0, 'expected rejection for overlong objective');
    assert.ok(errors.some(e => e.includes('maxLength') || e.includes('exceeds')));
  });

  test('objective at exactly 280 chars passes', () => {
    const errors = validateRecord({ ...VALID_SUMMARY, objective: 'x'.repeat(280) }, PHASE_SUMMARY_SCHEMA);
    assert.equal(errors.length, 0, `unexpected errors: ${errors.join(', ')}`);
  });

  test('key_changes with 13 items rejects (maxItems: 12)', () => {
    const errors = validateRecord({ ...VALID_SUMMARY, key_changes: new Array(13).fill('change') }, PHASE_SUMMARY_SCHEMA);
    assert.ok(errors.length > 0, 'expected rejection for >12 key_changes');
    assert.ok(errors.some(e => e.includes('maxItems') || e.includes('exceeds')));
  });

  test('key_changes with exactly 12 items passes', () => {
    const errors = validateRecord({ ...VALID_SUMMARY, key_changes: new Array(12).fill('change') }, PHASE_SUMMARY_SCHEMA);
    assert.equal(errors.length, 0, `unexpected errors: ${errors.join(', ')}`);
  });

  test('key_changes item >200 chars rejects (items.maxLength)', () => {
    const errors = validateRecord({ ...VALID_SUMMARY, key_changes: ['x'.repeat(201)] }, PHASE_SUMMARY_SCHEMA);
    assert.ok(errors.length > 0, 'expected rejection for overlong array item');
    assert.ok(errors.some(e => e.includes('maxLength') || e.includes('exceeds')));
  });

  test('key_changes item at exactly 200 chars passes', () => {
    const errors = validateRecord({ ...VALID_SUMMARY, key_changes: ['x'.repeat(200)] }, PHASE_SUMMARY_SCHEMA);
    assert.equal(errors.length, 0, `unexpected errors: ${errors.join(', ')}`);
  });

  test('invalid verdict rejects', () => {
    const errors = validateRecord({ ...VALID_SUMMARY, verdict: 'bad-verdict' }, PHASE_SUMMARY_SCHEMA);
    assert.ok(errors.length > 0);
    assert.ok(errors.some(e => e.includes('not in')));
  });

  test('undeclared field rejects (additionalProperties: false)', () => {
    const errors = validateRecord({ ...VALID_SUMMARY, unknown_field: 'foo' }, PHASE_SUMMARY_SCHEMA);
    assert.ok(errors.length > 0);
    assert.ok(errors.some(e => e.includes('undeclared field')));
  });

  test('findings with 13 items rejects (maxItems: 12)', () => {
    const errors = validateRecord({ ...VALID_SUMMARY, findings: new Array(13).fill('finding') }, PHASE_SUMMARY_SCHEMA);
    assert.ok(errors.length > 0, 'expected rejection for >12 findings');
  });
});

describe('store-cli.cjs — set-summary CLI subprocess tests', () => {
  test('round-trips a valid summary into task JSON', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', MINIMAL_TASK);
      const summaryFile = path.join(tmpDir, 'summary.json');
      fs.writeFileSync(summaryFile, JSON.stringify(VALID_SUMMARY));

      const result = spawnSync(process.execPath, [STORE_CLI, 'set-summary', 'T01', 'plan', summaryFile], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);

      const task = readTaskFile(tmpDir, 'T01');
      assert.ok(task.summaries, 'task should have summaries');
      assert.ok(task.summaries.plan, 'task.summaries.plan should exist');
      assert.equal(task.summaries.plan.objective, VALID_SUMMARY.objective);
      assert.deepEqual(task.summaries.plan.key_changes, VALID_SUMMARY.key_changes);
      assert.equal(task.summaries.plan.verdict, VALID_SUMMARY.verdict);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ADR artifact-resolution Phase 1: the jsonFile arg is optional — when omitted,
  // set-summary self-resolves the sidecar from record.path + phase→filename map,
  // so the call collapses to `set-summary <id> <phase>` (kills the arity bug and
  // the hand-built-path failures).
  test('self-resolves the sidecar from record.path when jsonFile is omitted (task)', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', MINIMAL_TASK); // path: 'eng/t01'
      const sidecarDir = path.join(tmpDir, 'eng', 't01');
      fs.mkdirSync(sidecarDir, { recursive: true });
      fs.writeFileSync(path.join(sidecarDir, 'PLAN-SUMMARY.json'), JSON.stringify(VALID_SUMMARY));

      const result = spawnSync(process.execPath, [STORE_CLI, 'set-summary', 'T01', 'plan'], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.equal(result.status, 0, `2-arg form must succeed; stderr: ${result.stderr}`);

      const task = readTaskFile(tmpDir, 'T01');
      assert.equal(task.summaries.plan.objective, VALID_SUMMARY.objective);
      assert.equal(task.summaries.plan.verdict, VALID_SUMMARY.verdict);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('self-resolves the bug-mode plan sidecar (BUG-FIX-PLAN-SUMMARY.json) when jsonFile omitted', () => {
    const tmpDir = makeTempStore();
    try {
      writeBugFile(tmpDir, 'BUG-001', MINIMAL_BUG); // path: 'eng/bugs/BUG-001'
      const sidecarDir = path.join(tmpDir, 'eng', 'bugs', 'BUG-001');
      fs.mkdirSync(sidecarDir, { recursive: true });
      fs.writeFileSync(path.join(sidecarDir, 'BUG-FIX-PLAN-SUMMARY.json'), JSON.stringify(VALID_SUMMARY));

      const result = spawnSync(process.execPath, [STORE_CLI, 'set-bug-summary', 'BUG-001', 'plan'], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.equal(result.status, 0, `2-arg form must succeed; stderr: ${result.stderr}`);

      const bug = readBugFile(tmpDir, 'BUG-001');
      assert.equal(bug.summaries.plan.objective, VALID_SUMMARY.objective);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('self-resolve with a missing sidecar exits non-zero with a path hint', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', MINIMAL_TASK);
      const result = spawnSync(process.execPath, [STORE_CLI, 'set-summary', 'T01', 'plan'], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.notEqual(result.status, 0, 'missing sidecar must fail');
      assert.ok(/PLAN-SUMMARY\.json|not found/i.test(result.stderr), `stderr should name the resolved sidecar: ${result.stderr}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('explicit jsonFile arg still works (back-compat)', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', MINIMAL_TASK);
      const summaryFile = path.join(tmpDir, 'explicit.json');
      fs.writeFileSync(summaryFile, JSON.stringify(VALID_SUMMARY));
      const result = spawnSync(process.execPath, [STORE_CLI, 'set-summary', 'T01', 'plan', summaryFile], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.equal(result.status, 0, `explicit form must still work; stderr: ${result.stderr}`);
      assert.equal(readTaskFile(tmpDir, 'T01').summaries.plan.objective, VALID_SUMMARY.objective);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('repeated set-summary overwrites, does not append', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', MINIMAL_TASK);
      const summaryFile = path.join(tmpDir, 'summary.json');

      fs.writeFileSync(summaryFile, JSON.stringify(VALID_SUMMARY));
      spawnSync(process.execPath, [STORE_CLI, 'set-summary', 'T01', 'plan', summaryFile], { cwd: tmpDir, encoding: 'utf8' });

      const updated = { ...VALID_SUMMARY, objective: 'Updated objective', verdict: 'revision' };
      fs.writeFileSync(summaryFile, JSON.stringify(updated));
      const result = spawnSync(process.execPath, [STORE_CLI, 'set-summary', 'T01', 'plan', summaryFile], { cwd: tmpDir, encoding: 'utf8' });
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);

      const task = readTaskFile(tmpDir, 'T01');
      assert.equal(task.summaries.plan.objective, 'Updated objective');
      assert.equal(task.summaries.plan.verdict, 'revision');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('missing task ID exits non-zero with task not found message', () => {
    const tmpDir = makeTempStore();
    try {
      const summaryFile = path.join(tmpDir, 'summary.json');
      fs.writeFileSync(summaryFile, JSON.stringify(VALID_SUMMARY));

      const result = spawnSync(process.execPath, [STORE_CLI, 'set-summary', 'NONEXISTENT', 'plan', summaryFile], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.notEqual(result.status, 0, 'should exit non-zero for missing task');
      assert.ok(result.stderr.includes('not found') || result.stderr.includes('NONEXISTENT'), `stderr: ${result.stderr}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('unknown phase name exits non-zero', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', MINIMAL_TASK);
      const summaryFile = path.join(tmpDir, 'summary.json');
      fs.writeFileSync(summaryFile, JSON.stringify(VALID_SUMMARY));

      const result = spawnSync(process.execPath, [STORE_CLI, 'set-summary', 'T01', 'unknown-phase', summaryFile], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.notEqual(result.status, 0, 'should exit non-zero for unknown phase');
      assert.ok(result.stderr.includes('phase') || result.stderr.includes('unknown-phase'), `stderr: ${result.stderr}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('schema violation (missing objective) exits non-zero', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', MINIMAL_TASK);
      const badSummary = { written_at: '2026-04-19T10:00:00Z' }; // missing objective
      const summaryFile = path.join(tmpDir, 'summary.json');
      fs.writeFileSync(summaryFile, JSON.stringify(badSummary));

      const result = spawnSync(process.execPath, [STORE_CLI, 'set-summary', 'T01', 'plan', summaryFile], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.notEqual(result.status, 0, 'should exit non-zero for schema violation');
      assert.ok(result.stderr.includes('objective'), `expected 'objective' in stderr: ${result.stderr}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('overlong key_changes (>12 items) exits non-zero', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', MINIMAL_TASK);
      const badSummary = { ...VALID_SUMMARY, key_changes: new Array(13).fill('x') };
      const summaryFile = path.join(tmpDir, 'summary.json');
      fs.writeFileSync(summaryFile, JSON.stringify(badSummary));

      const result = spawnSync(process.execPath, [STORE_CLI, 'set-summary', 'T01', 'plan', summaryFile], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.notEqual(result.status, 0, 'should exit non-zero for >12 key_changes');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('overlong objective (>280 chars) exits non-zero', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', MINIMAL_TASK);
      const badSummary = { ...VALID_SUMMARY, objective: 'x'.repeat(281) };
      const summaryFile = path.join(tmpDir, 'summary.json');
      fs.writeFileSync(summaryFile, JSON.stringify(badSummary));

      const result = spawnSync(process.execPath, [STORE_CLI, 'set-summary', 'T01', 'plan', summaryFile], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.notEqual(result.status, 0, 'should exit non-zero for overlong objective');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('atomic write: prior JSON intact after successful set-summary', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', { ...MINIMAL_TASK, description: 'original' });
      const summaryFile = path.join(tmpDir, 'summary.json');
      fs.writeFileSync(summaryFile, JSON.stringify(VALID_SUMMARY));

      const result = spawnSync(process.execPath, [STORE_CLI, 'set-summary', 'T01', 'plan', summaryFile], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);

      const task = readTaskFile(tmpDir, 'T01');
      assert.equal(task.description, 'original', 'existing fields must survive set-summary');
      assert.ok(task.summaries.plan, 'summary must be present');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('set-bug-summary round-trips a valid summary into bug JSON', () => {
    const tmpDir = makeTempStore();
    try {
      writeBugFile(tmpDir, 'BUG-001', MINIMAL_BUG);
      const summaryFile = path.join(tmpDir, 'summary.json');
      fs.writeFileSync(summaryFile, JSON.stringify(VALID_SUMMARY));

      const result = spawnSync(process.execPath, [STORE_CLI, 'set-bug-summary', 'BUG-001', 'plan', summaryFile], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);

      const bug = readBugFile(tmpDir, 'BUG-001');
      assert.ok(bug.summaries, 'bug should have summaries');
      assert.ok(bug.summaries.plan, 'bug.summaries.plan should exist');
      assert.equal(bug.summaries.plan.objective, VALID_SUMMARY.objective);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('set-bug-summary accepts triage summary with route field (A or B)', () => {
    // The triage phase records the Path A / Path B route decision via the
    // `route` field on its phase summary. Schema MUST permit it.
    // Regression: EMG-BUG-001 v0.44.2 first attempt failed with
    // "route: undeclared field" because phaseSummary had additionalProperties:false
    // and no route field declared.
    const tmpDir = makeTempStore();
    try {
      writeBugFile(tmpDir, 'BUG-001', MINIMAL_BUG);
      const summaryFile = path.join(tmpDir, 'summary.json');
      fs.writeFileSync(summaryFile, JSON.stringify({
        objective: 'Triage BUG-001',
        findings: ['Root cause: x', 'Reproduction: y', 'Route decision: A'],
        verdict: 'n/a',
        written_at: '2026-05-19T10:00:00Z',
        artifact_ref: 'TRIAGE.md',
        route: 'A',
      }));

      const result = spawnSync(process.execPath, [STORE_CLI, 'set-bug-summary', 'BUG-001', 'triage', summaryFile], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);

      const bug = readBugFile(tmpDir, 'BUG-001');
      assert.equal(bug.summaries.triage.route, 'A');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('set-bug-summary rejects route values other than A or B', () => {
    const tmpDir = makeTempStore();
    try {
      writeBugFile(tmpDir, 'BUG-001', MINIMAL_BUG);
      const summaryFile = path.join(tmpDir, 'summary.json');
      fs.writeFileSync(summaryFile, JSON.stringify({
        objective: 'Triage BUG-001',
        verdict: 'n/a',
        written_at: '2026-05-19T10:00:00Z',
        route: 'C',  // invalid
      }));

      const result = spawnSync(process.execPath, [STORE_CLI, 'set-bug-summary', 'BUG-001', 'triage', summaryFile], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.notEqual(result.status, 0, `expected non-zero exit for invalid route; stderr: ${result.stderr}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('store-cli.cjs — update-status --force is operator-gated (forge#87)', () => {
  // The FSM safety net must not be reachable by an LLM that hit a wall. --force
  // bypasses isLegalTransition, so it requires FORGE_ALLOW_FORCE=1 in the env.
  test('--force without FORGE_ALLOW_FORCE exits non-zero and does not write', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', { ...MINIMAL_TASK, status: 'planned' });
      const env = { ...process.env };
      delete env.FORGE_ALLOW_FORCE;
      const result = spawnSync(process.execPath,
        [STORE_CLI, 'update-status', 'task', 'T01', 'status', 'review-approved', '--force'],
        { cwd: tmpDir, encoding: 'utf8', env });
      assert.notEqual(result.status, 0, `expected non-zero exit; stderr: ${result.stderr}`);
      assert.match(result.stderr, /FORGE_ALLOW_FORCE/,
        `stderr should mention the env var; got: ${result.stderr}`);
      const task = readTaskFile(tmpDir, 'T01');
      assert.equal(task.status, 'planned', 'illegal transition must not be persisted');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('--force with FORGE_ALLOW_FORCE=1 bypasses transition check (with warning)', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', { ...MINIMAL_TASK, status: 'planned' });
      const result = spawnSync(process.execPath,
        [STORE_CLI, 'update-status', 'task', 'T01', 'status', 'review-approved', '--force'],
        { cwd: tmpDir, encoding: 'utf8', env: { ...process.env, FORGE_ALLOW_FORCE: '1' } });
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stderr, /WARN.*--force/,
        `expected --force bypass warning; got: ${result.stderr}`);
      assert.equal(readTaskFile(tmpDir, 'T01').status, 'review-approved');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('legal transition without --force still works (env unset)', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', { ...MINIMAL_TASK, status: 'implemented' });
      const env = { ...process.env };
      delete env.FORGE_ALLOW_FORCE;
      const result = spawnSync(process.execPath,
        [STORE_CLI, 'update-status', 'task', 'T01', 'status', 'review-approved'],
        { cwd: tmpDir, encoding: 'utf8', env });
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(readTaskFile(tmpDir, 'T01').status, 'review-approved');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('store-cli.cjs — schema conformance for summaries field', () => {
  test('PHASE_SUMMARY_SCHEMA validates a minimal valid summary', () => {
    const minimal = { objective: 'test', written_at: '2026-04-19T10:00:00Z' };
    assert.equal(validateRecord(minimal, PHASE_SUMMARY_SCHEMA).length, 0);
  });

  test('PHASE_SUMMARY_SCHEMA rejects extra property', () => {
    const withExtra = { objective: 'test', written_at: '2026-04-19T10:00:00Z', extra: 'bad' };
    const errors = validateRecord(withExtra, PHASE_SUMMARY_SCHEMA);
    assert.ok(errors.some(e => e.includes('undeclared field')));
  });

  test('empty summaries object ({}) satisfies the optional summaries field', () => {
    assert.ok(typeof PHASE_SUMMARY_SCHEMA === 'object', 'schema exists');
  });

  test('all valid verdict values pass', () => {
    for (const verdict of ['approved', 'revision', 'n/a']) {
      const errors = validateRecord({ objective: 'x', written_at: '2026-04-19T10:00:00Z', verdict }, PHASE_SUMMARY_SCHEMA);
      assert.equal(errors.length, 0, `verdict "${verdict}" should pass`);
    }
  });
});

describe('store-cli.cjs — write-boundary in-tool schema enforcement', () => {
  function makeSprintStore() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-wb-'));
    fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'events', 'S1'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'sprints'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.forge', 'store', 'sprints', 'S1.json'),
      JSON.stringify({ sprintId: 'S1', title: 'Test sprint', status: 'planning', taskIds: [], createdAt: '2026-01-01T00:00:00Z' }, null, 2)
    );
    fs.writeFileSync(
      path.join(tmpDir, '.forge', 'config.json'),
      JSON.stringify({ paths: { store: '.forge/store' } }, null, 2)
    );
    return tmpDir;
  }

  test('emit --sidecar rejects sidecar with non-integer inputTokens', () => {
    const tmpDir = makeSprintStore();
    try {
      const r = spawnSync('node', [STORE_CLI, 'emit', 'S1', JSON.stringify({ eventId: 'E1', inputTokens: 'oops' }), '--sidecar'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /inputTokens/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('emit --sidecar rejects sidecar with bogus tokenSource', () => {
    const tmpDir = makeSprintStore();
    try {
      const r = spawnSync('node', [STORE_CLI, 'emit', 'S1', JSON.stringify({ eventId: 'E1', tokenSource: 'ouija' }), '--sidecar'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /tokenSource/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('merge-sidecar rejects when canonical event is malformed after merge', () => {
    const tmpDir = makeSprintStore();
    try {
      // Write a malformed canonical event (missing required fields)
      const eventsDir = path.join(tmpDir, '.forge', 'store', 'events', 'S1');
      fs.writeFileSync(
        path.join(eventsDir, 'E1.json'),
        JSON.stringify({ eventId: 'E1', taskId: 'T1', sprintId: 'S1' })  // missing most required fields
      );
      // Write a valid sidecar
      fs.writeFileSync(
        path.join(eventsDir, '_E1_usage.json'),
        JSON.stringify({ eventId: 'E1', inputTokens: 100 })
      );
      const r = spawnSync('node', [STORE_CLI, 'merge-sidecar', 'S1', 'E1'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /failed schema validation/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('progress rejects agentName with disallowed metachar', () => {
    const tmpDir = makeSprintStore();
    try {
      const r = spawnSync('node', [STORE_CLI, 'progress', 'S1', 'engineer;rm', 'plan.start', 'start', 'hi'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /agentName/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('progress rejects overlong detail (>500 chars)', () => {
    const tmpDir = makeSprintStore();
    try {
      const huge = 'x'.repeat(600);
      const r = spawnSync('node', [STORE_CLI, 'progress', 'S1', 'engineer', 'plan.start', 'start', huge], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /detail/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('write-collation-state rejects negative count', () => {
    const tmpDir = makeSprintStore();
    try {
      const bad = { collatedAt: '2026-04-19T10:00:00Z', featureCount: -1, sprintCount: 0, taskCount: 0, bugCount: 0 };
      const r = spawnSync('node', [STORE_CLI, 'write-collation-state', JSON.stringify(bad)], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /featureCount/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('write-collation-state accepts a well-formed payload', () => {
    const tmpDir = makeSprintStore();
    try {
      const good = { collatedAt: '2026-04-19T10:00:00Z', featureCount: 1, sprintCount: 2, taskCount: 3, bugCount: 0 };
      const r = spawnSync('node', [STORE_CLI, 'write-collation-state', JSON.stringify(good)], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, r.stderr);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('progress writes log line; stdout silent by default', () => {
    const tmpDir = makeSprintStore();
    try {
      const r = spawnSync('node', [STORE_CLI, 'progress', 'S1', 'engineer', 'oracle', 'progress', 'Mapping AC coverage'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, r.stderr);

      // Verify log file was written with raw pipe-delimited format
      const logPath = path.join(tmpDir, '.forge', 'store', 'events', 'S1', 'progress.log');
      assert.ok(fs.existsSync(logPath), 'progress.log should exist');
      const logContent = fs.readFileSync(logPath, 'utf8');
      assert.match(logContent, /\|engineer\|oracle\|progress\|Mapping AC coverage/);

      // stdout is silent by default
      assert.equal(r.stdout, '', 'stdout should be empty without --verbose');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('progress --verbose emits human-readable summary to stdout', () => {
    const tmpDir = makeSprintStore();
    try {
      const r = spawnSync('node', [STORE_CLI, 'progress', 'S1', 'engineer', 'oracle', 'progress', 'Mapping AC coverage', '--verbose'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, r.stderr);
      assert.ok(r.stdout.trim().length > 0, 'stdout should emit a summary line with --verbose');
      assert.ok(r.stdout.includes('🌕'), 'stdout should include oracle emoji 🌕');
      assert.ok(r.stdout.includes('[progress]'), 'stdout should include bracketed status');
      assert.ok(r.stdout.includes('Mapping AC coverage'), 'stdout should include detail');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('progress --verbose falls back gracefully for unknown bannerKey', () => {
    const tmpDir = makeSprintStore();
    try {
      const r = spawnSync('node', [STORE_CLI, 'progress', 'S1', 'engineer', 'unknown-key', 'start', 'Starting work', '--verbose'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, r.stderr);
      assert.ok(r.stdout.includes('[start]'), 'stdout should include bracketed status even for unknown key');
      assert.ok(r.stdout.includes('unknown-key'), 'stdout should use bannerKey as emoji substitute for unknown key');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('store-cli.cjs — emit timestamp normalization (#56)', () => {
  function makeEmitStore() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-ts-'));
    fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'events', 'S1'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'sprints'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.forge', 'store', 'sprints', 'S1.json'),
      JSON.stringify({ sprintId: 'S1', title: 'Test sprint', status: 'planning', taskIds: [], createdAt: '2026-01-01T00:00:00Z' }, null, 2)
    );
    fs.writeFileSync(
      path.join(tmpDir, '.forge', 'config.json'),
      JSON.stringify({ paths: { store: '.forge/store' } }, null, 2)
    );
    return tmpDir;
  }

  const ZEROED_EVENT = {
    eventId: 'E-TS-001',
    taskId: 'T01',
    sprintId: 'S1',
    role: 'plan',
    action: 'plan-task',
    phase: 'plan',
    iteration: 1,
    startTimestamp: '2026-04-20T00:00:00.000Z',
    endTimestamp: '2026-04-20T00:00:00.000Z',
    durationMinutes: 0,
    model: 'claude-sonnet-4-6'
  };

  test('emit normalizes zeroed startTimestamp to real time-of-day', () => {
    const tmpDir = makeEmitStore();
    try {
      const before = Date.now();
      const r = spawnSync(process.execPath, [STORE_CLI, 'emit', 'S1', JSON.stringify(ZEROED_EVENT)], {
        cwd: tmpDir, encoding: 'utf8',
      });
      const after = Date.now();
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);

      const evPath = path.join(tmpDir, '.forge', 'store', 'events', 'S1', 'E-TS-001.json');
      assert.ok(fs.existsSync(evPath), 'event file should be written');
      const ev = JSON.parse(fs.readFileSync(evPath, 'utf8'));

      assert.ok(
        !ev.startTimestamp.includes('T00:00:00'),
        `startTimestamp should not be zeroed midnight, got: ${ev.startTimestamp}`
      );
      const ts = new Date(ev.startTimestamp).getTime();
      assert.ok(ts >= before && ts <= after + 1000,
        `startTimestamp should fall within execution window, got: ${ev.startTimestamp}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('emit normalizes zeroed endTimestamp to real time-of-day', () => {
    const tmpDir = makeEmitStore();
    try {
      const before = Date.now();
      const r = spawnSync(process.execPath, [STORE_CLI, 'emit', 'S1', JSON.stringify(ZEROED_EVENT)], {
        cwd: tmpDir, encoding: 'utf8',
      });
      const after = Date.now();
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);

      const ev = JSON.parse(fs.readFileSync(
        path.join(tmpDir, '.forge', 'store', 'events', 'S1', 'E-TS-001.json'), 'utf8'
      ));

      assert.ok(
        !ev.endTimestamp.includes('T00:00:00'),
        `endTimestamp should not be zeroed midnight, got: ${ev.endTimestamp}`
      );
      const ts = new Date(ev.endTimestamp).getTime();
      assert.ok(ts >= before && ts <= after + 1000,
        `endTimestamp should fall within execution window, got: ${ev.endTimestamp}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('emit preserves non-zeroed timestamps provided by caller', () => {
    const tmpDir = makeEmitStore();
    try {
      const realTs = '2026-04-20T14:32:07.123Z';
      const event = { ...ZEROED_EVENT, eventId: 'E-TS-002', startTimestamp: realTs, endTimestamp: realTs };
      const r = spawnSync(process.execPath, [STORE_CLI, 'emit', 'S1', JSON.stringify(event)], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);

      const ev = JSON.parse(fs.readFileSync(
        path.join(tmpDir, '.forge', 'store', 'events', 'S1', 'E-TS-002.json'), 'utf8'
      ));

      assert.equal(ev.startTimestamp, realTs,
        'non-zeroed startTimestamp must be preserved unchanged');
      assert.equal(ev.endTimestamp, realTs,
        'non-zeroed endTimestamp must be preserved unchanged');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('emit recomputes durationMinutes when timestamps are normalized', () => {
    const tmpDir = makeEmitStore();
    try {
      // Both timestamps zeroed → both normalized to ~now → duration should be >= 0
      const r = spawnSync(process.execPath, [STORE_CLI, 'emit', 'S1', JSON.stringify(ZEROED_EVENT)], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);

      const ev = JSON.parse(fs.readFileSync(
        path.join(tmpDir, '.forge', 'store', 'events', 'S1', 'E-TS-001.json'), 'utf8'
      ));

      // After normalization both timestamps are real — durationMinutes must be a non-negative number
      assert.ok(typeof ev.durationMinutes === 'number' && ev.durationMinutes >= 0,
        `durationMinutes should be a non-negative number, got: ${ev.durationMinutes}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('store-cli.cjs — _isDateOnly', () => {
  test('returns true for YYYY-MM-DD date-only strings', () => {
    assert.equal(_isDateOnly('2026-04-20'), true);
    assert.equal(_isDateOnly('2025-01-01'), true);
  });

  test('returns false for full ISO datetimes', () => {
    assert.equal(_isDateOnly('2026-04-20T14:32:07.123Z'), false);
    assert.equal(_isDateOnly('2026-04-20T00:00:00Z'), false);
  });

  test('returns false for non-string types', () => {
    assert.equal(_isDateOnly(null), false);
    assert.equal(_isDateOnly(undefined), false);
    assert.equal(_isDateOnly(12345), false);
  });

  test('returns false for empty string', () => {
    assert.equal(_isDateOnly(''), false);
  });

  test('returns false for partial date strings', () => {
    assert.equal(_isDateOnly('2026-04'), false);
    assert.equal(_isDateOnly('2026'), false);
  });
});

describe('store-cli.cjs — _dateOnlyToISO', () => {
  test('converts date-only string to full ISO datetime preserving date portion', () => {
    const result = _dateOnlyToISO('2026-04-20');
    assert.ok(result.startsWith('2026-04-20T'), `result should start with original date, got: ${result}`);
    assert.ok(!result.startsWith('2026-04-20$'), 'should not be date-only anymore');
  });

  test('result is parseable as a Date', () => {
    const result = _dateOnlyToISO('2026-01-15');
    const parsed = new Date(result);
    assert.ok(!isNaN(parsed.getTime()), `result should be a valid date, got: ${result}`);
  });
});

describe('store-cli.cjs — _normalizeBugTimestamps', () => {
  test('normalizes date-only reportedAt', () => {
    const bug = { reportedAt: '2026-04-20' };
    _normalizeBugTimestamps(bug);
    assert.ok(bug.reportedAt.includes('T'), `reportedAt should contain T, got: ${bug.reportedAt}`);
    assert.ok(bug.reportedAt.startsWith('2026-04-20T'), `date portion preserved, got: ${bug.reportedAt}`);
  });

  test('normalizes date-only resolvedAt', () => {
    const bug = { reportedAt: '2026-04-20T10:00:00Z', resolvedAt: '2026-04-21' };
    _normalizeBugTimestamps(bug);
    assert.equal(bug.reportedAt, '2026-04-20T10:00:00Z', 'full ISO reportedAt should be preserved');
    assert.ok(bug.resolvedAt.startsWith('2026-04-21T'), `date portion preserved, got: ${bug.resolvedAt}`);
  });

  test('leaves full ISO datetimes untouched', () => {
    const bug = { reportedAt: '2026-04-20T14:32:07.123Z' };
    _normalizeBugTimestamps(bug);
    assert.equal(bug.reportedAt, '2026-04-20T14:32:07.123Z');
  });

  test('returns the same object for chaining', () => {
    const bug = { reportedAt: '2026-04-20' };
    const result = _normalizeBugTimestamps(bug);
    assert.equal(result, bug, 'should return the same object');
  });
});

describe('store-cli.cjs — write bug timestamp auto-population', () => {
  function makeBugStore() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-bugts-'));
    const bugsDir = path.join(tmpDir, '.forge', 'store', 'bugs');
    fs.mkdirSync(bugsDir, { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.forge', 'config.json'),
      JSON.stringify({ paths: { store: '.forge/store' } }, null, 2)
    );
    return tmpDir;
  }

  const BUG_DATE_ONLY = {
    bugId: 'BUG-TS-001',
    title: 'Timestamp test bug',
    severity: 'minor',
    status: 'reported',
    path: 'engineering/bugs/BUG-TS-001',
    reportedAt: '2026-04-20'
  };

  test('write bug auto-populates date-only reportedAt to full ISO datetime', () => {
    const tmpDir = makeBugStore();
    try {
      const before = Date.now();
      const r = spawnSync(process.execPath, [STORE_CLI, 'write', 'bug', JSON.stringify(BUG_DATE_ONLY)], {
        cwd: tmpDir, encoding: 'utf8',
      });
      const after = Date.now();
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);

      const bug = JSON.parse(fs.readFileSync(
        path.join(tmpDir, '.forge', 'store', 'bugs', 'BUG-TS-001.json'), 'utf8'
      ));

      // reportedAt should now be a full ISO datetime, not a date-only string
      assert.ok(bug.reportedAt.includes('T'), `reportedAt should contain T, got: ${bug.reportedAt}`);
      assert.ok(!/^\d{4}-\d{2}-\d{2}$/.test(bug.reportedAt), `reportedAt should not be date-only, got: ${bug.reportedAt}`);
      const ts = new Date(bug.reportedAt).getTime();
      assert.ok(!isNaN(ts), `reportedAt should be a valid date, got: ${bug.reportedAt}`);
      // The date part should still be 2026-04-20
      assert.ok(bug.reportedAt.startsWith('2026-04-20T'), `date portion should be preserved, got: ${bug.reportedAt}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('write bug preserves full ISO datetime in reportedAt', () => {
    const tmpDir = makeBugStore();
    try {
      const fullTs = '2026-04-20T14:32:07.123Z';
      const bug = { ...BUG_DATE_ONLY, bugId: 'BUG-TS-002', reportedAt: fullTs };
      const r = spawnSync(process.execPath, [STORE_CLI, 'write', 'bug', JSON.stringify(bug)], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);

      const written = JSON.parse(fs.readFileSync(
        path.join(tmpDir, '.forge', 'store', 'bugs', 'BUG-TS-002.json'), 'utf8'
      ));
      assert.equal(written.reportedAt, fullTs, 'full ISO datetime should be preserved unchanged');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('write bug auto-populates date-only resolvedAt to full ISO datetime', () => {
    const tmpDir = makeBugStore();
    try {
      const bug = { ...BUG_DATE_ONLY, bugId: 'BUG-TS-003', resolvedAt: '2026-04-21', status: 'fixed' };
      const r = spawnSync(process.execPath, [STORE_CLI, 'write', 'bug', JSON.stringify(bug)], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);

      const written = JSON.parse(fs.readFileSync(
        path.join(tmpDir, '.forge', 'store', 'bugs', 'BUG-TS-003.json'), 'utf8'
      ));
      assert.ok(written.resolvedAt.includes('T'), `resolvedAt should contain T, got: ${written.resolvedAt}`);
      assert.ok(written.resolvedAt.startsWith('2026-04-21T'), `date portion should be preserved, got: ${written.resolvedAt}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('write bug with both reportedAt and resolvedAt date-only normalizes both', () => {
    const tmpDir = makeBugStore();
    try {
      const bug = { ...BUG_DATE_ONLY, bugId: 'BUG-TS-004', resolvedAt: '2026-04-21', status: 'fixed' };
      const r = spawnSync(process.execPath, [STORE_CLI, 'write', 'bug', JSON.stringify(bug)], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);

      const written = JSON.parse(fs.readFileSync(
        path.join(tmpDir, '.forge', 'store', 'bugs', 'BUG-TS-004.json'), 'utf8'
      ));
      assert.ok(written.reportedAt.includes('T'), `reportedAt should contain T, got: ${written.reportedAt}`);
      assert.ok(written.resolvedAt.includes('T'), `resolvedAt should contain T, got: ${written.resolvedAt}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('store-cli.cjs — record-usage subcommand', () => {
  function makeUsageStore() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-ru-'));
    fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'events', 'S1'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'sprints'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.forge', 'store', 'sprints', 'S1.json'),
      JSON.stringify({ sprintId: 'S1', title: 'Test sprint', status: 'planning', taskIds: [], createdAt: '2026-01-01T00:00:00Z' }, null, 2)
    );
    fs.writeFileSync(
      path.join(tmpDir, '.forge', 'config.json'),
      JSON.stringify({ paths: { store: '.forge/store' } }, null, 2)
    );
    return tmpDir;
  }

  test('record-usage writes a valid sidecar file', () => {
    const tmpDir = makeUsageStore();
    try {
      const r = spawnSync(process.execPath, [
        STORE_CLI, 'record-usage', 'S1', 'E-001',
        '--input-tokens', '1000',
        '--output-tokens', '500',
        '--cache-read-tokens', '200',
        '--cache-write-tokens', '100',
        '--provider', 'anthropic',
        '--token-source', 'reported',
      ], { cwd: tmpDir, encoding: 'utf8' });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);

      const sidecarPath = path.join(tmpDir, '.forge', 'store', 'events', 'S1', '_E-001_usage.json');
      assert.ok(fs.existsSync(sidecarPath), 'sidecar file should exist');

      const sidecar = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
      assert.equal(sidecar.eventId, 'E-001');
      assert.equal(sidecar.inputTokens, 1000);
      assert.equal(sidecar.outputTokens, 500);
      assert.equal(sidecar.cacheReadTokens, 200);
      assert.equal(sidecar.cacheWriteTokens, 100);
      assert.equal(sidecar.provider, 'anthropic');
      assert.equal(sidecar.estimatedCostUSD, undefined, 'estimatedCostUSD must NOT be persisted — derived at collate time');
      assert.equal(sidecar.tokenSource, 'reported');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('record-usage with minimal fields writes sidecar with only eventId and provided fields', () => {
    const tmpDir = makeUsageStore();
    try {
      const r = spawnSync(process.execPath, [
        STORE_CLI, 'record-usage', 'S1', 'E-002',
        '--input-tokens', '500',
        '--output-tokens', '250',
      ], { cwd: tmpDir, encoding: 'utf8' });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);

      const sidecar = JSON.parse(fs.readFileSync(
        path.join(tmpDir, '.forge', 'store', 'events', 'S1', '_E-002_usage.json'), 'utf8'
      ));
      assert.equal(sidecar.eventId, 'E-002');
      assert.equal(sidecar.inputTokens, 500);
      assert.equal(sidecar.outputTokens, 250);
      assert.equal(sidecar.cacheReadTokens, undefined, 'unprovided cacheReadTokens should be absent');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('record-usage rejects invalid token-source', () => {
    const tmpDir = makeUsageStore();
    try {
      const r = spawnSync(process.execPath, [
        STORE_CLI, 'record-usage', 'S1', 'E-003',
        '--input-tokens', '100',
        '--token-source', 'invalid',
      ], { cwd: tmpDir, encoding: 'utf8' });
      assert.notEqual(r.status, 0, 'should exit non-zero for invalid token-source');
      assert.match(r.stderr, /tokenSource/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('record-usage rejects non-integer input-tokens', () => {
    const tmpDir = makeUsageStore();
    try {
      const r = spawnSync(process.execPath, [
        STORE_CLI, 'record-usage', 'S1', 'E-004',
        '--input-tokens', 'not-a-number',
      ], { cwd: tmpDir, encoding: 'utf8' });
      assert.notEqual(r.status, 0, 'should exit non-zero for non-integer input-tokens');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('record-usage rejects --estimated-cost-usd (field removed from schema)', () => {
    const tmpDir = makeUsageStore();
    try {
      const r = spawnSync(process.execPath, [
        STORE_CLI, 'record-usage', 'S1', 'E-005',
        '--estimated-cost-usd', '0.05',
      ], { cwd: tmpDir, encoding: 'utf8' });
      assert.notEqual(r.status, 0, 'should exit non-zero — flag has been removed');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('emit --sidecar rejects estimatedCostUSD field', () => {
    const tmpDir = makeUsageStore();
    try {
      const r = spawnSync(process.execPath, [
        STORE_CLI, 'emit', 'S1',
        JSON.stringify({ eventId: 'E-006', estimatedCostUSD: 0.05 }),
        '--sidecar',
      ], { cwd: tmpDir, encoding: 'utf8' });
      assert.notEqual(r.status, 0, 'should reject estimatedCostUSD field');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('record-usage requires sprintId and eventId', () => {
    const tmpDir = makeUsageStore();
    try {
      const r = spawnSync(process.execPath, [
        STORE_CLI, 'record-usage',
      ], { cwd: tmpDir, encoding: 'utf8' });
      assert.notEqual(r.status, 0, 'should exit non-zero for missing args');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('record-usage supports --model and --duration-minutes flags', () => {
    const tmpDir = makeUsageStore();
    try {
      const r = spawnSync(process.execPath, [
        STORE_CLI, 'record-usage', 'S1', 'E-006',
        '--input-tokens', '100',
        '--model', 'claude-sonnet-4-6',
        '--duration-minutes', '5.2',
      ], { cwd: tmpDir, encoding: 'utf8' });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);

      const sidecar = JSON.parse(fs.readFileSync(
        path.join(tmpDir, '.forge', 'store', 'events', 'S1', '_E-006_usage.json'), 'utf8'
      ));
      assert.equal(sidecar.model, 'claude-sonnet-4-6');
      assert.equal(sidecar.durationMinutes, 5.2);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('store-cli.cjs — discoverModel', () => {
  test('returns CLAUDE_CODE_SUBAGENT_MODEL when set', () => {
    // We test discoverModel via a subprocess so env vars are isolated
    const r = spawnSync(process.execPath, ['-e', `
      const { discoverModel } = require(${JSON.stringify(STORE_CLI)});
      process.stdout.write(discoverModel());
    `], {
      cwd: os.tmpdir(),
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CODE_SUBAGENT_MODEL: 'glm-5.1:cloud' },
    });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.equal(r.stdout.trim(), 'glm-5.1:cloud');
  });

  test('falls back to ANTHROPIC_MODEL when CLAUDE_CODE_SUBAGENT_MODEL is not set', () => {
    const r = spawnSync(process.execPath, ['-e', `
      const { discoverModel } = require(${JSON.stringify(STORE_CLI)});
      process.stdout.write(discoverModel());
    `], {
      cwd: os.tmpdir(),
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CODE_SUBAGENT_MODEL: '', ANTHROPIC_MODEL: 'claude-sonnet-4-6' },
    });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.equal(r.stdout.trim(), 'claude-sonnet-4-6');
  });

  test('falls back to CLAUDE_MODEL when CLAUDE_CODE_SUBAGENT_MODEL and ANTHROPIC_MODEL are not set', () => {
    const r = spawnSync(process.execPath, ['-e', `
      const { discoverModel } = require(${JSON.stringify(STORE_CLI)});
      process.stdout.write(discoverModel());
    `], {
      cwd: os.tmpdir(),
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CODE_SUBAGENT_MODEL: '', ANTHROPIC_MODEL: '', CLAUDE_MODEL: 'gpt-4o' },
    });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.equal(r.stdout.trim(), 'gpt-4o');
  });

  test('returns "unknown" when no model env var is set', () => {
    const r = spawnSync(process.execPath, ['-e', `
      const { discoverModel } = require(${JSON.stringify(STORE_CLI)});
      process.stdout.write(discoverModel());
    `], {
      cwd: os.tmpdir(),
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CODE_SUBAGENT_MODEL: '', ANTHROPIC_MODEL: '', CLAUDE_MODEL: '' },
    });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.equal(r.stdout.trim(), 'unknown');
  });

  test('CLAUDE_CODE_SUBAGENT_MODEL takes priority over ANTHROPIC_MODEL', () => {
    const r = spawnSync(process.execPath, ['-e', `
      const { discoverModel } = require(${JSON.stringify(STORE_CLI)});
      process.stdout.write(discoverModel());
    `], {
      cwd: os.tmpdir(),
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CODE_SUBAGENT_MODEL: 'glm-5.1:cloud', ANTHROPIC_MODEL: 'claude-sonnet-4-6' },
    });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.equal(r.stdout.trim(), 'glm-5.1:cloud');
  });

  test('trims whitespace from model env var values', () => {
    const r = spawnSync(process.execPath, ['-e', `
      const { discoverModel } = require(${JSON.stringify(STORE_CLI)});
      process.stdout.write(discoverModel());
    `], {
      cwd: os.tmpdir(),
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CODE_SUBAGENT_MODEL: '  claude-opus-4-5  ' },
    });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.equal(r.stdout.trim(), 'claude-opus-4-5');
  });
});

describe('store-cli.cjs — emit auto-populates model via discoverModel', () => {
  function makeEmitStoreForModel() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-model-'));
    fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'events', 'S1'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'sprints'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.forge', 'store', 'sprints', 'S1.json'),
      JSON.stringify({ sprintId: 'S1', title: 'Test sprint', status: 'planning', taskIds: [], createdAt: '2026-01-01T00:00:00Z' }, null, 2)
    );
    fs.writeFileSync(
      path.join(tmpDir, '.forge', 'config.json'),
      JSON.stringify({ paths: { store: '.forge/store' } }, null, 2)
    );
    return tmpDir;
  }

  const BASE_EVENT = {
    eventId: 'E-MODEL-001',
    taskId: 'T01',
    sprintId: 'S1',
    role: 'plan',
    action: 'plan-task',
    phase: 'plan',
    iteration: 1,
    startTimestamp: '2026-04-20T14:32:07.123Z',
    endTimestamp: '2026-04-20T14:35:07.123Z',
    durationMinutes: 3,
  };

  test('emit auto-populates model when model is missing', () => {
    const tmpDir = makeEmitStoreForModel();
    try {
      // Event without model field
      const eventNoModel = { ...BASE_EVENT };
      delete eventNoModel.model;
      const r = spawnSync(process.execPath, [STORE_CLI, 'emit', 'S1', JSON.stringify(eventNoModel)], {
        cwd: tmpDir, encoding: 'utf8',
        env: { ...process.env, CLAUDE_CODE_SUBAGENT_MODEL: 'glm-5.1:cloud' },
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);

      const ev = JSON.parse(fs.readFileSync(
        path.join(tmpDir, '.forge', 'store', 'events', 'S1', 'E-MODEL-001.json'), 'utf8'
      ));
      assert.equal(ev.model, 'glm-5.1:cloud', 'model should be auto-populated from env var');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('emit auto-populates model when model is empty string', () => {
    const tmpDir = makeEmitStoreForModel();
    try {
      const eventEmptyModel = { ...BASE_EVENT, model: '' };
      const r = spawnSync(process.execPath, [STORE_CLI, 'emit', 'S1', JSON.stringify(eventEmptyModel)], {
        cwd: tmpDir, encoding: 'utf8',
        env: { ...process.env, CLAUDE_CODE_SUBAGENT_MODEL: 'glm-5.1:cloud' },
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);

      const ev = JSON.parse(fs.readFileSync(
        path.join(tmpDir, '.forge', 'store', 'events', 'S1', 'E-MODEL-001.json'), 'utf8'
      ));
      assert.equal(ev.model, 'glm-5.1:cloud', 'model should be auto-populated when empty string');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('emit preserves explicitly provided model', () => {
    const tmpDir = makeEmitStoreForModel();
    try {
      const eventExplicitModel = { ...BASE_EVENT, model: 'claude-sonnet-4-6' };
      const r = spawnSync(process.execPath, [STORE_CLI, 'emit', 'S1', JSON.stringify(eventExplicitModel)], {
        cwd: tmpDir, encoding: 'utf8',
        env: { ...process.env, CLAUDE_CODE_SUBAGENT_MODEL: 'glm-5.1:cloud' },
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);

      const ev = JSON.parse(fs.readFileSync(
        path.join(tmpDir, '.forge', 'store', 'events', 'S1', 'E-MODEL-001.json'), 'utf8'
      ));
      assert.equal(ev.model, 'claude-sonnet-4-6', 'explicitly provided model must be preserved');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('emit sets model to "unknown" when no env var is set and model is missing', () => {
    const tmpDir = makeEmitStoreForModel();
    try {
      const eventNoModel = { ...BASE_EVENT };
      delete eventNoModel.model;
      const r = spawnSync(process.execPath, [STORE_CLI, 'emit', 'S1', JSON.stringify(eventNoModel)], {
        cwd: tmpDir, encoding: 'utf8',
        env: { ...process.env, CLAUDE_CODE_SUBAGENT_MODEL: '', ANTHROPIC_MODEL: '', CLAUDE_MODEL: '' },
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);

      const ev = JSON.parse(fs.readFileSync(
        path.join(tmpDir, '.forge', 'store', 'events', 'S1', 'E-MODEL-001.json'), 'utf8'
      ));
      assert.equal(ev.model, 'unknown', 'model should be "unknown" when no env var is set');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('store-cli.cjs — record-usage auto-populates model via discoverModel', () => {
  function makeUsageStoreForModel() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-rumodel-'));
    fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'events', 'S1'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.forge', 'config.json'),
      JSON.stringify({ paths: { store: '.forge/store' } }, null, 2)
    );
    return tmpDir;
  }

  test('record-usage auto-populates model when --model flag not provided', () => {
    const tmpDir = makeUsageStoreForModel();
    try {
      const r = spawnSync(process.execPath, [
        STORE_CLI, 'record-usage', 'S1', 'E-RU-MODEL',
        '--input-tokens', '100',
      ], {
        cwd: tmpDir, encoding: 'utf8',
        env: { ...process.env, CLAUDE_CODE_SUBAGENT_MODEL: 'glm-5.1:cloud' },
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);

      const sidecar = JSON.parse(fs.readFileSync(
        path.join(tmpDir, '.forge', 'store', 'events', 'S1', '_E-RU-MODEL_usage.json'), 'utf8'
      ));
      assert.equal(sidecar.model, 'glm-5.1:cloud', 'model should be auto-populated from env var');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('record-usage preserves explicit --model flag', () => {
    const tmpDir = makeUsageStoreForModel();
    try {
      const r = spawnSync(process.execPath, [
        STORE_CLI, 'record-usage', 'S1', 'E-RU-MODEL2',
        '--input-tokens', '100',
        '--model', 'claude-opus-4-5',
      ], {
        cwd: tmpDir, encoding: 'utf8',
        env: { ...process.env, CLAUDE_CODE_SUBAGENT_MODEL: 'glm-5.1:cloud' },
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);

      const sidecar = JSON.parse(fs.readFileSync(
        path.join(tmpDir, '.forge', 'store', 'events', 'S1', '_E-RU-MODEL2_usage.json'), 'utf8'
      ));
      assert.equal(sidecar.model, 'claude-opus-4-5', 'explicit --model flag must be preserved');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ── C5: Path traversal guard for progress/progress-clear ──────────

  describe('C5: path traversal guard in progress commands', () => {
    test('progress rejects path traversal with ../', () => {
      const tmpDir = makeTempStore();
      try {
        const r = spawnSync('node', [STORE_CLI, 'progress', '../etc/passwd', 'agent1', 'rift', 'start', 'test'], {
          cwd: tmpDir,
          encoding: 'utf8',
        });
        assert.notEqual(r.status, 0, 'should exit non-zero on path traversal');
        assert.ok(r.stderr.includes('traversal') || r.stderr.includes('escapes'), `stderr should mention traversal: ${r.stderr}`);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    test('progress-clear rejects path traversal with ../../', () => {
      const tmpDir = makeTempStore();
      try {
        const r = spawnSync('node', [STORE_CLI, 'progress-clear', '../../tmp/evil'], {
          cwd: tmpDir,
          encoding: 'utf8',
        });
        assert.notEqual(r.status, 0, 'should exit non-zero on path traversal');
        assert.ok(r.stderr.includes('traversal') || r.stderr.includes('escapes'), `stderr should mention traversal: ${r.stderr}`);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    test('progress rejects absolute path', () => {
      const tmpDir = makeTempStore();
      try {
        const r = spawnSync('node', [STORE_CLI, 'progress', '/etc/passwd', 'agent1', 'rift', 'start', 'test'], {
          cwd: tmpDir,
          encoding: 'utf8',
        });
        assert.notEqual(r.status, 0, 'should exit non-zero on absolute path');
        assert.ok(r.stderr.includes('traversal') || r.stderr.includes('escapes'), `stderr should mention traversal: ${r.stderr}`);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    test('progress accepts normal sprintOrBugId', () => {
      const tmpDir = makeTempStore();
      try {
        const r = spawnSync('node', [STORE_CLI, 'progress', 'bugs', 'agent1', 'rift', 'start', 'test'], {
          cwd: tmpDir,
          encoding: 'utf8',
        });
        assert.equal(r.status, 0, `normal progress should succeed: ${r.stderr}`);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});

// ---------------------------------------------------------------------------
// .schemas/ fallback — exercised by forge-cli bundled-payload layout
// ---------------------------------------------------------------------------
describe('store-cli — bundled-payload .schemas/ fallback', () => {
  // Simulate the forge-cli bundled layout: copy store-cli.cjs into a fake
  // `tools/` dir whose sibling is `.schemas/`. Force the production-mode
  // lookup chain by removing the in-tree and project paths.
  test('store-cli resolves schemas from sibling .schemas/ when no schemas/ exists', () => {
    const stageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-bundled-'));
    const fakeTools = path.join(stageRoot, 'tools');
    const fakeSchemasDot = path.join(stageRoot, '.schemas');
    fs.mkdirSync(fakeTools, { recursive: true });
    fs.mkdirSync(fakeSchemasDot, { recursive: true });

    // Stage everything store-cli needs at runtime
    const realToolsDir = path.dirname(STORE_CLI);
    for (const f of ['store-cli.cjs', 'store.cjs']) {
      fs.copyFileSync(path.join(realToolsDir, f), path.join(fakeTools, f));
    }
    fs.cpSync(path.join(realToolsDir, 'lib'), path.join(fakeTools, 'lib'), { recursive: true });

    // Copy the real event-sidecar.schema.json (with tokenSource enum [reported, estimated])
    // ONLY into .schemas/ — not into a sibling schemas/ — so the .schemas/ fallback
    // is the only way to find it.
    const srcSchemaDir = path.join(__dirname, '..', '..', 'schemas');
    fs.copyFileSync(
      path.join(srcSchemaDir, 'event-sidecar.schema.json'),
      path.join(fakeSchemasDot, 'event-sidecar.schema.json')
    );

    const projDir = path.join(stageRoot, 'project');
    fs.mkdirSync(path.join(projDir, '.forge', 'store', 'events', 'S1'), { recursive: true });
    fs.mkdirSync(path.join(projDir, '.forge', 'store', 'sprints'), { recursive: true });
    fs.writeFileSync(
      path.join(projDir, '.forge', 'store', 'sprints', 'S1.json'),
      JSON.stringify({ sprintId: 'S1', title: 'Test sprint', status: 'planning', taskIds: [], createdAt: '2026-01-01T00:00:00Z' })
    );
    fs.writeFileSync(
      path.join(projDir, '.forge', 'config.json'),
      JSON.stringify({ paths: { store: '.forge/store' } })
    );

    try {
      // Run from a CWD where neither project schemas nor in-tree schemas exist.
      // The bundled-payload .schemas/ fallback is the only viable lookup.
      const r = spawnSync('node', [
        path.join(fakeTools, 'store-cli.cjs'),
        'emit', 'S1',
        JSON.stringify({ eventId: 'EVT-FB', tokenSource: 'missing' }),
        '--sidecar',
      ], { cwd: projDir, encoding: 'utf8' });

      assert.notEqual(r.status, 0,
        `should reject tokenSource:"missing" via real schema enum, got exit 0. stderr: ${r.stderr}`);
      assert.match(r.stderr, /tokenSource: value "missing" not in/,
        `error must reference tokenSource enum validation — proves event-sidecar.schema.json was loaded from .schemas/. stderr: ${r.stderr}`);
      // Schemas not staged in .schemas/ (sprint, task, bug, event, ...) will still
      // trigger the minimal fallback warning at startup — that is expected here
      // because we only seeded event-sidecar.schema.json for this test.
      assert.ok(!r.stderr.includes('event-sidecar.schema.json not found'),
        `the staged schema must NOT fall back — found warning in stderr: ${r.stderr}`);
    } finally {
      fs.rmSync(stageRoot, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// FORGE-S22-T02 — get* alias dispatch + summary read-through
// ---------------------------------------------------------------------------

describe('store-cli.cjs — get* alias dispatch (FORGE-S22-T02)', () => {
  function run(tmpDir, ...cliArgs) {
    return spawnSync(process.execPath, [STORE_CLI, ...cliArgs], { cwd: tmpDir, encoding: 'utf8' });
  }

  test('get task <id> is byte-equal to read task <id>', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', MINIMAL_TASK);
      const canon = run(tmpDir, 'read', 'task', 'T01');
      const alias = run(tmpDir, 'get',  'task', 'T01');
      assert.equal(alias.status, 0, `alias stderr: ${alias.stderr}`);
      assert.equal(canon.status, 0, `canon stderr: ${canon.stderr}`);
      assert.equal(alias.stdout, canon.stdout, 'stdout must be byte-equal');
      assert.equal(alias.status, canon.status, 'exit codes must match');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('get-task <id> is byte-equal to read task <id>', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', MINIMAL_TASK);
      const canon = run(tmpDir, 'read', 'task', 'T01');
      const alias = run(tmpDir, 'get-task', 'T01');
      assert.equal(alias.status, 0, `stderr: ${alias.stderr}`);
      assert.equal(alias.stdout, canon.stdout);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('get-bug <id> is byte-equal to read bug <id>', () => {
    const tmpDir = makeTempStore();
    try {
      writeBugFile(tmpDir, 'BUG-001', MINIMAL_BUG);
      const canon = run(tmpDir, 'read', 'bug', 'BUG-001');
      const alias = run(tmpDir, 'get-bug', 'BUG-001');
      assert.equal(alias.status, 0, `stderr: ${alias.stderr}`);
      assert.equal(alias.stdout, canon.stdout);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('get-sprint <id> is byte-equal to read sprint <id>', () => {
    const tmpDir = makeTempStore();
    try {
      const sprintsDir = path.join(tmpDir, '.forge', 'store', 'sprints');
      fs.mkdirSync(sprintsDir, { recursive: true });
      const sprint = { sprintId: 'S01', title: 'Test sprint', status: 'active', path: 'eng/s01' };
      fs.writeFileSync(path.join(sprintsDir, 'S01.json'), JSON.stringify(sprint, null, 2));

      const canon = run(tmpDir, 'read', 'sprint', 'S01');
      const alias = run(tmpDir, 'get-sprint', 'S01');
      assert.equal(alias.status, 0, `stderr: ${alias.stderr}`);
      assert.equal(alias.stdout, canon.stdout);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('get task <id> --json is byte-equal to read task <id> --json (flag passthrough)', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', MINIMAL_TASK);
      const canon = run(tmpDir, 'read', 'task', 'T01', '--json');
      const alias = run(tmpDir, 'get',  'task', 'T01', '--json');
      assert.equal(alias.status, 0, `stderr: ${alias.stderr}`);
      assert.equal(alias.stdout, canon.stdout);
      // Sanity: --json output is a single line, no pretty-print indent
      assert.ok(!alias.stdout.includes('\n  '), 'json output should not be pretty-printed');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('bare get (no entity, no id) exits 1 with usage error', () => {
    const tmpDir = makeTempStore();
    try {
      const r = run(tmpDir, 'get');
      assert.equal(r.status, 1, `stdout: ${r.stdout}`);
      assert.match(r.stderr, /'get' requires an entity type/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('bare get <id-only> exits 1 with usage error', () => {
    const tmpDir = makeTempStore();
    try {
      const r = run(tmpDir, 'get', 'T01');
      assert.equal(r.status, 1, `stdout: ${r.stdout}`);
      assert.match(r.stderr, /'get' requires an entity type/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('get <unknown-entity> <id> exits 1', () => {
    const tmpDir = makeTempStore();
    try {
      const r = run(tmpDir, 'get', 'widget', 'W01');
      assert.equal(r.status, 1, `stdout: ${r.stdout}`);
      assert.match(r.stderr, /'get' requires an entity type/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('get task <nonexistent-id> exits 1 via read not-found path', () => {
    const tmpDir = makeTempStore();
    try {
      const r = run(tmpDir, 'get', 'task', 'NOPE');
      assert.equal(r.status, 1);
      assert.match(r.stderr, /not found|Entity not found/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('get-summary <taskId> <existing-phase> prints summary', () => {
    const tmpDir = makeTempStore();
    try {
      const task = { ...MINIMAL_TASK, summaries: { plan: VALID_SUMMARY } };
      writeTaskFile(tmpDir, 'T01', task);
      const r = run(tmpDir, 'get-summary', 'T01', 'plan');
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);
      // Default (non-JSON) mode prints the summary object pretty-printed.
      const parsed = JSON.parse(r.stdout);
      assert.equal(parsed.objective, VALID_SUMMARY.objective);
      assert.equal(parsed.verdict, VALID_SUMMARY.verdict);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('get-summary <taskId> <unknown-phase> exits 1 with no-summary message', () => {
    const tmpDir = makeTempStore();
    try {
      const task = { ...MINIMAL_TASK, summaries: { plan: VALID_SUMMARY } };
      writeTaskFile(tmpDir, 'T01', task);
      const r = run(tmpDir, 'get-summary', 'T01', 'implementation');
      assert.equal(r.status, 1);
      assert.match(r.stderr, /no summary for phase 'implementation'/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('get-summary <nonexistent-taskId> exits 1 with not-found message', () => {
    const tmpDir = makeTempStore();
    try {
      const r = run(tmpDir, 'get-summary', 'NOPE', 'plan');
      assert.equal(r.status, 1);
      assert.match(r.stderr, /task NOPE not found/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('get-bug-summary <bugId> <existing-phase> prints summary (routes through cmdGetBugSummary, not set-bug-summary)', () => {
    const tmpDir = makeTempStore();
    try {
      const bug = { ...MINIMAL_BUG, summaries: { triage: VALID_SUMMARY } };
      writeBugFile(tmpDir, 'BUG-001', bug);
      const r = run(tmpDir, 'get-bug-summary', 'BUG-001', 'triage');
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);
      const parsed = JSON.parse(r.stdout);
      assert.equal(parsed.objective, VALID_SUMMARY.objective);
      // Ensure the bug file was NOT mutated (would prove we hit set-bug-summary).
      const after = readBugFile(tmpDir, 'BUG-001');
      assert.deepEqual(after.summaries.triage, VALID_SUMMARY);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('get-bug-summary <nonexistent-bugId> exits 1', () => {
    const tmpDir = makeTempStore();
    try {
      const r = run(tmpDir, 'get-bug-summary', 'BUG-NOPE', 'triage');
      assert.equal(r.status, 1);
      assert.match(r.stderr, /bug BUG-NOPE not found/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('--help lists Alias commands section with all 6 alias verbs', () => {
    const tmpDir = makeTempStore();
    try {
      const r = run(tmpDir, '--help');
      assert.equal(r.status, 0);
      assert.match(r.stdout, /Alias commands/, '--help must include "Alias commands" section');
      for (const verb of ['get', 'get-task', 'get-bug', 'get-sprint', 'get-summary', 'get-bug-summary']) {
        assert.ok(r.stdout.includes(verb), `--help missing alias verb: ${verb}`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// FORGE-S22-T03: "Did you mean?" suggestion integration tests
// ---------------------------------------------------------------------------

describe('store-cli.cjs — "Did you mean?" suggestions (FORGE-S22-T03)', () => {
  function makeSuggestStore() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-suggest-'));
    fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'events', 'S1'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.forge', 'config.json'),
      JSON.stringify({ paths: { store: '.forge/store' } }, null, 2)
    );
    return tmpDir;
  }

  // CLI test 1: Unknown entity type with suggestion
  test('write evnt → stderr contains (Did you mean "event"?)', () => {
    const tmpDir = makeSuggestStore();
    try {
      const r = spawnSync(process.execPath, [STORE_CLI, 'write', 'evnt', '{}'], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /Did you mean "event"\?/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // CLI test 3: read evnt → stderr contains suggestion for entity type
  test('read evnt ID → stderr contains (Did you mean "event"?)', () => {
    const tmpDir = makeSuggestStore();
    try {
      const r = spawnSync(process.execPath, [STORE_CLI, 'read', 'evnt', 'E1'], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /Did you mean "event"\?/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // CLI test 5: Unknown command with suggestion
  test('emti → stderr contains (Did you mean "emit"?)', () => {
    const tmpDir = makeSuggestStore();
    try {
      const r = spawnSync(process.execPath, [STORE_CLI, 'emti'], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /Did you mean "emit"\?/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // CLI test 11: "No transition rules for entity type" with valid types listed
  test('update-status event ID status draft → stderr contains "No transition rules" with valid types', () => {
    const tmpDir = makeSuggestStore();
    try {
      const r = spawnSync(process.execPath, [STORE_CLI, 'update-status', 'event', 'E1', 'status', 'draft'], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /No transition rules for entity type: event/);
      assert.match(r.stderr, /Valid types: task, sprint, bug, feature/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // CLI test: describe with invalid entity
  test('describe evnt → stderr contains (Did you mean "event"?)', () => {
    const tmpDir = makeSuggestStore();
    try {
      const r = spawnSync(process.execPath, [STORE_CLI, 'describe', 'evnt'], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /Did you mean "event"\?/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // CLI test: template with invalid entity
  test('template evnt → stderr contains (Did you mean "event"?)', () => {
    const tmpDir = makeSuggestStore();
    try {
      const r = spawnSync(process.execPath, [STORE_CLI, 'template', 'evnt'], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /Did you mean "event"\?/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // CLI test: validate with invalid entity type
  test('validate evnt → stderr contains (Did you mean "event"?)', () => {
    const tmpDir = makeSuggestStore();
    try {
      const r = spawnSync(process.execPath, [STORE_CLI, 'validate', 'evnt', '{}'], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /Did you mean "event"\?/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // CLI test: list with entity that is close to a narrower pool member
  test('list feautre → stderr contains (Did you mean "feature"?)', () => {
    const tmpDir = makeSuggestStore();
    try {
      const r = spawnSync(process.execPath, [STORE_CLI, 'list', 'feautre'], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /Did you mean "feature"\?/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // Negative test: no suggestion for valid entity type
  test('write with valid entity type produces no suggestion spam', () => {
    const tmpDir = makeSuggestStore();
    try {
      const r = spawnSync(process.execPath, [STORE_CLI, 'write', 'task', '{}'], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.notEqual(r.status, 0);
      // Should NOT contain "Did you mean" for valid entity type 'task'
      assert.ok(!r.stderr.includes('Did you mean'), `unexpected suggestion: ${r.stderr}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // CLI test: Illegal transition with suggestion
  test('illegal transition → stderr contains suggestion for target state', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', { ...MINIMAL_TASK, status: 'plan-approved' });
      const r = spawnSync(process.execPath, [STORE_CLI, 'update-status', 'task', 'T01', 'status', 'implemented'], {
        cwd: tmpDir, encoding: 'utf8'
      });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /Illegal transition/);
      assert.match(r.stderr, /Did you mean "implementing"\?/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// FORGE-S22-T05 — emit FK-check (sprintId foreign-key validation)
// ---------------------------------------------------------------------------

describe('store-cli.cjs — emit FK-check (FORGE-S22-T05)', () => {
  // Minimal valid event payload; FK check fires before schema validation so
  // tests 1/3/5 don't require a fully valid event shape to observe the error.
  const MINIMAL_EVENT = JSON.stringify({
    eventId: 'E-FK-001',
    taskId: 'FORGE-S22-T05',
    sprintId: 'FORGE-S01',
    role: 'implement',
    action: 'implement-task',
    phase: 'implement',
    iteration: 1,
    startTimestamp: '2026-05-17T10:00:00.000Z',
    endTimestamp: '2026-05-17T10:05:00.000Z',
    durationMinutes: 5,
    model: 'claude-sonnet-4-6',
    provider: 'anthropic',
  });

  function makeEmitFKStore() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-fk-'));
    // Sprint record for FORGE-S01
    fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'sprints'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.forge', 'store', 'sprints', 'FORGE-S01.json'),
      JSON.stringify({ sprintId: 'FORGE-S01', title: 'Test sprint', status: 'planning', taskIds: [], createdAt: '2026-01-01T00:00:00Z' }, null, 2)
    );
    // Events directory for FORGE-S01
    fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'events', 'FORGE-S01'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.forge', 'config.json'),
      JSON.stringify({ paths: { store: '.forge/store' } }, null, 2)
    );
    return tmpDir;
  }

  test('unknown sprintId is rejected with structured error', () => {
    const tmpDir = makeEmitFKStore();
    try {
      const r = spawnSync(process.execPath, [STORE_CLI, 'emit', 'S01', '{}'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.notEqual(r.status, 0, `should exit non-zero for unknown sprintId S01, got exit 0. stderr: ${r.stderr}`);
      assert.match(r.stderr, /Unknown sprintId: S01/, `stderr should contain "Unknown sprintId: S01". Got: ${r.stderr}`);
      assert.match(r.stderr, /Did you mean "FORGE-S01"\?/, `stderr should contain suggestion. Got: ${r.stderr}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('reserved virtual sprintId "bugs" is accepted (no FK rejection)', () => {
    // Regression for GH-#### — fix-bug workflow emits phase events under the
    // shared "bugs" virtual sprint dir (validate-store.spec.md:145). emit must
    // recognise it as reserved alongside SYS-*, otherwise every bug-fix run
    // dies with "Unknown sprintId: bugs".
    const tmpDir = makeEmitFKStore();
    try {
      const r = spawnSync(process.execPath, [STORE_CLI, 'emit', 'bugs', '{}'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.ok(
        !r.stderr.includes('Unknown sprintId: bugs'),
        `FK check should not reject "bugs". stderr: ${r.stderr}`
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('reserved virtual sprintId "enhancement" is accepted (no FK rejection)', () => {
    // FORGE-S25-T01 — post-init / post-sprint hooks emit enhancement-trigger
    // events under the shared "enhancement" virtual sprint dir. emit must
    // recognise it as reserved alongside "bugs" and SYS-*, otherwise the
    // hooks silently drop the event (caught only by the hook test suite).
    const tmpDir = makeEmitFKStore();
    try {
      const r = spawnSync(process.execPath, [STORE_CLI, 'emit', 'enhancement', '{}'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.ok(
        !r.stderr.includes('Unknown sprintId: enhancement'),
        `FK check should not reject "enhancement". stderr: ${r.stderr}`
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('reserved SYS-* prefix is accepted (no FK rejection)', () => {
    const tmpDir = makeEmitFKStore();
    try {
      const r = spawnSync(process.execPath, [STORE_CLI, 'emit', 'SYS-init', '{}'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      // FK check must NOT trigger — error may come from schema validation but
      // stderr must NOT contain the FK rejection message.
      assert.ok(
        !r.stderr.includes('Unknown sprintId: SYS-init'),
        `FK check should not reject SYS-init. stderr: ${r.stderr}`
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('--allow-synthetic bypasses FK check for unknown sprintId', () => {
    const tmpDir = makeEmitFKStore();
    try {
      const r = spawnSync(process.execPath, [STORE_CLI, 'emit', 'BOGUS-S99', '{}', '--allow-synthetic'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      // The FK check must NOT trigger. Schema may still reject the empty payload —
      // we only assert that the FK rejection message is absent.
      assert.ok(
        !r.stderr.includes('Unknown sprintId: BOGUS-S99'),
        `FK check should be bypassed with --allow-synthetic. stderr: ${r.stderr}`
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('valid sprintId from store is accepted (regression — golden path)', () => {
    const tmpDir = makeEmitFKStore();
    try {
      const r = spawnSync(process.execPath, [STORE_CLI, 'emit', 'FORGE-S01', MINIMAL_EVENT], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, `should exit 0 for valid FORGE-S01 sprintId. stderr: ${r.stderr}`);
      const evPath = path.join(tmpDir, '.forge', 'store', 'events', 'FORGE-S01', 'E-FK-001.json');
      assert.ok(fs.existsSync(evPath), 'event file should be written for valid sprintId');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('rejection message lists valid sprint IDs', () => {
    const tmpDir = makeEmitFKStore();
    try {
      const r = spawnSync(process.execPath, [STORE_CLI, 'emit', 'BAD-S1', '{}'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.notEqual(r.status, 0, `should exit non-zero for BAD-S1. stderr: ${r.stderr}`);
      assert.match(r.stderr, /Valid sprint IDs:/, `stderr should list valid IDs. Got: ${r.stderr}`);
      assert.ok(r.stderr.includes('FORGE-S01'), `valid IDs list should include FORGE-S01. Got: ${r.stderr}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});  // end describe('store-cli.cjs — emit FK-check (FORGE-S22-T05)')

// ---------------------------------------------------------------------------
// Defect D — list event traverses all sub-directories (bugs/, enhancement/, <sprintId>/)
// ---------------------------------------------------------------------------

describe('store-cli.cjs — list event traverses all subdirectories (Defect D)', () => {
  function makeEventStore() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-event-list-'));
    // Create .forge config + store skeleton
    fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'events', 'FORGE-S01'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'events', 'bugs'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'events', 'enhancement'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'sprints'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.forge', 'config.json'),
      JSON.stringify({ paths: { store: '.forge/store' } }, null, 2)
    );

    const sprintEvent = {
      eventId: 'EVT-S-001', taskId: 'T-001', sprintId: 'FORGE-S01', role: 'engineer',
      action: 'plan', phase: 'plan', iteration: 1,
      startTimestamp: '2026-05-20T10:00:00Z', endTimestamp: '2026-05-20T10:30:00Z',
      durationMinutes: 30, model: 'claude-sonnet-4-6',
    };
    const bugEvent = {
      eventId: 'EVT-B-001', taskId: 'BUG-001', sprintId: 'bugs', role: 'engineer',
      action: 'triage', phase: 'triage', iteration: 1,
      startTimestamp: '2026-05-20T11:00:00Z', endTimestamp: '2026-05-20T11:15:00Z',
      durationMinutes: 15, model: 'claude-sonnet-4-6',
    };
    const enhancementEvent = {
      eventId: 'EVT-E-001', taskId: 'ENH-001', sprintId: 'enhancement', role: 'architect',
      action: 'plan', phase: 'plan', iteration: 1,
      startTimestamp: '2026-05-20T12:00:00Z', endTimestamp: '2026-05-20T12:20:00Z',
      durationMinutes: 20, model: 'claude-sonnet-4-6',
    };

    fs.writeFileSync(
      path.join(tmpDir, '.forge', 'store', 'events', 'FORGE-S01', 'EVT-S-001.json'),
      JSON.stringify(sprintEvent, null, 2)
    );
    fs.writeFileSync(
      path.join(tmpDir, '.forge', 'store', 'events', 'bugs', 'EVT-B-001.json'),
      JSON.stringify(bugEvent, null, 2)
    );
    fs.writeFileSync(
      path.join(tmpDir, '.forge', 'store', 'events', 'enhancement', 'EVT-E-001.json'),
      JSON.stringify(enhancementEvent, null, 2)
    );

    return tmpDir;
  }

  test('list event exits 0 (previously exited 1 with "Unknown entity type: event")', () => {
    const tmpDir = makeEventStore();
    try {
      const r = spawnSync(process.execPath, [STORE_CLI, 'list', 'event'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0,
        `list event should exit 0, got ${r.status}. stderr: ${r.stderr}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('list event returns events from all three sub-directories', () => {
    const tmpDir = makeEventStore();
    try {
      const r = spawnSync(process.execPath, [STORE_CLI, 'list', 'event'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);
      const records = JSON.parse(r.stdout);
      assert.ok(Array.isArray(records), 'output should be a JSON array');
      assert.equal(records.length, 3, `expected 3 events, got ${records.length}: ${JSON.stringify(records)}`);
      const ids = records.map(e => e.eventId).sort();
      assert.deepEqual(ids, ['EVT-B-001', 'EVT-E-001', 'EVT-S-001']);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('list event on an empty events dir returns empty array', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-event-empty-'));
    try {
      fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'events'), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, '.forge', 'config.json'),
        JSON.stringify({ paths: { store: '.forge/store' } }, null, 2)
      );
      const r = spawnSync(process.execPath, [STORE_CLI, 'list', 'event'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);
      const records = JSON.parse(r.stdout);
      assert.deepEqual(records, []);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('list event skips sidecar files (_-prefixed)', () => {
    const tmpDir = makeEventStore();
    try {
      // Add a sidecar file
      fs.writeFileSync(
        path.join(tmpDir, '.forge', 'store', 'events', 'FORGE-S01', '_EVT-S-001_usage.json'),
        JSON.stringify({ inputTokens: 100 }, null, 2)
      );
      const r = spawnSync(process.execPath, [STORE_CLI, 'list', 'event'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);
      const records = JSON.parse(r.stdout);
      assert.equal(records.length, 3, `sidecar should not be counted; got ${records.length}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// store-cli.cjs — list/read projection flags (FORGE-S26-T16)
// ---------------------------------------------------------------------------

describe('store-cli.cjs — list --no-summaries flag', () => {
  test('list task --no-summaries excludes summaries key', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', {
        ...MINIMAL_TASK,
        summaries: { plan: { objective: 'x', written_at: new Date().toISOString() } }
      });
      const r = spawnSync(process.execPath, [STORE_CLI, 'list', 'task', '--no-summaries'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);
      const records = JSON.parse(r.stdout);
      assert.ok(Array.isArray(records) && records.length > 0, 'expected at least one record');
      for (const rec of records) {
        assert.ok(!('summaries' in rec), `summaries key should be absent: ${JSON.stringify(rec)}`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('store-cli.cjs — list --fields flag', () => {
  test('list task --fields taskId,status only includes those fields', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', MINIMAL_TASK);
      const r = spawnSync(process.execPath, [STORE_CLI, 'list', 'task', '--fields', 'taskId,status'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);
      const records = JSON.parse(r.stdout);
      assert.ok(Array.isArray(records) && records.length > 0, 'expected at least one record');
      for (const rec of records) {
        const keys = Object.keys(rec);
        assert.ok(keys.includes('taskId'), 'expected taskId field');
        assert.ok(keys.includes('status'), 'expected status field');
        assert.ok(!keys.includes('title'), `unexpected title field: ${JSON.stringify(rec)}`);
        assert.ok(!keys.includes('path'), `unexpected path field: ${JSON.stringify(rec)}`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('store-cli.cjs — list --limit flag', () => {
  test('list task --limit 1 returns at most 1 record', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', { ...MINIMAL_TASK, taskId: 'T01' });
      writeTaskFile(tmpDir, 'T02', { ...MINIMAL_TASK, taskId: 'T02' });
      writeTaskFile(tmpDir, 'T03', { ...MINIMAL_TASK, taskId: 'T03' });
      const r = spawnSync(process.execPath, [STORE_CLI, 'list', 'task', '--limit', '1'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);
      const records = JSON.parse(r.stdout);
      assert.ok(records.length <= 1, `expected at most 1 record, got ${records.length}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('list task --limit 2 returns at most 2 records from 3', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', { ...MINIMAL_TASK, taskId: 'T01' });
      writeTaskFile(tmpDir, 'T02', { ...MINIMAL_TASK, taskId: 'T02' });
      writeTaskFile(tmpDir, 'T03', { ...MINIMAL_TASK, taskId: 'T03' });
      const r = spawnSync(process.execPath, [STORE_CLI, 'list', 'task', '--limit', '2'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);
      const records = JSON.parse(r.stdout);
      assert.ok(records.length <= 2, `expected at most 2 records, got ${records.length}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('store-cli.cjs — list --count flag', () => {
  test('list task --count returns bare integer output', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', { ...MINIMAL_TASK, taskId: 'T01' });
      writeTaskFile(tmpDir, 'T02', { ...MINIMAL_TASK, taskId: 'T02' });
      const r = spawnSync(process.execPath, [STORE_CLI, 'list', 'task', '--count'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);
      const trimmed = r.stdout.trim();
      assert.match(trimmed, /^\d+$/, `expected bare integer, got: ${r.stdout}`);
      assert.equal(parseInt(trimmed, 10), 2, `expected count 2, got ${trimmed}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('list task --count ignores --fields and --no-summaries when present', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', { ...MINIMAL_TASK, taskId: 'T01' });
      const r = spawnSync(process.execPath, [STORE_CLI, 'list', 'task', '--count', '--fields', 'taskId', '--no-summaries'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);
      const trimmed = r.stdout.trim();
      assert.match(trimmed, /^\d+$/, `expected bare integer, got: ${r.stdout}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('store-cli.cjs — read --no-summaries flag', () => {
  test('read task X --no-summaries excludes summaries key', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', {
        ...MINIMAL_TASK,
        summaries: { plan: { objective: 'y', written_at: new Date().toISOString() } }
      });
      const r = spawnSync(process.execPath, [STORE_CLI, 'read', 'task', 'T01', '--no-summaries'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);
      const rec = JSON.parse(r.stdout);
      assert.ok(!('summaries' in rec), `summaries key should be absent: ${JSON.stringify(rec)}`);
      assert.ok('taskId' in rec, 'taskId should still be present');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('store-cli.cjs — read --fields flag', () => {
  test('read task X --fields taskId,status only includes those fields', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', MINIMAL_TASK);
      const r = spawnSync(process.execPath, [STORE_CLI, 'read', 'task', 'T01', '--fields', 'taskId,status'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);
      const rec = JSON.parse(r.stdout);
      const keys = Object.keys(rec);
      assert.ok(keys.includes('taskId'), 'expected taskId field');
      assert.ok(keys.includes('status'), 'expected status field');
      assert.ok(!keys.includes('title'), `unexpected title field: ${JSON.stringify(rec)}`);
      assert.ok(!keys.includes('path'), `unexpected path field: ${JSON.stringify(rec)}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('read --fields projection applies before --json serialization', () => {
    const tmpDir = makeTempStore();
    try {
      writeTaskFile(tmpDir, 'T01', MINIMAL_TASK);
      const r = spawnSync(process.execPath, [STORE_CLI, 'read', 'task', 'T01', '--fields', 'taskId', '--json'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);
      const rec = JSON.parse(r.stdout);
      assert.deepEqual(Object.keys(rec), ['taskId'], `expected only taskId: ${JSON.stringify(rec)}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});