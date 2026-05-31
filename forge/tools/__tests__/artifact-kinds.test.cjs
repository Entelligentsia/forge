'use strict';

// Tests for tools/lib/artifact-kinds.cjs — the canonical artifact-kind registry
// extracted per ADR artifact-resolution-abstraction.md (Phase 1). This is the
// single source of truth for artifact filenames, bug-mode overrides, and the
// phase→kind mapping used by set-summary / set-bug-summary self-resolution.

const { test } = require('node:test');
const assert = require('node:assert');

const kinds = require('../lib/artifact-kinds.cjs');

test('exports the canonical catalog and helpers', () => {
  assert.ok(kinds.ARTIFACT_CATALOG, 'ARTIFACT_CATALOG present');
  assert.ok(Array.isArray(kinds.ARTIFACT_NAMES), 'ARTIFACT_NAMES is an array');
  assert.strictEqual(typeof kinds.resolveArtifactFilename, 'function');
  assert.strictEqual(typeof kinds.resolveSummaryFilename, 'function');
  assert.ok(kinds.PHASE_TO_KIND, 'PHASE_TO_KIND present');
});

test('catalog maps known kinds to filenames', () => {
  assert.strictEqual(kinds.ARTIFACT_CATALOG['plan'].filename, 'PLAN.md');
  assert.strictEqual(kinds.ARTIFACT_CATALOG['implementation-summary'].filename, 'IMPLEMENTATION-SUMMARY.json');
});

test('resolveArtifactFilename honours bug-mode overrides', () => {
  assert.strictEqual(kinds.resolveArtifactFilename('task', 'plan'), 'PLAN.md');
  assert.strictEqual(kinds.resolveArtifactFilename('bug', 'plan'), 'BUG_FIX_PLAN.md');
  assert.strictEqual(kinds.resolveArtifactFilename('bug', 'plan-summary'), 'BUG-FIX-PLAN-SUMMARY.json');
  // Non-overridden kinds fall through to the catalog for both entities.
  assert.strictEqual(kinds.resolveArtifactFilename('bug', 'validation-summary'), 'VALIDATION-SUMMARY.json');
});

test('PHASE_TO_KIND covers every valid summary phase', () => {
  // Mirror of store-helpers VALID_SUMMARY_PHASES (underscore spellings).
  const phases = ['plan', 'review_plan', 'implementation', 'code_review', 'validation', 'triage', 'approve'];
  for (const p of phases) {
    assert.ok(kinds.PHASE_TO_KIND[p], `phase "${p}" maps to a kind`);
    assert.ok(kinds.ARTIFACT_CATALOG[kinds.PHASE_TO_KIND[p]], `kind for "${p}" is in catalog`);
  }
});

test('resolveSummaryFilename derives the sidecar filename per entity', () => {
  // Task phase summaries
  assert.strictEqual(kinds.resolveSummaryFilename('task', 'plan'), 'PLAN-SUMMARY.json');
  assert.strictEqual(kinds.resolveSummaryFilename('task', 'implementation'), 'IMPLEMENTATION-SUMMARY.json');
  assert.strictEqual(kinds.resolveSummaryFilename('task', 'validation'), 'VALIDATION-SUMMARY.json');
  assert.strictEqual(kinds.resolveSummaryFilename('task', 'approve'), 'APPROVE-SUMMARY.json');
  assert.strictEqual(kinds.resolveSummaryFilename('task', 'review_plan'), 'REVIEW-PLAN-SUMMARY.json');
  assert.strictEqual(kinds.resolveSummaryFilename('task', 'code_review'), 'REVIEW-CODE-SUMMARY.json');
  assert.strictEqual(kinds.resolveSummaryFilename('task', 'triage'), 'TRIAGE-SUMMARY.json');
  // Bug-mode plan summary uses the BUG-FIX prefix override.
  assert.strictEqual(kinds.resolveSummaryFilename('bug', 'plan'), 'BUG-FIX-PLAN-SUMMARY.json');
  assert.strictEqual(kinds.resolveSummaryFilename('bug', 'triage'), 'TRIAGE-SUMMARY.json');
});

test('resolveSummaryFilename rejects unknown phases', () => {
  assert.throws(() => kinds.resolveSummaryFilename('task', 'bogus'), /unknown phase/i);
});
