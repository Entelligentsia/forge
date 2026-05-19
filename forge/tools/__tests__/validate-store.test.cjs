'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { validateRecord, MINIMAL_REQUIRED, NULLABLE_FK, BACKFILL, ENTITY_TYPES, ANCILLARY_SCHEMAS } = require('../validate-store.cjs');

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

describe('validate-store.cjs — ANCILLARY_SCHEMAS', () => {
  test('is an array', () => {
    assert.ok(Array.isArray(ANCILLARY_SCHEMAS), 'ANCILLARY_SCHEMAS should be an array');
  });

  test('contains project-overlay', () => {
    assert.ok(ANCILLARY_SCHEMAS.includes('project-overlay'), 'should include project-overlay');
  });

  test('contains project-context', () => {
    assert.ok(ANCILLARY_SCHEMAS.includes('project-context'), 'should include project-context');
  });
});

describe('project-context.schema.json — x-placeholder annotations', () => {
  const path = require('path');
  const fs = require('fs');
  const schemaPath = path.join(__dirname, '../../schemas/project-context.schema.json');

  test('schema file exists and is valid JSON', () => {
    assert.ok(fs.existsSync(schemaPath), 'project-context.schema.json must exist');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert.ok(schema && typeof schema === 'object', 'schema must parse to an object');
  });

  test('schema top-level $schema is draft 2020-12', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert.strictEqual(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  });

  test('architecture.frameworks carries x-placeholder STACK_SUMMARY', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert.strictEqual(
      schema.properties.architecture.properties.frameworks['x-placeholder'],
      'STACK_SUMMARY'
    );
  });

  test('architecture.keyDirectories carries x-placeholder KEY_DIRECTORIES', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert.strictEqual(
      schema.properties.architecture.properties.keyDirectories['x-placeholder'],
      'KEY_DIRECTORIES'
    );
  });

  test('impactCategories carries x-placeholder IMPACT_CATEGORIES', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert.strictEqual(
      schema.properties.impactCategories['x-placeholder'],
      'IMPACT_CATEGORIES'
    );
  });

  test('technicalDebt carries x-placeholder TECHNICAL_DEBT', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert.strictEqual(
      schema.properties.technicalDebt['x-placeholder'],
      'TECHNICAL_DEBT'
    );
  });

  test('verification carries x-placeholder VERIFICATION_COMMANDS', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert.strictEqual(
      schema.properties.verification['x-placeholder'],
      'VERIFICATION_COMMANDS'
    );
  });

  test('deployment.environments carries x-placeholder DEPLOYMENT_ENVIRONMENTS', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert.strictEqual(
      schema.properties.deployment.properties.environments['x-placeholder'],
      'DEPLOYMENT_ENVIRONMENTS'
    );
  });

  test('conventions.branching carries x-placeholder BRANCHING_CONVENTION', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert.strictEqual(
      schema.properties.conventions.properties.branching['x-placeholder'],
      'BRANCHING_CONVENTION'
    );
  });

  test('skillWiring carries x-placeholder SKILL_DIRECTIVES', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert.strictEqual(
      schema.properties.skillWiring['x-placeholder'],
      'SKILL_DIRECTIVES'
    );
  });
});

describe('structure-versions.schema.json — existence and shape', () => {
  const path = require('path');
  const fs = require('fs');
  const schemaPath = path.join(__dirname, '../../schemas/structure-versions.schema.json');

  test('schema file exists and is valid JSON', () => {
    assert.ok(fs.existsSync(schemaPath), 'structure-versions.schema.json must exist');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert.ok(schema && typeof schema === 'object', 'schema must parse to an object');
  });

  test('schema top-level $schema is draft 2020-12', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert.strictEqual(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  });
});

describe('validate-store.cjs — ANCILLARY_SCHEMAS includes structure-versions', () => {
  test('contains structure-versions', () => {
    assert.ok(ANCILLARY_SCHEMAS.includes('structure-versions'), 'should include structure-versions');
  });
});

describe('project-overlay.schema.json — version field', () => {
  const path = require('path');
  const fs = require('fs');
  const schemaPath = path.join(__dirname, '../../schemas/project-overlay.schema.json');

  test('has a version property', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert.ok('version' in schema, 'project-overlay.schema.json must have a version property');
    assert.strictEqual(typeof schema.version, 'string', 'version must be a string');
  });
});

// ---------------------------------------------------------------------------
// FORGE-S22-T05 — validate-store ORPHAN_EVENT_DIR check
// ---------------------------------------------------------------------------

