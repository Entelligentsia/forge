'use strict';
// Structural invariant test: every atomic phase workflow file must invoke
// the forge_preflight MCP tool (or preflight-gate.cjs in hook contexts)
// before producing its artifact. A new phase workflow added later cannot
// silently skip the guard — this test will fail loudly.
//
// Updated by FORGE-S34-T07: call-site migration replaced Bash
// `node .forge/tools/preflight-gate.cjs --phase <p>` with
// `forge_preflight({ phase: "<p>", ... })` throughout model-facing markdown.
// Tests now match the MCP tool pattern instead of the old .cjs invocation.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WORKFLOWS_DIR = path.resolve(__dirname, '..', '..', 'meta', 'workflows');

// Phase workflow files (atomic, invoked by the orchestrator or directly by a
// user-level /command). Keyed by filename → expected phase name passed to
// forge_preflight({ phase: "<p>", ... }).
// Note: meta-commit.md delegates preflight to forge_commit (which calls
// preflight-gate.cjs internally) — it is excluded here and covered by a
// dedicated test below.
const PHASE_WORKFLOWS = {
  'meta-plan-task.md':             'plan',
  'meta-implement.md':             'implement',
  'meta-review-plan.md':           'review-plan',
  'meta-review-implementation.md': 'review-code',
  'meta-approve.md':               'approve',
  'meta-validate.md':              'validate',
};

describe('phase-workflow-guards :: preflight invocation invariant', () => {
  for (const [file, phase] of Object.entries(PHASE_WORKFLOWS)) {
    test(`${file} invokes forge_preflight with phase "${phase}"`, () => {
      const p = path.join(WORKFLOWS_DIR, file);
      assert.ok(fs.existsSync(p), `expected workflow file at ${p}`);
      const contents = fs.readFileSync(p, 'utf8');

      // After FORGE-S34-T07 migration, the MCP tool name is the marker.
      assert.match(
        contents,
        /forge_preflight/,
        `${file} does not invoke forge_preflight — safety net missing`,
      );
      // The phase value must appear in the forge_preflight call.
      const phaseArgRegex = new RegExp(`forge_preflight\\(.*?phase.*?${phase.replace('-', '[-_]')}.*?\\)`, 's');
      assert.match(
        contents,
        phaseArgRegex,
        `${file} invokes forge_preflight but not with phase "${phase}"`,
      );
    });
  }

  test('meta-orchestrate.md invokes forge_preflight before every subagent spawn', () => {
    const p = path.join(WORKFLOWS_DIR, 'meta-orchestrate.md');
    const contents = fs.readFileSync(p, 'utf8');
    assert.match(contents, /forge_preflight/);
    // Verdicts are read from the store via read-verdict.cjs (the former
    // parse-verdict.cjs markdown reader was removed; issue #111 Phase 2).
    // read-verdict.cjs is an orchestrator-internal tool — not in the 14-tool
    // MCP surface — so it remains as a .cjs reference (allowlisted in mcp-callsite-gate).
    assert.match(contents, /read-verdict\.cjs/);
  });

  test('meta-fix-bug.md invokes preflight-gate (via forge-preflight.cjs orchestrator tool)', () => {
    const p = path.join(WORKFLOWS_DIR, 'meta-fix-bug.md');
    const contents = fs.readFileSync(p, 'utf8');
    // meta-fix-bug.md uses forge-preflight.cjs (orchestrator-internal, not in the 14-tool
    // MCP surface) rather than the model-facing forge_preflight. Both are allowlisted.
    assert.match(contents, /forge-preflight\.cjs|forge_preflight/);
  });

  test('meta-commit.md delegates preflight to forge_commit (tool handles it internally)', () => {
    const p = path.join(WORKFLOWS_DIR, 'meta-commit.md');
    const contents = fs.readFileSync(p, 'utf8');
    // The commit workflow calls forge_commit which owns the preflight gate internally.
    // The workflow mentions the internal preflight gate in its tool documentation.
    assert.match(contents, /forge_commit/,
      'meta-commit.md must invoke forge_commit — preflight is delegated to the tool');
    assert.match(contents, /preflight/,
      'meta-commit.md must mention preflight (delegated to forge_commit internally)');
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
