'use strict';

// orchestrators-retired.test.cjs — retirement guard for FORGE-S28-T08
//
// Asserts that each of the three prose orchestrator files has been downgraded
// from a runtime workflow to a parity spec by verifying the presence of the
// "PARITY SPEC" sentinel string in each file.
//
// Contract:
//   - Before Phase 2 preamble insertion: all three tests FAIL (sentinel absent).
//   - After Phase 2 preamble insertion: all three tests PASS.
//   - After forge:rebuild: generated .forge/workflows/ copies also carry the
//     sentinel (verified separately via substitute-placeholders propagation).
//   - The drift guard (workflows-js-drift.test.cjs) continues to cover wfl-fix-bug.js
//     in JS_WORKFLOWS — this test asserts that invariant remains in force.
//
// Files covered:
//   forge/forge/init/base-pack/workflows/orchestrate_task.md
//   forge/forge/init/base-pack/workflows/run_sprint.md
//   forge/forge/init/base-pack/workflows/fix_bug.md

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Base-pack workflows directory
const BASE_PACK_WORKFLOWS = path.join(
  __dirname, '..', '..', 'init', 'base-pack', 'workflows'
);

// The three prose orchestrator files that must carry the PARITY SPEC preamble
const PROSE_ORCHESTRATORS = [
  'orchestrate_task.md',
  'run_sprint.md',
  'fix_bug.md',
];

// Sentinel string that proves the file has been downgraded to a parity spec
const PARITY_SPEC_SENTINEL = 'PARITY SPEC';

// Expected audience frontmatter value after retirement
const SPEC_ONLY_AUDIENCE = 'audience: spec-only';

// ---- Helper ----

function readFile(filePath) {
  assert.ok(
    fs.existsSync(filePath),
    `Expected file to exist: ${filePath}`
  );
  return fs.readFileSync(filePath, 'utf8');
}

// ---- Tests ----

describe('orchestrators-retired — PARITY SPEC sentinel guard', () => {
  for (const filename of PROSE_ORCHESTRATORS) {
    const filePath = path.join(BASE_PACK_WORKFLOWS, filename);

    it(`${filename} contains the PARITY SPEC sentinel`, () => {
      const content = readFile(filePath);
      assert.ok(
        content.includes(PARITY_SPEC_SENTINEL),
        `Expected "${PARITY_SPEC_SENTINEL}" sentinel in ${filename} — file has not been downgraded to parity spec yet`
      );
    });

    it(`${filename} has audience: spec-only in YAML frontmatter`, () => {
      const content = readFile(filePath);
      assert.ok(
        content.includes(SPEC_ONLY_AUDIENCE),
        `Expected "${SPEC_ONLY_AUDIENCE}" in YAML frontmatter of ${filename} — audience field not yet updated from orchestrator-only`
      );
    });
  }
});

describe('orchestrators-retired — JS_WORKFLOWS coverage guard', () => {
  it('workflows-js-drift.test.cjs includes wfl-fix-bug.js in JS_WORKFLOWS', () => {
    const driftTestPath = path.join(__dirname, 'workflows-js-drift.test.cjs');
    const content = readFile(driftTestPath);
    assert.ok(
      content.includes("'wfl-fix-bug.js'"),
      "Expected 'wfl-fix-bug.js' to be listed in JS_WORKFLOWS in workflows-js-drift.test.cjs"
    );
  });
});
