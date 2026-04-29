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
    assert.match(contents, /parse-verdict\.cjs/);
  });

  test('meta-fix-bug.md invokes preflight-gate before every subagent spawn', () => {
    const p = path.join(WORKFLOWS_DIR, 'meta-fix-bug.md');
    const contents = fs.readFileSync(p, 'utf8');
    assert.match(contents, /preflight-gate\.cjs/);
  });
});
