'use strict';

// wfl-run-task-verdict.test.cjs — regression guard for FORGE-S28-T02
//
// Asserts structural invariants in wfl-run-task.js without executing the
// workflow (string-invariant tests on the prompt template):
//
//   1. No exit-code mapping in the review-phase subagent prompt.
//   2. STDOUT token routing present in the review-phase subagent prompt.
//   3. Token vocabulary (approved|revision|n/a|unknown) present in the review-phase prompt.
//   4. n/a and unknown map to 'malformed' in the review-phase prompt.
//   5. Start event instruction (action="start") present in the runPhase prompt.
//   6. durationMinutes bracketing present in the runPhase prompt.
//   7. Deviation comment describes split start/complete emit contract.
//   8. Syntax check: node --check passes on the source file.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const SRC = path.resolve(
  __dirname, '..', '..', 'init', 'base-pack', 'workflows-js', 'wfl-run-task.js'
);

describe('wfl-run-task-verdict — Gap #1: STDOUT token routing (not exit code)', () => {
  let src;
  it('source file exists', () => {
    assert.ok(fs.existsSync(SRC), `Source not found: ${SRC}`);
    src = fs.readFileSync(SRC, 'utf8');
  });

  it('AC #1: review-phase prompt does NOT contain "Map exit code"', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(
      !src.includes('Map exit code'),
      'Found "Map exit code" in source — the exit-code mapping must be replaced with STDOUT token routing.'
    );
  });

  it('AC #1: review-phase prompt contains STDOUT token routing reference', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const hasStdout = src.includes('stdout') || src.includes('STDOUT');
    assert.ok(
      hasStdout,
      'No "stdout"/"STDOUT" reference found — the prompt must instruct the subagent to use the STDOUT token.'
    );
  });

  it('AC #1: token vocabulary present (approved, revision, n/a, unknown)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(src.includes('approved'), 'Token "approved" not found in source.');
    assert.ok(src.includes('revision'), 'Token "revision" not found in source.');
    assert.ok(src.includes('n/a'), 'Token "n/a" not found in source.');
    assert.ok(src.includes('unknown'), 'Token "unknown" not found in source.');
  });

  it('AC #2: n/a maps to malformed in the review-phase prompt', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    // Both 'n/a' and 'malformed' must appear in the review-branch string context.
    // We verify they co-appear in the review-phase prompt string region.
    const reviewBranchStart = src.indexOf('READ VERDICT');
    assert.ok(reviewBranchStart !== -1, '"READ VERDICT" marker not found — review-phase branch missing.');
    const reviewBranchSrc = src.slice(reviewBranchStart, reviewBranchStart + 1000);
    assert.ok(
      reviewBranchSrc.includes('n/a'),
      'Token "n/a" not found in the READ VERDICT branch.'
    );
    assert.ok(
      reviewBranchSrc.includes('malformed'),
      'Token "malformed" not found in the READ VERDICT branch — n/a must map to malformed.'
    );
  });

  it('AC #2: unknown maps to malformed in the review-phase prompt', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const reviewBranchStart = src.indexOf('READ VERDICT');
    assert.ok(reviewBranchStart !== -1, '"READ VERDICT" marker not found.');
    const reviewBranchSrc = src.slice(reviewBranchStart, reviewBranchStart + 1000);
    assert.ok(
      reviewBranchSrc.includes('unknown'),
      'Token "unknown" not found in the READ VERDICT branch — unknown must map to malformed.'
    );
  });
});

describe('wfl-run-task-verdict — Gap #2: start event + durationMinutes bracketing', () => {
  let src;

  it('AC #3: start event instruction present (action="start")', () => {
    src = fs.readFileSync(SRC, 'utf8');
    const hasStart = src.includes('action="start"') || src.includes("action='start'") || src.includes('action=\\"start\\"');
    assert.ok(
      hasStart,
      'No action="start" instruction found — the prompt must instruct the subagent to emit a start event.'
    );
  });

  it('AC #4: durationMinutes bracketing instruction present', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(
      src.includes('durationMinutes'),
      'No "durationMinutes" found — the prompt must instruct the subagent to compute and include durationMinutes.'
    );
  });
});

describe('wfl-run-task-verdict — AC #5: deviation note updated for start/complete split', () => {
  let src;

  it('deviation comment block describes split start/complete emit contract', () => {
    src = fs.readFileSync(SRC, 'utf8');
    const hasStartComplete = src.includes('start/complete') || src.includes('start event') || src.includes('split');
    assert.ok(
      hasStartComplete,
      'Deviation comment block does not mention the split start/complete emit contract.'
    );
  });
});

describe('wfl-run-task-verdict — AC #9: syntax check', () => {
  it('node --check passes on wfl-run-task.js', () => {
    try {
      execFileSync(process.execPath, ['--check', SRC], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) {
      assert.fail(`node --check failed:\n${err.stderr || err.message}`);
    }
  });
});
