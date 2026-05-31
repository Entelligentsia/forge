'use strict';
// Structural invariant test: every atomic phase workflow file must invoke
// preflight-gate.cjs before producing its artifact. A new phase workflow added
// later cannot silently skip the guard — this test will fail loudly.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WORKFLOWS_DIR = path.resolve(__dirname, '..', '..', 'meta', 'workflows');

// Phase workflow files (atomic, invoked by the orchestrator or directly by a
// user-level /command). Keyed by filename → expected phase name passed to
// preflight-gate.cjs.
const PHASE_WORKFLOWS = {
  'meta-plan-task.md':             'plan',
  'meta-implement.md':             'implement',
  'meta-review-plan.md':           'review-plan',
  'meta-review-implementation.md': 'review-code',
  'meta-approve.md':               'approve',
  'meta-commit.md':                'commit',
  'meta-validate.md':              'validate',
};

describe('phase-workflow-guards :: preflight invocation invariant', () => {
  for (const [file, phase] of Object.entries(PHASE_WORKFLOWS)) {
    test(`${file} invokes preflight-gate.cjs with --phase ${phase}`, () => {
      const p = path.join(WORKFLOWS_DIR, file);
      assert.ok(fs.existsSync(p), `expected workflow file at ${p}`);
      const contents = fs.readFileSync(p, 'utf8');

      assert.match(
        contents,
        /preflight-gate\.cjs/,
        `${file} does not invoke preflight-gate.cjs — safety net missing`,
      );
      const phaseFlagRegex = new RegExp(`--phase\\s+${phase}\\b`);
      assert.match(
        contents,
        phaseFlagRegex,
        `${file} invokes preflight-gate but not with "--phase ${phase}"`,
      );
    });
  }

  test('meta-orchestrate.md invokes preflight-gate before every subagent spawn', () => {
    const p = path.join(WORKFLOWS_DIR, 'meta-orchestrate.md');
    const contents = fs.readFileSync(p, 'utf8');
    assert.match(contents, /preflight-gate\.cjs/);
    // Verdicts are read from the store via read-verdict.cjs (the former
    // parse-verdict.cjs markdown reader was removed; issue #111 Phase 2).
    assert.match(contents, /read-verdict\.cjs/);
  });

  test('meta-fix-bug.md invokes preflight-gate before every subagent spawn', () => {
    const p = path.join(WORKFLOWS_DIR, 'meta-fix-bug.md');
    const contents = fs.readFileSync(p, 'utf8');
    assert.match(contents, /preflight-gate\.cjs/);
  });
});

describe('review-loop-context :: iteration context marker present in review workflows', () => {
  // AC #7: each review workflow (and the orchestrator) must contain the Review Loop Context
  // marker so orchestrated runs can surface iteration N of M to the reviewer.
  const REVIEW_WORKFLOWS = [
    'meta-review-plan.md',
    'meta-review-implementation.md',
    'meta-validate.md',
  ];

  for (const file of REVIEW_WORKFLOWS) {
    test(`${file} contains Review Loop Context step`, () => {
      const p = path.join(WORKFLOWS_DIR, file);
      assert.ok(fs.existsSync(p), `expected workflow file at ${p}`);
      const contents = fs.readFileSync(p, 'utf8');
      assert.match(
        contents,
        /Review Loop Context/,
        `${file} is missing the "Review Loop Context" marker — AC-7 violation`,
      );
    });
  }

  test('meta-orchestrate.md injects review_loop_context block for review-role phases', () => {
    const p = path.join(WORKFLOWS_DIR, 'meta-orchestrate.md');
    const contents = fs.readFileSync(p, 'utf8');
    assert.match(
      contents,
      /review_loop_context/,
      'meta-orchestrate.md is missing the review_loop_context injection — AC-3 violation',
    );
    assert.match(
      contents,
      /Review Loop Context/,
      'meta-orchestrate.md is missing the "### Review Loop Context" block template — AC-3 violation',
    );
  });
});

describe('pipeline-step-guard :: user-visible guard block present', () => {
  // AC #1: each workflow must contain the canonical error message template
  // AC #2: each workflow must mention the --force bypass
  for (const file of Object.keys(PHASE_WORKFLOWS)) {
    test(`${file} contains AC #1 error message template`, () => {
      const p = path.join(WORKFLOWS_DIR, file);
      assert.ok(fs.existsSync(p), `expected workflow file at ${p}`);
      const contents = fs.readFileSync(p, 'utf8');

      assert.match(
        contents,
        /is in state/,
        `${file} is missing the pipeline-step guard error message ("is in state")`,
      );
      assert.match(
        contents,
        /must complete first/,
        `${file} is missing the pipeline-step guard error message ("must complete first")`,
      );
    });

    test(`${file} mentions --force bypass`, () => {
      const p = path.join(WORKFLOWS_DIR, file);
      const contents = fs.readFileSync(p, 'utf8');

      assert.match(
        contents,
        /--force/,
        `${file} is missing the --force bypass mention in the pipeline-step guard`,
      );
    });
  }
});
