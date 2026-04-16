'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { deriveSlug } = require('../seed-store.cjs');

describe('seed-store.cjs — deriveSlug', () => {
  test('converts to lower-kebab-case', () => {
    assert.equal(deriveSlug('Hello World'), 'hello-world');
  });

  test('strips special characters', () => {
    assert.equal(deriveSlug('Task: Fix Bug #42!'), 'task-fix-bug-42');
  });

  test('truncates to 30 characters', () => {
    const long = 'A very long title that exceeds thirty characters limit';
    assert.ok(deriveSlug(long).length <= 30, `slug should be <= 30 chars, got ${deriveSlug(long).length}`);
  });

  test('removes trailing hyphens after truncation', () => {
    const result = deriveSlug('Implement the user authentication feature');
    assert.ok(!result.endsWith('-'), `slug should not end with hyphen: "${result}"`);
  });

  test('handles empty string', () => {
    assert.equal(deriveSlug(''), '');
  });

  test('handles single word', () => {
    assert.equal(deriveSlug('Implement'), 'implement');
  });

  test('handles multiple consecutive spaces', () => {
    assert.equal(deriveSlug('Hello   World'), 'hello-world');
  });

  test('handles leading/trailing whitespace', () => {
    assert.equal(deriveSlug('  Hello World  '), 'hello-world');
  });

  test('handles hyphens in input', () => {
    assert.equal(deriveSlug('User-Auth Flow'), 'user-auth-flow');
  });

  test('handles all special characters', () => {
    assert.equal(deriveSlug('!!!???'), '');
  });

  test('handles numbers', () => {
    assert.equal(deriveSlug('Sprint 42 Planning'), 'sprint-42-planning');
  });

  test('handles underscores', () => {
    assert.equal(deriveSlug('user_auth_module'), 'user-auth-module');
  });
});