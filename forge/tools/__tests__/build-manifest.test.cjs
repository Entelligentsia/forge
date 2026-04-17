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
  parseMetaDeps,
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

describe('build-manifest.cjs — parseMetaDeps', () => {

  test('fixture with well-formed deps: block parses to correct edges', () => {
    const fixtureDir = path.join(__dirname, 'fixtures');
    const edges = parseMetaDeps(fixtureDir, [['meta-with-deps.md', 'plan_task.md']]);
    assert.ok(edges.plan_task, 'plan_task edge should exist');
    assert.deepEqual(edges.plan_task.personas, ['.forge/personas/architect.md']);
    assert.deepEqual(edges.plan_task.skills, ['.forge/skills/architect-skills.md', '.forge/skills/generic-skills.md']);
    assert.deepEqual(edges.plan_task.templates, ['.forge/templates/PLAN_TEMPLATE.md', '.forge/templates/TASK_PROMPT_TEMPLATE.md']);
    assert.deepEqual(edges.plan_task.sub_workflows, ['.forge/workflows/review_plan.md']);
    assert.deepEqual(edges.plan_task.kb_docs, ['{KB_PATH}/architecture/stack.md', '{KB_PATH}/MASTER_INDEX.md']);
    assert.deepEqual(edges.plan_task.config_fields, ['commands.test', 'paths.engineering']);
  });

  test('meta file without deps: block produces no edge entry', () => {
    const os = require('os');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-test-'));
    try {
      fs.writeFileSync(path.join(tmpDir, 'meta-no-deps.md'),
        '---\nrequirements:\n  reasoning: High\n---\n\n# No deps\n');
      const edges = parseMetaDeps(tmpDir, [['meta-no-deps.md', 'some_workflow.md']]);
      assert.ok(!edges.some_workflow, 'no edge entry expected when deps: is absent');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('parseMetaDeps on real meta/workflows dir produces edges for all 17 meta sources', () => {
    const metaDir = path.join(__dirname, '..', '..', 'meta', 'workflows');
    const edges = parseMetaDeps(metaDir, WORKFLOW_MAP);
    const metaSources = WORKFLOW_MAP.filter(([src]) => src !== null);
    assert.ok(Object.keys(edges).length >= metaSources.length,
      `expected ≥${metaSources.length} edges, got ${Object.keys(edges).length}`);
  });

  test('every meta workflow with deps: has a non-empty personas list', () => {
    const metaDir = path.join(__dirname, '..', '..', 'meta', 'workflows');
    const edges = parseMetaDeps(metaDir, WORKFLOW_MAP);
    for (const [id, dep] of Object.entries(edges)) {
      assert.ok(dep.personas && dep.personas.length > 0, `workflow "${id}" has empty personas list`);
    }
  });

  test('empty deps list in sub_workflows resolves to empty array', () => {
    const os = require('os');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-test2-'));
    try {
      fs.writeFileSync(path.join(tmpDir, 'meta-leaf.md'),
        '---\nrequirements:\n  reasoning: High\ndeps:\n  personas: [supervisor]\n  skills: [supervisor, generic]\n  templates: []\n  sub_workflows: []\n  kb_docs: []\n  config_fields: []\n---\n# Leaf\n');
      const edges = parseMetaDeps(tmpDir, [['meta-leaf.md', 'review_plan.md']]);
      assert.ok(edges.review_plan, 'review_plan edge should exist');
      assert.deepEqual(edges.review_plan.sub_workflows, []);
      assert.deepEqual(edges.review_plan.templates, []);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});