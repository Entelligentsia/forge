'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { isLegalTransition, TRANSITION_MAP, TERMINAL_STATES, FAILED_STATES, validateRecord, NULLABLE_FIELDS } = require('../store-cli.cjs');

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