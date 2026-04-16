'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  lookupByModel,
  estimateTokens,
  TOKENS_PER_MINUTE,
  PRICE_PER_1M,
  PHASE_SPLIT,
  DEFAULT_TOKENS_PER_MINUTE,
  DEFAULT_PRICE_PER_1M,
} = require('../estimate-usage.cjs');

describe('estimate-usage.cjs', () => {
  describe('lookupByModel', () => {
    test('returns exact match value', () => {
      assert.equal(lookupByModel(TOKENS_PER_MINUTE, DEFAULT_TOKENS_PER_MINUTE, 'claude-opus-4'), 3000);
    });

    test('returns longest substring match', () => {
      // 'claude-opus-4' is a substring of 'claude-opus-4-20250514'
      assert.equal(lookupByModel(TOKENS_PER_MINUTE, DEFAULT_TOKENS_PER_MINUTE, 'claude-opus-4-20250514'), 3000);
    });

    test('returns default when no model matches', () => {
      assert.equal(lookupByModel(TOKENS_PER_MINUTE, DEFAULT_TOKENS_PER_MINUTE, 'gpt-4'), DEFAULT_TOKENS_PER_MINUTE);
    });

    test('returns default when model is null', () => {
      assert.equal(lookupByModel(TOKENS_PER_MINUTE, DEFAULT_TOKENS_PER_MINUTE, null), DEFAULT_TOKENS_PER_MINUTE);
    });

    test('returns default when model is undefined', () => {
      assert.equal(lookupByModel(TOKENS_PER_MINUTE, DEFAULT_TOKENS_PER_MINUTE, undefined), DEFAULT_TOKENS_PER_MINUTE);
    });

    test('is case-insensitive', () => {
      assert.equal(lookupByModel(TOKENS_PER_MINUTE, DEFAULT_TOKENS_PER_MINUTE, 'Claude-Opus-4'), 3000);
    });
  });

  describe('estimateTokens', () => {
    test('returns token estimates for known model', () => {
      const event = { eventId: 'E-001', durationMinutes: 5, model: 'claude-sonnet-4', phase: 'implement' };
      const result = estimateTokens(event);
      assert.ok(result);
      assert.equal(result.tokenSource, 'estimated');
      assert.ok(result.inputTokens > 0, 'should have inputTokens');
      assert.ok(result.outputTokens > 0, 'should have outputTokens');
      assert.ok(result.estimatedCostUSD > 0, 'should have estimatedCostUSD');
    });

    test('returns null when durationMinutes is 0', () => {
      const event = { eventId: 'E-002', durationMinutes: 0, model: 'claude-sonnet-4' };
      assert.equal(estimateTokens(event), null);
    });

    test('returns null when durationMinutes is null', () => {
      const event = { eventId: 'E-003', durationMinutes: null, model: 'claude-sonnet-4' };
      assert.equal(estimateTokens(event), null);
    });

    test('returns null when durationMinutes is undefined', () => {
      const event = { eventId: 'E-004', model: 'claude-sonnet-4' };
      assert.equal(estimateTokens(event), null);
    });

    test('uses default phase split when phase is unknown', () => {
      const event = { eventId: 'E-005', durationMinutes: 10, model: 'claude-sonnet-4', phase: 'unknown-phase' };
      const result = estimateTokens(event);
      assert.ok(result);
      // Default split is 0.60/0.40
      assert.ok(result.inputTokens > result.outputTokens, 'default split should favor input');
    });

    test('uses default model values for unknown model', () => {
      const event = { eventId: 'E-006', durationMinutes: 10, model: 'gpt-4-turbo' };
      const result = estimateTokens(event);
      assert.ok(result);
      // Default tokens per minute * 10 minutes
      assert.ok(result.inputTokens > 0);
    });

    test('uses implement phase split correctly', () => {
      const event = { eventId: 'E-007', durationMinutes: 10, model: 'claude-sonnet-4', phase: 'implement' };
      const result = estimateTokens(event);
      assert.ok(result);
      // implement split: 0.70 input, 0.30 output
      assert.ok(result.inputTokens > result.outputTokens, 'implement should favor input');
    });

    test('computes cost correctly', () => {
      const event = { eventId: 'E-008', durationMinutes: 1, model: 'claude-sonnet-4', phase: 'plan' };
      const result = estimateTokens(event);
      assert.ok(result);
      // plan split: 50/50, sonnet-4: 4500 tok/min, $3/1M
      const expectedTotal = 4500;
      const expectedCost = ((expectedTotal) / 1_000_000 * 3.00).toFixed(6);
      assert.ok(Math.abs(result.estimatedCostUSD - parseFloat(expectedCost)) < 0.001);
    });
  });

  describe('heuristic tables', () => {
    test('TOKENS_PER_MINUTE has all model entries', () => {
      assert.ok(Object.keys(TOKENS_PER_MINUTE).length >= 7, 'should have at least 7 model entries');
    });

    test('PRICE_PER_1M has matching model entries', () => {
      for (const model of Object.keys(TOKENS_PER_MINUTE)) {
        assert.ok(PRICE_PER_1M[model], `PRICE_PER_1M should have entry for ${model}`);
      }
    });

    test('PHASE_SPLIT values sum to approximately 1.0', () => {
      for (const [phase, split] of Object.entries(PHASE_SPLIT)) {
        const sum = split.input + split.output;
        assert.ok(Math.abs(sum - 1.0) < 0.01, `${phase} split sums to ${sum}, expected ~1.0`);
      }
    });
  });
});