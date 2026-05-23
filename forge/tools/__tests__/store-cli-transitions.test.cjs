'use strict';

// Regression tests for store-cli.cjs transition table canonicalization (FORGE-S25-T26).
// These tests verify the T25 ADR canonical tables are enforced.
// Each test is named with the decision ID (D-T-*, D-S-*, D-B-*) it validates.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { isLegalTransition } = require(path.join(__dirname, '..', 'store-cli.cjs'));

describe('store-cli.cjs — canonical transition regression tests (FORGE-S25-T26)', () => {

  // ── task.status ───────────────────────────────────────────────────────────

  test('D-T-1: task.draft → plan-revision-required is REJECTED (was allowed before T26)', () => {
    // Before T26 canonical adoption, draft allowed revision states.
    // T25 ADR D-T-1: draft does not allow plan-revision-required.
    assert.equal(
      isLegalTransition('task', 'status', 'draft', 'plan-revision-required'),
      false,
      'draft → plan-revision-required must be rejected (D-T-1)',
    );
  });

  test('D-T-2: task.planned → implemented is REJECTED (was allowed before T26)', () => {
    // Before T26: planned allowed implemented (skipping plan-approval gate).
    // T25 ADR D-T-2: planned does not allow implemented.
    assert.equal(
      isLegalTransition('task', 'status', 'planned', 'implemented'),
      false,
      'planned → implemented must be rejected (D-T-2)',
    );
  });

  test('D-T-9: task.committed → blocked is REJECTED (was allowed via FAILED_STATES bypass)', () => {
    // Before T26: blocked was in FAILED_STATES, allowing committed → blocked.
    // T25 ADR D-T-9: committed is terminal — no transitions out.
    assert.equal(
      isLegalTransition('task', 'status', 'committed', 'blocked'),
      false,
      'committed → blocked must be rejected (terminal state, D-T-9)',
    );
  });

  test('D-T-9: task.committed → abandoned is REJECTED (terminal state)', () => {
    assert.equal(
      isLegalTransition('task', 'status', 'committed', 'abandoned'),
      false,
      'committed → abandoned must be rejected (terminal state)',
    );
  });

  // ── sprint.status ─────────────────────────────────────────────────────────

  test('D-S-1: sprint.planning → blocked is ALLOWED (canonical)', () => {
    // Before T26: plugin did not have planning → blocked.
    // T25 ADR D-S-1: planning allows blocked.
    assert.equal(
      isLegalTransition('sprint', 'status', 'planning', 'blocked'),
      true,
      'planning → blocked must be allowed (D-S-1)',
    );
  });

  test('D-S-2: sprint.completed → blocked is REJECTED (was allowed before T26)', () => {
    // Before T26: plugin allowed completed → blocked.
    // T25 ADR D-S-2: completed allows ONLY retrospective-done.
    assert.equal(
      isLegalTransition('sprint', 'status', 'completed', 'blocked'),
      false,
      'completed → blocked must be rejected (D-S-2)',
    );
  });

  test('D-S-4: sprint.blocked → active is ALLOWED for recovery (canonical)', () => {
    // Before T26: plugin had no recovery from sprint.blocked.
    // T25 ADR D-S-4: blocked allows active (resume) and abandoned.
    assert.equal(
      isLegalTransition('sprint', 'status', 'blocked', 'active'),
      true,
      'sprint.blocked → active must be allowed for recovery (D-S-4)',
    );
  });

  // ── bug.status ────────────────────────────────────────────────────────────

  test('D-B-1: bug.in-progress → abandoned is ALLOWED (was rejected before T26)', () => {
    // Before T26: plugin only allowed in-progress → fixed.
    // T25 ADR D-B-1: all non-terminal bug states allow abandoned.
    assert.equal(
      isLegalTransition('bug', 'status', 'in-progress', 'abandoned'),
      true,
      'bug.in-progress → abandoned must be allowed (D-B-1)',
    );
  });

  test('R-1: bug.in-progress → blocked is REJECTED (bug→blocked not in T25 ADR)', () => {
    // Verified by plan review R-1: blocked is removed from FAILED_STATES;
    // BUG_TRANSITIONS has no blocked entry; therefore bug→blocked must be false.
    assert.equal(
      isLegalTransition('bug', 'status', 'in-progress', 'blocked'),
      false,
      'bug.in-progress → blocked must be rejected (not in T25 ADR)',
    );
  });
});
