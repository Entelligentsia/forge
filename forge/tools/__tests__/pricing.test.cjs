'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { computeCost, canonicalizeModel, MODEL_PRICING } = require('../lib/pricing.cjs');

describe('pricing.cjs — canonicalizeModel', () => {
  // Opus family
  test('canonicalizes claude-opus-4-5 to claude-opus-4-5', () => {
    const result = canonicalizeModel('claude-opus-4-5');
    assert.equal(result.canonical, 'claude-opus-4-5');
  });

  test('canonicalizes claude-opus-4-7 to claude-opus-4-7', () => {
    const result = canonicalizeModel('claude-opus-4-7');
    assert.equal(result.canonical, 'claude-opus-4-7');
  });

  test('collapses claude-opus-4-7-1m [1m context window variant] to canonical', () => {
    const result = canonicalizeModel('claude-opus-4-7-1m');
    assert.equal(result.canonical, 'claude-opus-4-7');
    assert.equal(result.contextWindow, '1m');
  });

  test('collapses claude-opus-4-7[1m] bracket variant to canonical', () => {
    const result = canonicalizeModel('claude-opus-4-7[1m]');
    assert.equal(result.canonical, 'claude-opus-4-7');
    assert.equal(result.contextWindow, '1m');
  });

  // Sonnet family
  test('canonicalizes claude-sonnet-4-5 to claude-sonnet-4-5', () => {
    const result = canonicalizeModel('claude-sonnet-4-5');
    assert.equal(result.canonical, 'claude-sonnet-4-5');
  });

  test('canonicalizes claude-sonnet-4-6 to claude-sonnet-4-6', () => {
    const result = canonicalizeModel('claude-sonnet-4-6');
    assert.equal(result.canonical, 'claude-sonnet-4-6');
  });

  test('collapses claude-sonnet-4-6-1m to canonical', () => {
    const result = canonicalizeModel('claude-sonnet-4-6-1m');
    assert.equal(result.canonical, 'claude-sonnet-4-6');
    assert.equal(result.contextWindow, '1m');
  });

  // Haiku family
  test('canonicalizes claude-haiku-3-5 to claude-haiku-3-5', () => {
    const result = canonicalizeModel('claude-haiku-3-5');
    assert.equal(result.canonical, 'claude-haiku-3-5');
  });

  test('collapses claude-haiku-3-5-1m to canonical', () => {
    const result = canonicalizeModel('claude-haiku-3-5-1m');
    assert.equal(result.canonical, 'claude-haiku-3-5');
    assert.equal(result.contextWindow, '1m');
  });

  // Short aliases (e.g. from older event files)
  test('normalizes opus-4-7 short alias to claude-opus-4-7', () => {
    const result = canonicalizeModel('opus-4-7');
    assert.equal(result.canonical, 'claude-opus-4-7');
  });

  test('normalizes sonnet-4-6 short alias to claude-sonnet-4-6', () => {
    const result = canonicalizeModel('sonnet-4-6');
    assert.equal(result.canonical, 'claude-sonnet-4-6');
  });

  test('normalizes haiku-3-5 short alias to claude-haiku-3-5', () => {
    const result = canonicalizeModel('haiku-3-5');
    assert.equal(result.canonical, 'claude-haiku-3-5');
  });

  // contextWindow population
  test('base canonical has contextWindow null (no 1m suffix)', () => {
    const result = canonicalizeModel('claude-sonnet-4-6');
    assert.equal(result.contextWindow, null);
  });

  test('1m variant has contextWindow "1m"', () => {
    const result = canonicalizeModel('claude-sonnet-4-6-1m');
    assert.equal(result.contextWindow, '1m');
  });

  // Unknown model
  test('unknown model returns null canonical', () => {
    const result = canonicalizeModel('some-unknown-model-9-9');
    assert.equal(result, null);
  });

  test('canonicalizeModel returns null for empty string', () => {
    const result = canonicalizeModel('');
    assert.equal(result, null);
  });

  test('canonicalizeModel returns null for null input', () => {
    const result = canonicalizeModel(null);
    assert.equal(result, null);
  });

  test('canonicalizeModel returns null for undefined input', () => {
    const result = canonicalizeModel(undefined);
    assert.equal(result, null);
  });
});

