'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ok, fail, RESULT_CODES } = require('../lib/result.js');

describe('result.js — ok()', () => {
  test('returns { ok: true, value } for a non-null value', () => {
    const r = ok('hello');
    assert.equal(r.ok, true);
    assert.equal(r.value, 'hello');
  });

  test('returns { ok: true, value: undefined } when called with no args', () => {
    const r = ok();
    assert.equal(r.ok, true);
    assert.equal(r.value, undefined);
  });

  test('returns { ok: true, value: null } for null value', () => {
    const r = ok(null);
    assert.equal(r.ok, true);
    assert.equal(r.value, null);
  });

  test('returns { ok: true, value: 0 } for falsy value 0', () => {
    const r = ok(0);
    assert.equal(r.ok, true);
    assert.equal(r.value, 0);
  });

  test('returns { ok: true, value: false } for boolean false', () => {
    const r = ok(false);
    assert.equal(r.ok, true);
    assert.equal(r.value, false);
  });

  test('does not include code or message fields', () => {
    const r = ok('x');
    assert.equal(r.code, undefined);
    assert.equal(r.message, undefined);
  });
});

describe('result.js — fail()', () => {
  test('returns { ok: false, code, message }', () => {
    const r = fail('MISSING_DIR', 'Directory not found');
    assert.equal(r.ok, false);
    assert.equal(r.code, 'MISSING_DIR');
    assert.equal(r.message, 'Directory not found');
  });

  test('does not include value field', () => {
    const r = fail('SOME_CODE', 'msg');
    assert.equal(r.value, undefined);
  });

  test('preserves code and message exactly', () => {
    const r = fail('E_ZERO_DURATION', 'durationMinutes is 0');
    assert.equal(r.code, 'E_ZERO_DURATION');
    assert.equal(r.message, 'durationMinutes is 0');
  });
});

describe('result.js — RESULT_CODES', () => {
  test('is an object', () => {
    assert.ok(typeof RESULT_CODES === 'object' && RESULT_CODES !== null);
  });

  test('contains MISSING_DIR', () => {
    assert.ok('MISSING_DIR' in RESULT_CODES, 'RESULT_CODES should have MISSING_DIR');
    assert.equal(typeof RESULT_CODES.MISSING_DIR, 'string');
  });

  test('contains E_ZERO_DURATION', () => {
    assert.ok('E_ZERO_DURATION' in RESULT_CODES, 'RESULT_CODES should have E_ZERO_DURATION');
    assert.equal(typeof RESULT_CODES.E_ZERO_DURATION, 'string');
  });

  test('contains E_MISSING_DURATION', () => {
    assert.ok('E_MISSING_DURATION' in RESULT_CODES, 'RESULT_CODES should have E_MISSING_DURATION');
    assert.equal(typeof RESULT_CODES.E_MISSING_DURATION, 'string');
  });

  test('all values are non-empty strings', () => {
    for (const [key, val] of Object.entries(RESULT_CODES)) {
      assert.equal(typeof val, 'string', `RESULT_CODES.${key} should be a string`);
      assert.ok(val.length > 0, `RESULT_CODES.${key} should be non-empty`);
    }
  });
});
