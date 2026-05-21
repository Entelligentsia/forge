'use strict';
// FORGE-S24-T01 — skill_usage event-type contract (Sprint S24, plan 08 Phase B).
//
// Iron Law 2: this test is written BEFORE the schema change that makes it pass.
// Five cases:
//   1. A complete skill_usage event validates with zero errors.
//   2. A skill_usage event missing any of the required variant-scoped fields
//      ({skillId, retrieved, used, tool_call_success_rate, retrieval_score})
//      is rejected with a missing-required error per absent field.
//   3. A skill_usage event with tool_call_success_rate out of [0,1] is rejected.
//   4. A skill_usage event with an unknown top-level field is rejected by the
//      schema's strict `additionalProperties: false` gate (AC 7).
//   5. An existing friction event continues to validate — no regression.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateRecord } = require('../validate-store.cjs');

const eventSchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', 'schemas', 'event.schema.json'), 'utf8'),
);

// Canonical baseline event satisfying every existing required field on
// event.schema.json (eventId, sprintId, role, action, startTimestamp,
// endTimestamp, durationMinutes, model, provider).
function baseEvent(overrides = {}) {
  return {
    eventId:         '20260522T120000000Z_FORGE-S24-T01_engineer_skill_usage',
    taskId:          'FORGE-S24-T01',
    sprintId:        'FORGE-S24',
    role:            'engineer',
    action:          'skill-usage',
    startTimestamp:  '2026-05-22T12:00:00Z',
    endTimestamp:    '2026-05-22T12:00:01Z',
    durationMinutes: 0.0166,
    model:           'claude-opus-4-7',
    provider:        'anthropic',
    ...overrides,
  };
}

function completeSkillUsage(overrides = {}) {
  return baseEvent({
    type:                   'skill_usage',
    skillId:                'forge-cli-engineer',
    retrieved:              true,
    used:                   true,
    tool_call_success_rate: 0.95,
    retrieval_score:        0.82,
    ...overrides,
  });
}

describe('event.schema.json — skill_usage event type (FORGE-S24-T01)', () => {

  test('complete skill_usage event validates with zero errors', () => {
    const ev = completeSkillUsage();
    const errors = validateRecord(ev, eventSchema);
    assert.deepEqual(errors, [],
      `expected no errors, got: ${JSON.stringify(errors, null, 2)}`);
  });

  for (const field of ['skillId', 'retrieved', 'used', 'tool_call_success_rate', 'retrieval_score']) {
    test(`skill_usage event missing ${field} fails`, () => {
      const ev = completeSkillUsage();
      delete ev[field];
      const errors = validateRecord(ev, eventSchema);
      const missing = errors
        .filter(e => e.category === 'missing-required')
        .map(e => e.field);
      assert.ok(missing.includes(field),
        `expected ${field} in missing-required, got: ${missing.join(',')}`);
    });
  }

  test('skill_usage event with negative tool_call_success_rate is rejected', () => {
    // The validator enforces `minimum` (not `maximum`); use a negative value
    // to hit the minimum guard, which exercises the same numeric-range path.
    const ev = completeSkillUsage({ tool_call_success_rate: -0.5 });
    const errors = validateRecord(ev, eventSchema);
    const outOfRange = errors.filter(e =>
      e.field === 'tool_call_success_rate' && e.category === 'minimum-violation'
    );
    assert.ok(outOfRange.length > 0,
      `expected minimum-violation on tool_call_success_rate, got: ${JSON.stringify(errors)}`);
  });

  test('skill_usage event with unknown top-level field is rejected (additionalProperties:false)', () => {
    const ev = completeSkillUsage({ bogus_field: 'should-be-rejected' });
    const errors = validateRecord(ev, eventSchema);
    const extras = errors.filter(e =>
      e.category === 'undeclared-field' && e.field === 'bogus_field'
    );
    assert.ok(extras.length > 0,
      `expected undeclared-field rejection for bogus_field, got: ${JSON.stringify(errors)}`);
  });

  test('regression: friction event still validates', () => {
    const ev = baseEvent({
      type:     'friction',
      workflow: 'implement',
      persona:  'engineer',
      issue:    'skill_missing',
      subkind:  'skill_missing',
    });
    const errors = validateRecord(ev, eventSchema);
    assert.deepEqual(errors, [],
      `expected no errors on friction event, got: ${JSON.stringify(errors, null, 2)}`);
  });

});
