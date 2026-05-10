'use strict';
// FORGE-S20-T00 — Friction event-type contract.
//
// Iron Law 2: this test was written BEFORE the schema and validator changes
// that made it pass. Three cases:
//   1. A complete friction event (type:"friction" + workflow + persona + issue)
//      validates with zero errors.
//   2. A friction event missing any of {workflow, persona, issue} is rejected
//      with a missing-required error per absent field.
//   3. A non-friction event (no `type` field) continues to validate exactly
//      as before — no regression for the millions of existing events.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateRecord } = require('../validate-store.cjs');

const eventSchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', 'schemas', 'event.schema.json'), 'utf8'),
);

// Canonical baseline event satisfying every existing required field on
// event.schema.json (eventId, taskId, sprintId, role, action, phase,
// iteration, startTimestamp, endTimestamp, durationMinutes, model).
function baseEvent(overrides = {}) {
  return {
    eventId:         '20260510T120000000Z_FORGE-S20-T00_engineer_friction',
    taskId:          'FORGE-S20-T00',
    sprintId:        'FORGE-S20',
    role:            'engineer',
    action:          'implement',
    phase:           'implement',
    iteration:       1,
    startTimestamp:  '2026-05-10T12:00:00Z',
    endTimestamp:    '2026-05-10T12:01:00Z',
    durationMinutes: 1,
    model:           'claude-opus-4-7',
    ...overrides,
  };
}

describe('event.schema.json — friction event type', () => {

  test('complete friction event validates with zero errors', () => {
    const ev = baseEvent({
      type:     'friction',
      workflow: 'implement',
      persona:  'engineer',
      issue:    'skill_unused',
    });
    const errors = validateRecord(ev, eventSchema);
    assert.deepEqual(errors, [],
      `expected no errors, got: ${JSON.stringify(errors, null, 2)}`);
  });

  test('friction event missing workflow/persona/issue is rejected', () => {
    const ev = baseEvent({ type: 'friction' });
    const errors = validateRecord(ev, eventSchema);
    const missing = errors
      .filter((e) => e.category === 'missing-required')
      .map((e) => e.field)
      .sort();
    assert.ok(missing.includes('workflow'), `expected workflow missing, got: ${missing.join(',')}`);
    assert.ok(missing.includes('persona'),  `expected persona missing,  got: ${missing.join(',')}`);
    assert.ok(missing.includes('issue'),    `expected issue missing,    got: ${missing.join(',')}`);
  });

  test('friction event missing only one required field is rejected', () => {
    const ev = baseEvent({
      type:     'friction',
      workflow: 'orchestrate',
      persona:  'orchestrator',
      // issue intentionally absent
    });
    const errors = validateRecord(ev, eventSchema);
    const missing = errors
      .filter((e) => e.category === 'missing-required')
      .map((e) => e.field);
    assert.deepEqual(missing, ['issue'],
      `expected exactly issue missing, got: ${JSON.stringify(errors)}`);
  });

  test('non-friction event (no type field) validates with zero errors — no regression', () => {
    const ev = baseEvent();
    const errors = validateRecord(ev, eventSchema);
    assert.deepEqual(errors, [],
      `expected no errors for typeless event, got: ${JSON.stringify(errors, null, 2)}`);
  });

  test('event with type other than "friction" is rejected on enum', () => {
    const ev = baseEvent({ type: 'bogus' });
    const errors = validateRecord(ev, eventSchema);
    const enumErrs = errors.filter((e) => e.category === 'invalid-enum' && e.field === 'type');
    assert.equal(enumErrs.length, 1,
      `expected one enum error on type, got: ${JSON.stringify(errors)}`);
  });

});

// FORGE-S20-T01 — Friction subkind enum + evidence block.
//
// Iron Law 2: written BEFORE the schema/validator changes that narrow the
// `subkind` slot to a combined enum-or-x_pattern regex and shape `evidence`
// into a typed object. The combined pattern is:
//
//   ^(skill_unused|skill_failed|skill_missing|skill_stale|skill_redundant|x_[a-z_]+)$
//
// validate-store.cjs is extended in the same task to honor the `pattern`
// keyword on string fields — these tests exercise that interpreter.
describe('event.schema.json — friction subkind + evidence (T01)', () => {

  function frictionEvent(overrides = {}) {
    return baseEvent({
      type:     'friction',
      workflow: 'implement',
      persona:  'engineer',
      issue:    'skill_unused',
      ...overrides,
    });
  }

  for (const subkind of [
    'skill_unused',
    'skill_failed',
    'skill_missing',
    'skill_stale',
    'skill_redundant',
  ]) {
    test(`subkind "${subkind}" (frozen enum) is accepted`, () => {
      const ev = frictionEvent({ subkind });
      const errors = validateRecord(ev, eventSchema);
      assert.deepEqual(errors, [],
        `expected no errors for subkind=${subkind}, got: ${JSON.stringify(errors, null, 2)}`);
    });
  }

  test('subkind in reserved x_* namespace is accepted', () => {
    const ev = frictionEvent({ subkind: 'x_experimental_kind' });
    const errors = validateRecord(ev, eventSchema);
    assert.deepEqual(errors, [],
      `expected no errors for x_experimental_kind, got: ${JSON.stringify(errors, null, 2)}`);
  });

  test('subkind "x_BAD" (uppercase violates [a-z_]+) is rejected', () => {
    const ev = frictionEvent({ subkind: 'x_BAD' });
    const errors = validateRecord(ev, eventSchema);
    const patternErrs = errors.filter(
      (e) => e.category === 'pattern-mismatch' && e.field === 'subkind',
    );
    assert.equal(patternErrs.length, 1,
      `expected one pattern-mismatch on subkind, got: ${JSON.stringify(errors)}`);
  });

  test('subkind "X_foo" (uppercase prefix) is rejected', () => {
    const ev = frictionEvent({ subkind: 'X_foo' });
    const errors = validateRecord(ev, eventSchema);
    const patternErrs = errors.filter(
      (e) => e.category === 'pattern-mismatch' && e.field === 'subkind',
    );
    assert.equal(patternErrs.length, 1,
      `expected one pattern-mismatch on subkind, got: ${JSON.stringify(errors)}`);
  });

  test('subkind "unknown_kind" (not in enum, no x_ prefix) is rejected', () => {
    const ev = frictionEvent({ subkind: 'unknown_kind' });
    const errors = validateRecord(ev, eventSchema);
    const patternErrs = errors.filter(
      (e) => e.category === 'pattern-mismatch' && e.field === 'subkind',
    );
    assert.equal(patternErrs.length, 1,
      `expected one pattern-mismatch on subkind, got: ${JSON.stringify(errors)}`);
  });

  test('friction event with full evidence object is accepted', () => {
    const ev = frictionEvent({
      subkind: 'skill_failed',
      evidence: {
        trajectory_excerpt: 'persona invoked skill X, error returned',
        tool_errors:        ['skill X exited 1', 'retry timed out'],
        retrieval_score:    0.42,
        skillId:            'engineer-skill-template-render',
      },
    });
    const errors = validateRecord(ev, eventSchema);
    assert.deepEqual(errors, [],
      `expected no errors for full evidence, got: ${JSON.stringify(errors, null, 2)}`);
  });

  test('T00-shaped friction event without subkind/evidence still validates', () => {
    // No regression: T01 narrows the optional slots but does NOT add them
    // to the friction allOf then-required block.
    const ev = frictionEvent();
    const errors = validateRecord(ev, eventSchema);
    assert.deepEqual(errors, [],
      `expected no errors for T00-shape friction event, got: ${JSON.stringify(errors, null, 2)}`);
  });

});
