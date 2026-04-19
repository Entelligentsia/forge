'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { isLegalTransition, TRANSITION_MAP, TERMINAL_STATES, FAILED_STATES, validateRecord, NULLABLE_FIELDS, VALID_SUMMARY_PHASES, PHASE_SUMMARY_SCHEMA } = require('../store-cli.cjs');

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

  test('terminal state committed cannot transition out', () => {
    assert.equal(isLegalTransition('task', 'status', 'committed', 'implementing'), false);
  });

  test('terminal state abandoned cannot transition out', () => {
    assert.equal(isLegalTransition('task', 'status', 'abandoned', 'draft'), false);
  });

  test('terminal state verified (bug) cannot transition out', () => {
    assert.equal(isLegalTransition('bug', 'status', 'verified', 'reported'), false);
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

  test('contains verified (bug)', () => {
    assert.ok(TERMINAL_STATES.has('verified'), 'should contain verified');
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
  test('contains blocked', () => {
    assert.ok(FAILED_STATES.has('blocked'), 'should contain blocked');
  });

  test('contains escalated', () => {
    assert.ok(FAILED_STATES.has('escalated'), 'should contain escalated');
  });

  test('contains abandoned', () => {
    assert.ok(FAILED_STATES.has('abandoned'), 'should contain abandoned');
  });

  test('contains plan-revision-required', () => {
    assert.ok(FAILED_STATES.has('plan-revision-required'), 'should contain plan-revision-required');
  });

  test('contains code-revision-required', () => {
    assert.ok(FAILED_STATES.has('code-revision-required'), 'should contain code-revision-required');
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

  test('progress writes log line and emits human-readable summary to stdout', () => {
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

      // Verify stdout emits human-readable summary with persona emoji
      assert.ok(r.stdout.trim().length > 0, 'stdout should emit a summary line');
      assert.ok(r.stdout.includes('🌕'), 'stdout should include oracle emoji 🌕');
      assert.ok(r.stdout.includes('[progress]'), 'stdout should include bracketed status');
      assert.ok(r.stdout.includes('Mapping AC coverage'), 'stdout should include detail');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('progress stdout falls back gracefully for unknown bannerKey', () => {
    const tmpDir = makeSprintStore();
    try {
      const r = spawnSync('node', [STORE_CLI, 'progress', 'S1', 'engineer', 'unknown-key', 'start', 'Starting work'], {
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