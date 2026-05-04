'use strict';

// Iron Law 2: failing tests written BEFORE implementation.
// This test file imports paths.cjs — which does not yet export the functions.
// All tests must fail until the implementation is written.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { getCommandsSubdir } = require('./paths.cjs');

describe('getCommandsSubdir', () => {
  test('returns lowercased prefix for uppercase input', () => {
    assert.equal(getCommandsSubdir('ACME'), 'acme');
  });

  test('returns lowercased prefix for mixed-case input', () => {
    assert.equal(getCommandsSubdir('MyProj'), 'myproj');
  });

  test('returns same string for already-lowercased input', () => {
    assert.equal(getCommandsSubdir('forge'), 'forge');
  });

  test('throws for empty string', () => {
    assert.throws(() => getCommandsSubdir(''), /must be a non-empty string/);
  });

  test('throws for non-string input', () => {
    assert.throws(() => getCommandsSubdir(null), /must be a non-empty string/);
    assert.throws(() => getCommandsSubdir(undefined), /must be a non-empty string/);
    assert.throws(() => getCommandsSubdir(42), /must be a non-empty string/);
  });
});