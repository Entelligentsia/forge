'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { validateRecord, MINIMAL_REQUIRED, NULLABLE_FK, BACKFILL, ENTITY_TYPES } = require('../validate-store.cjs');

describe('validate-store.cjs — MINIMAL_REQUIRED', () => {
  test('has expected entity types as keys', () => {
    assert.ok(MINIMAL_REQUIRED.sprint, 'should have sprint');
    assert.ok(MINIMAL_REQUIRED.task, 'should have task');
    assert.ok(MINIMAL_REQUIRED.bug, 'should have bug');
    assert.ok(MINIMAL_REQUIRED.event, 'should have event');
    assert.ok(MINIMAL_REQUIRED.feature, 'should have feature');
  });

  test('sprint required fields include sprintId and title', () => {
    assert.ok(MINIMAL_REQUIRED.sprint.includes('sprintId'), 'sprint should require sprintId');
    assert.ok(MINIMAL_REQUIRED.sprint.includes('title'), 'sprint should require title');
    assert.ok(MINIMAL_REQUIRED.sprint.includes('status'), 'sprint should require status');
  });

  test('task required fields include taskId and sprintId', () => {
    assert.ok(MINIMAL_REQUIRED.task.includes('taskId'), 'task should require taskId');
    assert.ok(MINIMAL_REQUIRED.task.includes('sprintId'), 'task should require srintId');
    assert.ok(MINIMAL_REQUIRED.task.includes('status'), 'task should require status');
  });

  test('bug required fields include bugId and severity', () => {
    assert.ok(MINIMAL_REQUIRED.bug.includes('bugId'), 'bug should require bugId');
    assert.ok(MINIMAL_REQUIRED.bug.includes('severity'), 'bug should require severity');
  });

  test('event required fields include eventId and role', () => {
    assert.ok(MINIMAL_REQUIRED.event.includes('eventId'), 'event should require eventId');
    assert.ok(MINIMAL_REQUIRED.event.includes('role'), 'event should require role');
  });

  test('feature required fields include id and title', () => {
    assert.ok(MINIMAL_REQUIRED.feature.includes('id'), 'feature should require id');
    assert.ok(MINIMAL_REQUIRED.feature.includes('title'), 'feature should require title');
  });
});

describe('validate-store.cjs — NULLABLE_FK', () => {
  test('is a Set', () => {
    assert.ok(NULLABLE_FK instanceof Set, 'NULLABLE_FK should be a Set');
  });

  test('contains sprintId', () => {
    assert.ok(NULLABLE_FK.has('sprintId'), 'should contain sprintId');
  });

  test('contains taskId', () => {
    assert.ok(NULLABLE_FK.has('taskId'), 'should contain taskId');
  });

  test('contains endTimestamp', () => {
    assert.ok(NULLABLE_FK.has('endTimestamp'), 'should contain endTimestamp');
  });

  test('contains durationMinutes', () => {
    assert.ok(NULLABLE_FK.has('durationMinutes'), 'should contain durationMinutes');
  });

  test('does not contain non-nullable fields', () => {
    assert.ok(!NULLABLE_FK.has('title'), 'title should not be nullable');
    assert.ok(!NULLABLE_FK.has('status'), 'status should not be nullable');
  });
});

