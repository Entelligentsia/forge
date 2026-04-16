'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  PERSONA_MAP,
  SKILL_MAP,
  WORKFLOW_MAP,
  TEMPLATE_MAP,
  COMMAND_NAMES,
  checkReverseDrift,
  verifySources,
} = require('../build-manifest.cjs');

describe('build-manifest.cjs — mapping tables', () => {

  test('PERSONA_MAP has 6 entries, each is a [source, output] tuple', () => {
    assert.equal(PERSONA_MAP.length, 6);
    for (const entry of PERSONA_MAP) {
      assert.equal(entry.length, 2);
      assert.equal(typeof entry[0], 'string');
      assert.equal(typeof entry[1], 'string');
    }
  });

  test('SKILL_MAP has 8 entries, each output ends with -skills.md', () => {
    assert.equal(SKILL_MAP.length, 8);
    for (const [src, out] of SKILL_MAP) {
      assert.ok(out.endsWith('-skills.md'), `expected "${out}" to end with -skills.md`);
    }
  });

  test('WORKFLOW_MAP has 18 entries', () => {
    assert.equal(WORKFLOW_MAP.length, 18);
  });

  test('TEMPLATE_MAP has 9 entries, one has null source (CUSTOM_COMMAND_TEMPLATE)', () => {
    assert.equal(TEMPLATE_MAP.length, 9);
    const nullEntries = TEMPLATE_MAP.filter(([src]) => src === null);
    assert.equal(nullEntries.length, 1, 'exactly one null source entry');
    assert.equal(nullEntries[0][1], 'CUSTOM_COMMAND_TEMPLATE.md');
  });

  test('COMMAND_NAMES has 13 entries', () => {
    assert.equal(COMMAND_NAMES.length, 13);
  });

  test('all source files referenced in PERSONA_MAP exist in forge/meta/personas/', () => {
    const dir = path.join(__dirname, '..', '..', 'meta', 'personas');
    for (const [src] of PERSONA_MAP) {
      assert.ok(fs.existsSync(path.join(dir, src)), `missing: ${src}`);
    }
  });

  test('all source files referenced in SKILL_MAP exist in forge/meta/skills/', () => {
    const dir = path.join(__dirname, '..', '..', 'meta', 'skills');
    for (const [src] of SKILL_MAP) {
      if (src === null) continue;
      assert.ok(fs.existsSync(path.join(dir, src)), `missing: ${src}`);
    }
  });

  test('all source files referenced in WORKFLOW_MAP exist in forge/meta/workflows/ (except null sources)', () => {
    const dir = path.join(__dirname, '..', '..', 'meta', 'workflows');
    for (const [src] of WORKFLOW_MAP) {
      if (src === null) continue;
      assert.ok(fs.existsSync(path.join(dir, src)), `missing: ${src}`);
    }
  });

  test('all source files referenced in TEMPLATE_MAP exist in forge/meta/templates/ (except null sources)', () => {
    const dir = path.join(__dirname, '..', '..', 'meta', 'templates');
    for (const [src] of TEMPLATE_MAP) {
      if (src === null) continue;
      assert.ok(fs.existsSync(path.join(dir, src)), `missing: ${src}`);
    }
  });
});

describe('build-manifest.cjs — exported functions', () => {

  test('verifySources returns empty array when all sources exist', () => {
    const dir = path.join(__dirname, '..', '..', 'meta', 'personas');
    const missing = verifySources(dir, PERSONA_MAP, 'PERSONA_MAP');
    assert.equal(missing.length, 0);
  });

  test('verifySources reports missing entries', () => {
    const dir = path.join(__dirname, '..', '..', 'meta', 'personas');
    const fakeMap = [['nonexistent-file.md', 'output.md']];
    const missing = verifySources(dir, fakeMap, 'FAKE');
    assert.equal(missing.length, 1);
    assert.equal(missing[0].source, 'nonexistent-file.md');
  });

  test('verifySources skips null sources', () => {
    const dir = path.join(__dirname, '..', '..', 'meta', 'workflows');
    const fakeMap = [[null, 'output.md']];
    const missing = verifySources(dir, fakeMap, 'FAKE');
    assert.equal(missing.length, 0);
  });

  test('checkReverseDrift returns empty when all meta files are referenced', () => {
    const dir = path.join(__dirname, '..', '..', 'meta', 'personas');
    const warnings = checkReverseDrift(dir, PERSONA_MAP, 'PERSONA_MAP');
    // PERSONA_MAP does not include meta-orchestrator.md or meta-product-manager.md,
    // so those should appear as drift warnings
    assert.ok(Array.isArray(warnings));
    assert.ok(warnings.length >= 2, 'orchestrator and product-manager should drift');
  });

  test('checkReverseDrift returns empty for a directory with no unreferenced files', () => {
    const dir = path.join(__dirname, '..', '..', 'meta', 'templates');
    const warnings = checkReverseDrift(dir, TEMPLATE_MAP, 'TEMPLATE_MAP');
    assert.ok(Array.isArray(warnings));
    // All meta-*.md files in templates/ are referenced in TEMPLATE_MAP
    assert.equal(warnings.length, 0);
  });
});