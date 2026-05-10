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