describe('validate-store.cjs — validateRecord', () => {
  test('returns empty array for valid minimal record', () => {
    const schema = {
      required: ['name', 'status'],
      properties: {
        name: { type: 'string' },
        status: { type: 'string', enum: ['active', 'closed'] }
      }
    };
    const record = { name: 'test-sprint', status: 'active' };
    const errors = validateRecord(record, schema);
    assert.equal(errors.length, 0);
  });

  test('reports missing required fields with category missing-required', () => {
    const schema = {
      required: ['sprintId', 'title'],
      properties: {}
    };
    const record = { sprintId: 'S01' }; // missing title
    const errors = validateRecord(record, schema);
    assert.ok(errors.length >= 1, 'should report at least one error');
    const titleError = errors.find(e => e.field === 'title');
    assert.ok(titleError, 'should have error for missing title');
    assert.equal(titleError.category, 'missing-required');
  });

  test('allows null in nullable FK fields', () => {
    const schema = {
      required: ['sprintId'],
      properties: { sprintId: { type: 'string' } }
    };
    const record = { sprintId: null };
    const errors = validateRecord(record, schema);
    assert.equal(errors.length, 0, 'null should be allowed in NULLABLE_FK field');
  });

  test('reports null in non-nullable required fields', () => {
    const schema = {
      required: ['title'],
      properties: { title: { type: 'string' } }
    };
    const record = { title: null };
    const errors = validateRecord(record, schema);
    assert.ok(errors.length > 0, 'null should not be allowed in non-nullable required field');
    const titleError = errors.find(e => e.field === 'title');
    assert.ok(titleError, 'should have error for null title');
    assert.equal(titleError.category, 'missing-required');
  });

  test('reports empty string as missing required', () => {
    const schema = {
      required: ['name'],
      properties: { name: { type: 'string' } }
    };
    const record = { name: '' };
    const errors = validateRecord(record, schema);
    assert.ok(errors.length > 0, 'empty string should be treated as missing');
    assert.equal(errors[0].category, 'missing-required');
  });

  test('reports type mismatches', () => {
    const schema = {
      required: [],
      properties: { count: { type: 'integer' } }
    };
    const record = { count: 'not-a-number' };
    const errors = validateRecord(record, schema);
    assert.ok(errors.length > 0, 'should report type mismatch');
    const typeError = errors.find(e => e.category === 'type-mismatch');
    assert.ok(typeError, 'should have type-mismatch error');
  });

  test('reports enum violations', () => {
    const schema = {
      required: [],
      properties: { status: { type: 'string', enum: ['active', 'closed'] } }
    };
    const record = { status: 'unknown' };
    const errors = validateRecord(record, schema);
    assert.ok(errors.length > 0, 'should report enum violation');
    const enumError = errors.find(e => e.category === 'invalid-enum');
    assert.ok(enumError, 'should have invalid-enum error');
  });

  test('reports minimum violations', () => {
    const schema = {
      required: [],
      properties: { count: { type: 'integer', minimum: 0 } }
    };
    const record = { count: -1 };
    const errors = validateRecord(record, schema);
    assert.ok(errors.length > 0, 'should report minimum violation');
    const minError = errors.find(e => e.category === 'minimum-violation');
    assert.ok(minError, 'should have minimum-violation error');
  });

  test('reports undeclared fields when additionalProperties is false', () => {
    const schema = {
      required: ['name'],
      properties: { name: { type: 'string' } },
      additionalProperties: false
    };
    const record = { name: 'test', extraField: 'oops' };
    const errors = validateRecord(record, schema);
    const undeclared = errors.find(e => e.category === 'undeclared-field');
    assert.ok(undeclared, 'should report undeclared field');
    assert.equal(undeclared.field, 'extraField');
  });

  test('skips null and undefined values in property checks', () => {
    const schema = {
      required: [],
      properties: { count: { type: 'integer', minimum: 0 } }
    };
    const record = { count: null };
    const errors = validateRecord(record, schema);
    assert.equal(errors.length, 0, 'null values should be skipped in property checks');
  });

  test('allows union types (array of types)', () => {
    const schema = {
      required: [],
      properties: { value: { type: ['string', 'null'] } }
    };
    const record = { value: 'hello' };
    const errors = validateRecord(record, schema);
    assert.equal(errors.length, 0, 'string should match union type [string, null]');
  });

  test('reports array type mismatches', () => {
    const schema = {
      required: [],
      properties: { tags: { type: 'array' } }
    };
    const record = { tags: 'not-an-array' };
    const errors = validateRecord(record, schema);
    assert.ok(errors.length > 0, 'should report type mismatch for array');
  });
});

describe('validate-store.cjs — BACKFILL', () => {
  test('has entries for sprint, bug, and event', () => {
    assert.ok(BACKFILL.sprint, 'should have sprint backfill rules');
    assert.ok(BACKFILL.bug, 'should have bug backfill rules');
    assert.ok(BACKFILL.event, 'should have event backfill rules');
  });

  test('sprint backfill includes createdAt', () => {
    assert.ok(typeof BACKFILL.sprint.createdAt === 'function', 'sprint should have createdAt backfill');
  });

  test('bug backfill includes reportedAt', () => {
    assert.ok(typeof BACKFILL.bug.reportedAt === 'function', 'bug should have reportedAt backfill');
  });

  test('event backfill includes iteration defaulting to 1', () => {
    assert.equal(BACKFILL.event.iteration(), 1, 'event iteration should default to 1');
  });

  test('event backfill model derivation returns unknown for non-claude actor', () => {
    const result = BACKFILL.event.model({ actor: 'some-other-model' });
    assert.equal(result, 'unknown');
  });

  test('event backfill model derivation returns actor for claude actor', () => {
    const result = BACKFILL.event.model({ actor: 'claude-3-opus' });
    assert.equal(result, 'claude-3-opus');
  });

  test('event backfill role derives from agent', () => {
    const result = BACKFILL.event.role({ agent: 'planner' });
    assert.equal(result, 'planner');
  });

  test('event backfill role defaults to unknown', () => {
    const result = BACKFILL.event.role({});
    assert.equal(result, 'unknown');
  });
});

describe('validate-store.cjs — ENTITY_TYPES', () => {
  test('contains all five entity types', () => {
    assert.deepEqual(ENTITY_TYPES, ['sprint', 'task', 'bug', 'event', 'feature']);
  });
});