describe('pricing.cjs — MODEL_PRICING', () => {
  test('MODEL_PRICING is a frozen object', () => {
    assert.ok(Object.isFrozen(MODEL_PRICING), 'MODEL_PRICING should be frozen');
  });

  test('MODEL_PRICING contains claude-sonnet-4-6 entry', () => {
    assert.ok(MODEL_PRICING['claude-sonnet-4-6'] !== undefined, 'should have sonnet-4-6 entry');
  });

  test('each entry has 4 rate fields', () => {
    for (const [model, rates] of Object.entries(MODEL_PRICING)) {
      assert.ok(typeof rates.input === 'number', `${model}.input should be a number`);
      assert.ok(typeof rates.output === 'number', `${model}.output should be a number`);
      assert.ok(typeof rates.cacheRead === 'number', `${model}.cacheRead should be a number`);
      assert.ok(typeof rates.cacheWrite === 'number', `${model}.cacheWrite should be a number`);
    }
  });
});

describe('pricing.cjs — computeCost', () => {
  // Use claude-sonnet-4-5 published Anthropic pricing:
  // input: $3.00/MTok, output: $15.00/MTok, cacheRead: $0.30/MTok, cacheWrite: $3.75/MTok
  // (1 MTok = 1,000,000 tokens)
  test('computes cost for claude-sonnet-4-5 with all four counts', () => {
    const result = computeCost({
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheReadTokens: 1_000_000,
      cacheWriteTokens: 1_000_000,
      model: 'claude-sonnet-4-5',
    });
    assert.ok(result !== null, 'should return a cost, not null');
    assert.ok(typeof result === 'number', 'cost should be a number');
    // Sum: 3.00 + 15.00 + 0.30 + 3.75 = 22.05
    assert.ok(Math.abs(result - 22.05) < 0.001, `expected ~22.05, got ${result}`);
  });

  test('computes cost for claude-haiku-3-5 with realistic token counts', () => {
    const result = computeCost({
      inputTokens: 500_000,
      outputTokens: 100_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      model: 'claude-haiku-3-5',
    });
    assert.ok(result !== null, 'should return a cost for haiku-3-5');
    assert.ok(result > 0, 'cost should be positive with non-zero token counts');
  });

  test('returns null cost for unknown model', () => {
    const result = computeCost({
      inputTokens: 1000,
      outputTokens: 500,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      model: 'totally-unknown-model',
    });
    assert.equal(result, null, 'unknown model should return null cost, not zero');
  });

  test('returns zero cost when all token counts are zero', () => {
    const result = computeCost({
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      model: 'claude-sonnet-4-5',
    });
    assert.ok(result !== null, 'zero counts should return 0, not null');
    assert.equal(result, 0, 'zero counts should produce zero cost');
  });

  test('returns null when model is null', () => {
    const result = computeCost({
      inputTokens: 1000,
      outputTokens: 500,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      model: null,
    });
    assert.equal(result, null, 'null model should return null');
  });

  test('returns null when model is undefined', () => {
    const result = computeCost({
      inputTokens: 1000,
      outputTokens: 500,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      model: undefined,
    });
    assert.equal(result, null, 'undefined model should return null');
  });

  test('handles canonicalization: -1m variant produces same cost as base', () => {
    const base = computeCost({
      inputTokens: 100_000,
      outputTokens: 50_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      model: 'claude-sonnet-4-6',
    });
    const variant = computeCost({
      inputTokens: 100_000,
      outputTokens: 50_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      model: 'claude-sonnet-4-6-1m',
    });
    assert.ok(base !== null, 'base should return a cost');
    assert.ok(variant !== null, '1m variant should return a cost');
    assert.ok(Math.abs(base - variant) < 0.0001, `-1m variant should produce same cost as base`);
  });

  test('4-rate arithmetic: each rate contributes independently', () => {
    // Test each rate in isolation using claude-sonnet-4-5 (known rates)
    // input only: 1M tokens at $3.00/MTok = $3.00
    const inputOnly = computeCost({
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      model: 'claude-sonnet-4-5',
    });
    assert.ok(Math.abs(inputOnly - 3.00) < 0.001, `input-only cost should be ~3.00, got ${inputOnly}`);

    // output only: 1M tokens at $15.00/MTok = $15.00
    const outputOnly = computeCost({
      inputTokens: 0,
      outputTokens: 1_000_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      model: 'claude-sonnet-4-5',
    });
    assert.ok(Math.abs(outputOnly - 15.00) < 0.001, `output-only cost should be ~15.00, got ${outputOnly}`);
  });
});
