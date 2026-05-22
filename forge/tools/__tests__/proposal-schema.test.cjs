'use strict';
// FORGE-S24-T02 — Phase 2 proposal op classification (Sprint S24).
//
// Iron Law 2: this test is written BEFORE proposal.schema.json lands.
//
// Contract under test:
//   - Each enhancement-proposal record carries:
//       op          ∈ {insert_skill, update_skill, delete_skill}
//       target_path  — non-empty string
//       diff_body    — string (may be empty for delete_skill)
//   - Unknown / missing op → reject (AC5).
//   - Back-compat: legacy records without op are normalised to
//     {op: "insert_skill"} on read by the proposal-normalize helper.
//
// Cases:
//   1. Each of the three ops validates when paired with target_path + diff_body.
//   2. Missing `op` is rejected.
//   3. Unknown `op` ("rename_skill") is rejected.
//   4. Missing `target_path` is rejected.
//   5. Unknown top-level field is rejected (additionalProperties:false).
//   6. Legacy proposal (no `op` field) normalises to op: "insert_skill".

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SCHEMA_PATH = path.join(__dirname, '..', '..', 'schemas', 'proposal.schema.json');

// Minimal Draft-2020 JSON-Schema subset validator scoped to this schema's
// needs (object, required, enum, type, additionalProperties, minLength).
// Returns an array of error strings; empty array == valid.
function validate(schema, instance, pathParts = []) {
  const errors = [];
  if (schema.type === 'object') {
    if (typeof instance !== 'object' || instance === null || Array.isArray(instance)) {
      errors.push(`${pathParts.join('.') || '<root>'}: expected object`);
      return errors;
    }
    const props = schema.properties || {};
    for (const req of schema.required || []) {
      if (!(req in instance)) {
        errors.push(`missing required: ${req}`);
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(instance)) {
        if (!(key in props)) errors.push(`unknown property: ${key}`);
      }
    }
    for (const [key, sub] of Object.entries(props)) {
      if (key in instance) {
        errors.push(...validate(sub, instance[key], [...pathParts, key]));
      }
    }
  } else if (schema.type === 'string') {
    if (typeof instance !== 'string') {
      errors.push(`${pathParts.join('.')}: expected string`);
    } else if (schema.minLength !== undefined && instance.length < schema.minLength) {
      errors.push(`${pathParts.join('.')}: minLength ${schema.minLength}`);
    } else if (schema.enum && !schema.enum.includes(instance)) {
      errors.push(`${pathParts.join('.')}: not in enum`);
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(instance)) {
      errors.push(`${pathParts.join('.')}: expected array`);
    } else if (schema.items) {
      instance.forEach((item, i) =>
        errors.push(...validate(schema.items, item, [...pathParts, String(i)])),
      );
    }
  }
  return errors;
}

function baseProposal(overrides = {}) {
  return {
    op:          'insert_skill',
    target_path: 'forge/personas/engineer.md',
    diff_body:   '+ added line\n',
    ...overrides,
  };
}

describe('FORGE-S24-T02 — proposal.schema.json op classification', () => {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));

  test('1. insert_skill / update_skill / delete_skill all validate', () => {
    for (const op of ['insert_skill', 'update_skill', 'delete_skill']) {
      const errs = validate(schema, baseProposal({ op }));
      assert.deepEqual(errs, [], `expected no errors for op=${op}, got ${errs.join('; ')}`);
    }
  });

  test('2. missing op is rejected', () => {
    const p = baseProposal();
    delete p.op;
    const errs = validate(schema, p);
    assert.ok(errs.some((e) => e === 'missing required: op'),
      `expected missing-required error for op, got ${errs.join('; ')}`);
  });

  test('3. unknown op value is rejected', () => {
    const errs = validate(schema, baseProposal({ op: 'rename_skill' }));
    assert.ok(errs.some((e) => e.includes('op') && e.includes('enum')),
      `expected enum rejection for unknown op, got ${errs.join('; ')}`);
  });

  test('4. missing target_path is rejected', () => {
    const p = baseProposal();
    delete p.target_path;
    const errs = validate(schema, p);
    assert.ok(errs.some((e) => e === 'missing required: target_path'),
      `expected missing-required for target_path, got ${errs.join('; ')}`);
  });

  test('5. unknown top-level field is rejected', () => {
    const errs = validate(schema, baseProposal({ junk_field: true }));
    assert.ok(errs.some((e) => e.includes('unknown property')),
      `expected additionalProperties:false rejection, got ${errs.join('; ')}`);
  });

  test('6. legacy proposal (no op) normalises to insert_skill via normaliseProposal()', () => {
    // The normaliser lives alongside the schema as a helper consumed by Phase 2.
    const { normaliseProposal } = require('../proposal-normalize.cjs');
    const legacy = { target_path: 'forge/skills/engineer-skills.md', diff_body: 'patch' };
    const normalised = normaliseProposal(legacy);
    assert.equal(normalised.op, 'insert_skill', 'legacy proposal must default to insert_skill');
    assert.equal(normalised.target_path, legacy.target_path);
    assert.equal(normalised.diff_body, legacy.diff_body);

    // A proposal already carrying op must pass through unchanged.
    const explicit = baseProposal({ op: 'delete_skill' });
    const passThrough = normaliseProposal(explicit);
    assert.equal(passThrough.op, 'delete_skill');
  });
});
