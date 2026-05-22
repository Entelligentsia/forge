'use strict';
// Tests for lib/slug.cjs
// Written red-bar first (Iron Law 2) — these tests fail until lib/slug.cjs is created.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { deriveSlug } = require('../lib/slug.cjs');

describe('lib/slug.cjs — deriveSlug', () => {

  // -------------------------------------------------------------------------
  // Basic functionality
  // -------------------------------------------------------------------------
  test('lowercases and replaces non-alphanumeric with hyphens', () => {
    const result = deriveSlug('Hello World');
    assert.strictEqual(result, 'hello-world');
  });

  test('handles multiple consecutive non-alphanumeric chars', () => {
    const result = deriveSlug('foo  --  bar');
    assert.strictEqual(result, 'foo-bar');
  });

  test('strips leading and trailing hyphens', () => {
    const result = deriveSlug('  hello world  ');
    assert.ok(!result.startsWith('-'), 'must not start with hyphen');
    assert.ok(!result.endsWith('-'), 'must not end with hyphen');
  });

  // -------------------------------------------------------------------------
  // Default maxLen = 30
  // -------------------------------------------------------------------------
  test('default maxLen truncates at 30 chars', () => {
    const longTitle = 'This Is A Very Long Title That Exceeds Thirty Characters';
    const result = deriveSlug(longTitle);
    assert.ok(result.length <= 30, `result must be <= 30 chars, got ${result.length}`);
  });

  test('short title: not truncated', () => {
    const result = deriveSlug('Short Title');
    assert.strictEqual(result, 'short-title');
    assert.ok(result.length <= 30);
  });

  test('title of exactly 30 chars slug: not truncated', () => {
    // 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' is exactly 30 a's
    const result = deriveSlug('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    assert.strictEqual(result.length, 30);
  });

  // -------------------------------------------------------------------------
  // Trailing hyphen trim after truncation
  // -------------------------------------------------------------------------
  test('trailing hyphen trimmed after truncation', () => {
    // Construct a title where truncation at 30 falls on a hyphen boundary
    // 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-extra' = 30 a's + hyphen + 'extra'
    // Slug: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-extra' → truncate at 30 → 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    // (No trailing hyphen in this case)
    // Now try: 29 a's + space + 'b' = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaa b'
    // slug: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaa-b' (31 chars) → truncated to 30: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaa-'
    // → trailing hyphen trimmed → 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    const title = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaa bextra'; // slug becomes 29 a's + '-' + 'bextra', truncate at 30 = 29 a's + '-'
    const result = deriveSlug(title);
    assert.ok(!result.endsWith('-'), `trailing hyphen must be trimmed, got "${result}"`);
    assert.ok(result.length <= 30);
  });

  // -------------------------------------------------------------------------
  // Custom maxLen override
  // -------------------------------------------------------------------------
  test('custom maxLen overrides default', () => {
    const title = 'Hello World This Is Long';
    const result = deriveSlug(title, { maxLen: 10 });
    assert.ok(result.length <= 10, `result must be <= 10 chars with maxLen=10, got ${result.length}`);
  });

  test('custom maxLen=50 allows longer slugs', () => {
    const title = 'A fairly long title that would be truncated with default settings';
    const result30 = deriveSlug(title);
    const result50 = deriveSlug(title, { maxLen: 50 });
    assert.ok(result50.length >= result30.length, 'maxLen=50 should yield longer or equal slug than maxLen=30');
    assert.ok(result50.length <= 50);
  });

  // -------------------------------------------------------------------------
  // Special characters
  // -------------------------------------------------------------------------
  test('numbers preserved', () => {
    const result = deriveSlug('Task T01 Fix Version 2');
    assert.ok(result.includes('t01'), 'numbers should be preserved');
    assert.ok(result.includes('2') || result.includes('version-2'));
  });

  test('special chars replaced with hyphens', () => {
    const result = deriveSlug('Hello: World & Foo (bar)');
    assert.ok(!result.includes(':'), 'colon must be replaced');
    assert.ok(!result.includes('&'), 'ampersand must be replaced');
    assert.ok(!result.includes('('), 'parens must be replaced');
    assert.ok(!result.includes(')'), 'parens must be replaced');
  });

  // -------------------------------------------------------------------------
  // Empty title
  // -------------------------------------------------------------------------
  test('empty title returns empty string', () => {
    const result = deriveSlug('');
    assert.strictEqual(result, '');
  });

  test('whitespace-only title returns empty string', () => {
    const result = deriveSlug('   ');
    assert.strictEqual(result, '');
  });

  // -------------------------------------------------------------------------
  // Regression: >30 char title truncation from seed-store consumer
  // -------------------------------------------------------------------------
  test('regression: maxLen=30 matches seed-store.cjs canonical behavior', () => {
    // seed-store.cjs: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30).replace(/-+$/g, '')
    const title = 'Plugin test baseline plus no-skip CI gate';
    const expected = 'plugin-test-baseline-plus-no-s';
    // Manually compute: 'plugin-test-baseline-plus-no-skip-ci-gate' → slice(0,30) = 'plugin-test-baseline-plus-no-s'
    const result = deriveSlug(title);
    assert.strictEqual(result, expected,
      `deriveSlug must match seed-store.cjs behavior for >30 char titles`);
  });

});
