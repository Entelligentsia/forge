'use strict';
// base-pack-byte-budget.test.cjs
// Verifies that base-pack phase workflow files stay within byte budgets and
// do not contain the five forbidden strings. Orchestrator-only files
// (orchestrate_task.md, fix_bug.md) are exempt from the byte budget but must
// carry audience: orchestrator-only.

const assert = require('assert');
const { describe, it } = require('node:test');
const fs   = require('fs');
const path = require('path');

const BASE_PACK = path.join(__dirname, '..', '..', 'init', 'base-pack', 'workflows');

// Phase files (subagent-targeted) must be ≤4kB and have no forbidden strings.
const PHASE_FILES = [
  'plan_task.md',
  'implement_plan.md',
  'review_plan.md',
  'review_code.md',
  'validate_task.md',
  'architect_approve.md',
  'commit_task.md',
  'update_plan.md',
  'update_implementation.md',
];

// Orchestrator-only files: no byte budget, but must carry audience: orchestrator-only.
const ORCHESTRATOR_FILES = [
  'orchestrate_task.md',
  'fix_bug.md',
];

const FORBIDDEN_STRINGS = [
  'MASTER_INDEX.md',
  'Read these only if',
];

const BYTE_BUDGET = 4096;
// Per-file budget overrides for phase workflows that legitimately need more space
// (e.g. carry the kickoff-shim materialization markers — Iron Laws +
// Store-Write Verification — required by forge-cli /forge:plan and /forge:implement).
const BYTE_BUDGET_OVERRIDES = {
  'plan_task.md':      5120,
  'implement_plan.md': 5120,
  'review_plan.md':    5120,
  'review_code.md':    5120,
};

describe('base-pack-byte-budget — phase files within byte budget', () => {
  for (const file of PHASE_FILES) {
    const budget = BYTE_BUDGET_OVERRIDES[file] ?? BYTE_BUDGET;
    it(`${file} ≤ ${budget} bytes`, () => {
      const filePath = path.join(BASE_PACK, file);
      const size = fs.statSync(filePath).size;
      assert.ok(
        size <= budget,
        `${file} is ${size} bytes, exceeds ${budget}B budget`
      );
    });
  }
});

describe('base-pack-byte-budget — phase files have audience: subagent', () => {
  for (const file of PHASE_FILES) {
    it(`${file} has audience: subagent`, () => {
      const filePath = path.join(BASE_PACK, file);
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(
        content.includes('audience: subagent'),
        `${file} missing "audience: subagent" in frontmatter`
      );
    });
  }
});

describe('base-pack-byte-budget — phase files have context: block', () => {
  const REQUIRED_CONTEXT_KEYS = [
    'architecture:',
    'prior_summaries:',
    'persona:',
    'master_index:',
    'diff_mode:',
  ];
  for (const file of PHASE_FILES) {
    it(`${file} has all required context keys`, () => {
      const filePath = path.join(BASE_PACK, file);
      const content = fs.readFileSync(filePath, 'utf8');
      for (const key of REQUIRED_CONTEXT_KEYS) {
        assert.ok(
          content.includes(key),
          `${file} missing context key "${key}"`
        );
      }
    });
  }
});

describe('base-pack-byte-budget — forbidden strings absent from phase files', () => {
  for (const file of PHASE_FILES) {
    for (const forbidden of FORBIDDEN_STRINGS) {
      it(`${file} does not contain "${forbidden}"`, () => {
        const filePath = path.join(BASE_PACK, file);
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
          !content.includes(forbidden),
          `${file} contains forbidden string: "${forbidden}"`
        );
      });
    }
  }
});

// Kickoff-shim regression lint.
// forge-cli's runForgeSubagent kickoff shim requires every subagent-targeted
// phase workflow to carry four anchor markers. Without them, /forge:run-task
// halts mid-pipeline with "workflow regression: <marker> not found in …".
//
// Symptom this lint prevents: phase N completes successfully, phase N+1
// halts because its workflow file silently shipped without one of the markers.
// Observed live for review_plan.md (forge#85) and again for validate_task.md
// during the FORGE-S21 smoke test. Encode it once, never re-discover.
describe('base-pack-byte-budget — phase files carry kickoff-shim markers', () => {
  const REQUIRED_MARKERS = [
    'Iron Laws',
    'Store-Write Verification',
    'forge_store',
    '.forge/personas/',
  ];
  for (const file of PHASE_FILES) {
    it(`${file} contains all 4 kickoff-shim markers`, () => {
      const filePath = path.join(BASE_PACK, file);
      const content = fs.readFileSync(filePath, 'utf8');
      for (const marker of REQUIRED_MARKERS) {
        assert.ok(
          content.includes(marker),
          `${file} missing kickoff-shim marker: "${marker}"`
        );
      }
    });
  }
});

// Verdict-format documentary lint (no longer load-bearing).
//
// Since 0.43.10 the preflight gate reads structured verdicts from
// store.task.summaries.<canonical>.verdict (and task.status for approve)
// via read-verdict.cjs. The markdown `**Verdict:**` line is a human
// breadcrumb only — useful for operators eyeballing review artifacts,
// not consulted by any code path.
//
// We keep this lint because the meta workflows still instruct subagents
// to emit the line for human readers; the lint guarantees that
// instruction survives generation. If a future redesign drops markdown
// review artifacts entirely, delete this block.
describe('base-pack-byte-budget — verdict-emitting phase files instruct canonical Verdict line (human-readable)', () => {
  const VERDICT_PHASE_FILES = [
    'review_plan.md',
    'review_code.md',
    'validate_task.md',
    'architect_approve.md',
  ];
  for (const file of VERDICT_PHASE_FILES) {
    it(`${file} contains literal "**Verdict:**" instruction`, () => {
      const filePath = path.join(BASE_PACK, file);
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(
        content.includes('**Verdict:**'),
        `${file} must instruct subagent to emit a literal "**Verdict:**" line — ` +
        `downstream preflight gates parse only this exact form.`
      );
    });
  }
});

describe('base-pack-byte-budget — orchestrator files carry audience: orchestrator-only', () => {
  for (const file of ORCHESTRATOR_FILES) {
    it(`${file} has audience: orchestrator-only`, () => {
      const filePath = path.join(BASE_PACK, file);
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(
        content.includes('audience: orchestrator-only'),
        `${file} missing "audience: orchestrator-only" in frontmatter`
      );
    });
  }
});