describe('validate-store.cjs — ORPHAN_EVENT_DIR check (FORGE-S22-T05)', () => {
  const os = require('os');
  const fs = require('fs');
  const path = require('path');
  const { spawnSync } = require('child_process');

  const VALIDATE_STORE = path.join(__dirname, '..', 'validate-store.cjs');

  function makeOrphanStore() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-orphan-'));
    // Sprint record for FORGE-S01
    fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'sprints'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.forge', 'store', 'sprints', 'FORGE-S01.json'),
      JSON.stringify({ sprintId: 'FORGE-S01', title: 'Test sprint', status: 'planning', taskIds: [], createdAt: '2026-01-01T00:00:00Z' }, null, 2)
    );
    // Known sprint event dir — should NOT be flagged
    fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'events', 'FORGE-S01'), { recursive: true });
    // Orphan event dir — should be flagged
    fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'events', 'S01'), { recursive: true });
    // Reserved prefix dir — should NOT be flagged
    fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'events', 'SYS-init'), { recursive: true });
    // Virtual sprint dir for bug-phase events — should NOT be flagged
    fs.mkdirSync(path.join(tmpDir, '.forge', 'store', 'events', 'bugs'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.forge', 'config.json'),
      JSON.stringify({ paths: { store: '.forge/store' } }, null, 2)
    );
    return tmpDir;
  }

  test('orphan event dir is flagged as ORPHAN_EVENT_DIR', () => {
    const tmpDir = makeOrphanStore();
    try {
      const r = spawnSync(process.execPath, [VALIDATE_STORE], {
        cwd: tmpDir, encoding: 'utf8',
      });
      const output = r.stdout + r.stderr;
      assert.ok(
        output.includes('S01') && output.includes('ORPHAN_EVENT_DIR'),
        `output should flag S01 as ORPHAN_EVENT_DIR. Got stdout: ${r.stdout}, stderr: ${r.stderr}`
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('known sprint event dir is NOT flagged', () => {
    const tmpDir = makeOrphanStore();
    try {
      const r = spawnSync(process.execPath, [VALIDATE_STORE], {
        cwd: tmpDir, encoding: 'utf8',
      });
      const combined = r.stdout + r.stderr;
      // FORGE-S01 should not appear in ORPHAN_EVENT_DIR context
      assert.ok(
        !combined.includes('FORGE-S01') || !combined.includes('ORPHAN_EVENT_DIR') ||
        !combined.match(/FORGE-S01[^\n]*ORPHAN_EVENT_DIR/),
        `FORGE-S01 should not be flagged as ORPHAN_EVENT_DIR. Got: ${combined}`
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('reserved prefix SYS-init dir is NOT flagged', () => {
    const tmpDir = makeOrphanStore();
    try {
      const r = spawnSync(process.execPath, [VALIDATE_STORE], {
        cwd: tmpDir, encoding: 'utf8',
      });
      const combined = r.stdout + r.stderr;
      assert.ok(
        !combined.includes('SYS-init'),
        `SYS-init should not be flagged. Got: ${combined}`
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('virtual sprint dir "bugs" is NOT flagged', () => {
    // The fix-bug workflow emits phase events under .forge/store/events/bugs/.
    // validate-store must treat it as a reserved virtual sprint dir, matching
    // the spec at meta/tool-specs/validate-store.spec.md §"event.sprintId".
    const tmpDir = makeOrphanStore();
    try {
      const r = spawnSync(process.execPath, [VALIDATE_STORE], {
        cwd: tmpDir, encoding: 'utf8',
      });
      const combined = r.stdout + r.stderr;
      assert.ok(
        !combined.match(/\bbugs\b[^\n]*ORPHAN_EVENT_DIR/),
        `"bugs" should not be flagged as ORPHAN_EVENT_DIR. Got: ${combined}`
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('--json mode includes ORPHAN_EVENT_DIR warning with id=S01', () => {
    const tmpDir = makeOrphanStore();
    try {
      const r = spawnSync(process.execPath, [VALIDATE_STORE, '--json'], {
        cwd: tmpDir, encoding: 'utf8',
      });
      let result;
      try { result = JSON.parse(r.stdout); } catch (e) {
        assert.fail(`--json output must be valid JSON. stdout: ${r.stdout}, stderr: ${r.stderr}`);
      }
      const orphanWarnings = (result.warnings || []).filter(w => w.category === 'ORPHAN_EVENT_DIR');
      assert.ok(orphanWarnings.length > 0, `warnings should contain at least one ORPHAN_EVENT_DIR entry. Got: ${JSON.stringify(result.warnings)}`);
      const s01Warning = orphanWarnings.find(w => w.id === 'S01');
      assert.ok(s01Warning, `ORPHAN_EVENT_DIR warning should have id "S01". Got warnings: ${JSON.stringify(orphanWarnings)}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});