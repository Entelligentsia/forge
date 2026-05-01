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

describe('base-pack-byte-budget — phase files within byte budget', () => {
  for (const file of PHASE_FILES) {
    it(`${file} ≤ ${BYTE_BUDGET} bytes`, () => {
      const filePath = path.join(BASE_PACK, file);
      const size = fs.statSync(filePath).size;
      assert.ok(
        size <= BYTE_BUDGET,
        `${file} is ${size} bytes, exceeds ${BYTE_BUDGET}B budget`
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
