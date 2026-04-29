'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  getByPath,
  setByPath,
  validatePhases,
  detectIndent,
  parseArgs,
  VALID_ROLES,
  VALID_NAME,
  ROLE_MODEL_DEFAULTS,
  assertSafeKeys,
} = require('../manage-config.cjs');

describe('manage-config.cjs', () => {

  // ── getByPath ────────────────────────────────────────────────────────

  describe('getByPath', () => {
    test('resolves a deep path', () => {
      assert.equal(getByPath({ a: { b: { c: 42 } } }, 'a.b.c'), 42);
    });

    test('returns undefined for a missing path', () => {
      assert.equal(getByPath({ a: { b: 1 } }, 'a.missing'), undefined);
    });

    test('resolves a single key', () => {
      assert.equal(getByPath({ x: 1 }, 'x'), 1);
    });

    test('returns undefined on an empty object', () => {
      assert.equal(getByPath({}, 'a.b'), undefined);
    });

    test('returns undefined when traversing through a primitive', () => {
      assert.equal(getByPath({ a: 5 }, 'a.b'), undefined);
    });

    test('returns undefined when traversing through null', () => {
      assert.equal(getByPath({ a: null }, 'a.b'), undefined);
    });
  });

  // ── setByPath ────────────────────────────────────────────────────────

  describe('setByPath', () => {
    test('creates deep nested structure', () => {
      const obj = {};
      setByPath(obj, 'a.b.c', 42);
      assert.deepEqual(obj, { a: { b: { c: 42 } } });
    });

    test('overwrites an existing value', () => {
      const obj = { a: { b: 1 } };
      setByPath(obj, 'a.b', 2);
      assert.deepEqual(obj, { a: { b: 2 } });
    });

    test('creates intermediate objects when value is null', () => {
      const obj = { a: null };
      setByPath(obj, 'a.b', 'val');
      assert.deepEqual(obj, { a: { b: 'val' } });
    });

    test('sets a top-level key', () => {
      const obj = {};
      setByPath(obj, 'x', 99);
      assert.deepEqual(obj, { x: 99 });
    });

    test('does not mutate unrelated keys', () => {
      const obj = { a: { b: 1, c: 2 } };
      setByPath(obj, 'a.d', 3);
      assert.equal(obj.a.b, 1);
      assert.equal(obj.a.c, 2);
      assert.equal(obj.a.d, 3);
    });
  });

  // ── validatePhases ────────────────────────────────────────────────────

  describe('validatePhases', () => {
    test('returns null for a valid phase', () => {
      const phases = [{ command: 'plan', role: 'plan', maxIterations: 3 }];
      assert.equal(validatePhases(phases), null);
    });

    test('returns error for empty array', () => {
      assert.equal(validatePhases([]), 'At least one phase is required');
    });

    test('returns error for non-array', () => {
      assert.equal(validatePhases('not an array'), 'At least one phase is required');
      assert.equal(validatePhases(null), 'At least one phase is required');
    });

    test('returns error for missing command', () => {
      const phases = [{ role: 'plan' }];
      assert.ok(validatePhases(phases).includes('command must be a non-empty string'));
    });

    test('returns error for empty command string', () => {
      const phases = [{ command: '', role: 'plan' }];
      assert.ok(validatePhases(phases).includes('command must be a non-empty string'));
    });

    test('returns error for invalid role', () => {
      const phases = [{ command: 'plan', role: 'nonexistent' }];
      assert.ok(validatePhases(phases).includes('role must be one of'));
    });

    test('returns error for non-integer maxIterations', () => {
      const phases = [{ command: 'plan', role: 'plan', maxIterations: 1.5 }];
      assert.ok(validatePhases(phases).includes('maxIterations must be a positive integer'));
    });

    test('returns error for zero maxIterations', () => {
      const phases = [{ command: 'plan', role: 'plan', maxIterations: 0 }];
      assert.ok(validatePhases(phases).includes('maxIterations must be a positive integer'));
    });

    test('returns error for negative maxIterations', () => {
      const phases = [{ command: 'plan', role: 'plan', maxIterations: -1 }];
      assert.ok(validatePhases(phases).includes('maxIterations must be a positive integer'));
    });

    test('accepts phase without maxIterations (optional)', () => {
      const phases = [{ command: 'plan', role: 'plan' }];
      assert.equal(validatePhases(phases), null);
    });

    test('accepts multiple valid phases', () => {
      const phases = [
        { command: 'plan', role: 'plan' },
        { command: 'implement', role: 'implement', maxIterations: 5 },
      ];
      assert.equal(validatePhases(phases), null);
    });
  });

  // ── detectIndent ──────────────────────────────────────────────────────

  describe('detectIndent', () => {
    test('detects two-space indent', () => {
      assert.equal(detectIndent('  "a": 1'), '  ');
    });

    test('detects four-space indent', () => {
      assert.equal(detectIndent('    "a": 1'), '    ');
    });

    test('detects tab indent', () => {
      assert.equal(detectIndent('\t"a": 1'), '\t');
    });

    test('returns default two spaces when no indent found', () => {
      assert.equal(detectIndent('"a": 1'), '  ');
    });

    test('detects indent from multi-line JSON', () => {
      const raw = '{\n  "name": "test"\n}';
      assert.equal(detectIndent(raw), '  ');
    });
  });

  // ── parseArgs ─────────────────────────────────────────────────────────

  describe('parseArgs', () => {
    test('parses --key value pairs', () => {
      const result = parseArgs(['--phases', '[...]', '--dry-run']);
      assert.equal(result.phases, '[...]');
      // --dry-run has no value following it so it is not captured
      assert.equal(result['dry-run'], undefined);
    });

    test('parses multiple --key value pairs', () => {
      const result = parseArgs(['--name', 'my-pipeline', '--description', 'test desc']);
      assert.equal(result.name, 'my-pipeline');
      assert.equal(result.description, 'test desc');
    });

    test('returns empty object for empty array', () => {
      assert.deepEqual(parseArgs([]), {});
    });

    test('skips a dangling flag with no value', () => {
      const result = parseArgs(['--verbose']);
      assert.equal(result.verbose, undefined);
    });

    test('does not treat a non-flag as a key', () => {
      const result = parseArgs(['value', '--key', 'val']);
      assert.equal(result.key, 'val');
    });

    test('overwrites earlier values for same key', () => {
      const result = parseArgs(['--level', '1', '--level', '2']);
      assert.equal(result.level, '2');
    });
  });

  // ── Exported constants ────────────────────────────────────────────────

  describe('exported constants', () => {
    test('VALID_ROLES is an array of expected roles', () => {
      assert.ok(Array.isArray(VALID_ROLES));
      assert.ok(VALID_ROLES.includes('plan'));
      assert.ok(VALID_ROLES.includes('implement'));
      assert.ok(VALID_ROLES.includes('commit'));
    });

    test('VALID_NAME is a regex matching lowercase names with dashes and underscores', () => {
      assert.ok(VALID_NAME instanceof RegExp);
      assert.ok(VALID_NAME.test('my-pipeline'));
      assert.ok(VALID_NAME.test('pipeline_1'));
      assert.ok(!VALID_NAME.test('My Pipeline'));
      assert.ok(!VALID_NAME.test(''));
    });

    test('ROLE_MODEL_DEFAULTS maps roles to model tiers', () => {
      assert.equal(typeof ROLE_MODEL_DEFAULTS, 'object');
      assert.equal(ROLE_MODEL_DEFAULTS['plan'], 'sonnet');
      assert.equal(ROLE_MODEL_DEFAULTS['review-plan'], 'opus');
      assert.equal(ROLE_MODEL_DEFAULTS['commit'], 'haiku');
    });
  });

  // ── C4: Prototype pollution guards ────────────────────────────────

  describe('assertSafeKeys — prototype pollution guard', () => {
    test('throws on __proto__ in getByPath', () => {
      assert.throws(() => getByPath({}, '__proto__.polluted'), /Unsafe key path/);
    });

    test('throws on __proto__ in setByPath', () => {
      assert.throws(() => setByPath({}, '__proto__.polluted', 'yes'), /Unsafe key path/);
    });

    test('throws on constructor in getByPath', () => {
      assert.throws(() => getByPath({}, 'constructor.prototype'), /Unsafe key path/);
    });

    test('throws on constructor in setByPath', () => {
      assert.throws(() => setByPath({}, 'constructor.prototype.polluted', true), /Unsafe key path/);
    });

    test('throws on prototype in getByPath', () => {
      assert.throws(() => getByPath({}, 'prototype.toString'), /Unsafe key path/);
    });

    test('throws on prototype in setByPath', () => {
      assert.throws(() => setByPath({}, 'a.prototype.b', 'val'), /Unsafe key path/);
    });

    test('normal paths still work in getByPath', () => {
      assert.equal(getByPath({ a: { b: 1 } }, 'a.b'), 1);
    });

    test('normal paths still work in setByPath', () => {
      const obj = {};
      setByPath(obj, 'a.b', 2);
      assert.deepEqual(obj, { a: { b: 2 } });
    });
  });

});