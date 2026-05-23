'use strict';
// CI gate: every *.schema.json in forge/schemas/ must have root additionalProperties:false.
// Added in FORGE-S25-T13 (closes Phase 4 guardrail from SPRINT_PLAN).
// structure-manifest.json is a generated inventory file (not a validation schema)
// and does not carry the *.schema.json extension — it is naturally excluded.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SCHEMAS_DIR = path.join(__dirname, '..', '..', 'schemas');

// Recursive walk collecting *.schema.json paths (relative to SCHEMAS_DIR).
function walkSchemas(dir, rel = '') {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryRel = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...walkSchemas(path.join(dir, entry.name), entryRel));
    } else if (entry.isFile() && entry.name.endsWith('.schema.json')) {
      results.push(entryRel);
    }
  }
  return results;
}

describe('schema-additionalProperties CI gate', () => {
  const schemaFiles = walkSchemas(SCHEMAS_DIR);

  test('at least one *.schema.json file exists to prevent silent no-op', () => {
    assert.ok(schemaFiles.length > 0, 'Expected at least one *.schema.json in schemas/');
  });

  for (const relPath of schemaFiles) {
    test(`${relPath} has root additionalProperties:false`, () => {
      const fullPath = path.join(SCHEMAS_DIR, relPath);
      const schema = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      assert.strictEqual(
        schema.additionalProperties,
        false,
        `${relPath}: root-level additionalProperties must be false (got ${JSON.stringify(schema.additionalProperties)})`
      );
    });
  }
});
