'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { readVerdict, PHASE_VERDICT_SOURCE, ALLOWED_VERDICTS } = require('../read-verdict.cjs');

describe('read-verdict.cjs :: readVerdict()', () => {
  test('returns null when record is missing', () => {
    const r = readVerdict({ record: null, phase: 'review-plan' });
    assert.equal(r.verdict, null);
    assert.equal(r.source, 'no-record');
  });

  test('review-plan → reads summaries.review_plan.verdict', () => {
    const record = { summaries: { review_plan: { verdict: 'approved' } } };
    const r = readVerdict({ record, phase: 'review-plan' });
    assert.equal(r.verdict, 'approved');
    assert.equal(r.key, 'review_plan');
    assert.equal(r.source, 'summaries');
  });

  test('review-code → reads summaries.code_review.verdict (REVERSED key)', () => {
    // Canonical workflow key is "code_review", not "review_code".
    const record = { summaries: { code_review: { verdict: 'approved' } } };
    const r = readVerdict({ record, phase: 'review-code' });
    assert.equal(r.verdict, 'approved');
    assert.equal(r.key, 'code_review');
  });

  test('validate → reads summaries.validation.verdict', () => {
    const record = { summaries: { validation: { verdict: 'approved' } } };
    const r = readVerdict({ record, phase: 'validate' });
    assert.equal(r.verdict, 'approved');
    assert.equal(r.key, 'validation');
  });

  test('approve → reads task.status, NOT summaries', () => {
    const record = { status: 'approved', summaries: {} };
    const r = readVerdict({ record, phase: 'approve' });
    assert.equal(r.verdict, 'approved');
    assert.equal(r.source, 'task.status');
    assert.equal(r.key, null);
  });

  test('approve with status != approved → null', () => {
    const record = { status: 'implemented', summaries: { code_review: { verdict: 'approved' } } };
    const r = readVerdict({ record, phase: 'approve' });
    assert.equal(r.verdict, null);
  });

  test('revision verdict propagates through', () => {
    const record = { summaries: { code_review: { verdict: 'revision' } } };
    const r = readVerdict({ record, phase: 'review-code' });
    assert.equal(r.verdict, 'revision');
  });

  test('out-of-vocabulary verdict (e.g. "approve") yields null', () => {
    // Allowed values are strictly approved/revision/n/a. Anything else is
    // treated as missing so the gate halts loudly instead of guessing.
    const record = { summaries: { review_plan: { verdict: 'approve' } } };
    const r = readVerdict({ record, phase: 'review-plan' });
    assert.equal(r.verdict, null);
  });

  test('unknown phase falls back to underscore-swapped key', () => {
    const record = { summaries: { foo_bar: { verdict: 'approved' } } };
    const r = readVerdict({ record, phase: 'foo-bar' });
    assert.equal(r.verdict, 'approved');
  });

  test('missing summaries field → null, not crash', () => {
    const record = { status: 'planned' };
    const r = readVerdict({ record, phase: 'review-plan' });
    assert.equal(r.verdict, null);
  });

  test('PHASE_VERDICT_SOURCE map mirrors VALID_SUMMARY_PHASES contract', () => {
    // The canonical mapping plus the approve sentinel. Drift between this
    // file and store-cli.cjs's VALID_SUMMARY_PHASES is a contract violation.
    assert.equal(PHASE_VERDICT_SOURCE['review-plan'], 'review_plan');
    assert.equal(PHASE_VERDICT_SOURCE['review-code'], 'code_review');
    assert.equal(PHASE_VERDICT_SOURCE['validate'], 'validation');
    assert.equal(typeof PHASE_VERDICT_SOURCE['approve'], 'object'); // STATUS_SOURCE sentinel
  });

  test('ALLOWED_VERDICTS matches PHASE_SUMMARY_SCHEMA enum', () => {
    assert.deepEqual([...ALLOWED_VERDICTS].sort(), ['approved', 'n/a', 'revision']);
  });
});
