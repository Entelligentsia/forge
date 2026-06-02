'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  PERSONA_MAP,
  SKILL_MAP,
  WORKFLOW_MAP,
  FRAGMENT_MAP,
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

  test('SKILL_MAP has 7 entries, each output ends with -skills.md', () => {
    assert.equal(SKILL_MAP.length, 7);
    for (const [src, out] of SKILL_MAP) {
      assert.ok(out.endsWith('-skills.md'), `expected "${out}" to end with -skills.md`);
    }
  });

  // 17 entries — LLM orchestration prose (orchestrate_task / run_sprint /
  // fix_bug) retired; JS drivers (workflows-js/wfl-*.js) are the only truth.
  test('WORKFLOW_MAP has 17 entries', () => {
    assert.equal(WORKFLOW_MAP.length, 17);
  });

  test('WORKFLOW_MAP contains meta-bug-triage.md → triage.md (FORGE-BUG-040)', () => {
    const entry = WORKFLOW_MAP.find(([src, out]) => src === 'meta-bug-triage.md' && out === 'triage.md');
    assert.ok(entry, 'triage workflow must be wired through WORKFLOW_MAP so build-manifest regenerates it');
  });

  test('FRAGMENT_MAP enumerates every meta fragment, each as a [source, output] tuple', () => {
    assert.ok(Array.isArray(FRAGMENT_MAP), 'FRAGMENT_MAP must be exported');
    const fragmentsDir = path.join(__dirname, '..', '..', 'meta', 'workflows', '_fragments');
    const expected = fs.readdirSync(fragmentsDir).filter((f) => f.endsWith('.md')).sort();
    const actual = FRAGMENT_MAP.map(([src]) => src).sort();
    assert.deepEqual(actual, expected,
      'FRAGMENT_MAP must mirror meta/workflows/_fragments/*.md exactly (dynamic enumeration since 0.43.12)');
    for (const entry of FRAGMENT_MAP) {
      assert.equal(entry.length, 2);
      assert.equal(typeof entry[0], 'string');
      assert.equal(typeof entry[1], 'string');
    }
  });

  test('all source files referenced in FRAGMENT_MAP exist in forge/meta/workflows/_fragments/', () => {
    const dir = path.join(__dirname, '..', '..', 'meta', 'workflows', '_fragments');
    for (const [src] of FRAGMENT_MAP) {
      assert.ok(fs.existsSync(path.join(dir, src)), `missing: ${src}`);
    }
  });

  test('TEMPLATE_MAP has 10 entries (8 meta + 2 null), no CUSTOM_COMMAND_TEMPLATE', () => {
    assert.equal(TEMPLATE_MAP.length, 10);
    const nullEntries = TEMPLATE_MAP.filter(([src]) => src === null);
    assert.equal(nullEntries.length, 2, 'exactly two null source entries');
    // CUSTOM_COMMAND_TEMPLATE.md must NOT be present
    const customCmdEntry = TEMPLATE_MAP.find(([, out]) => out === 'CUSTOM_COMMAND_TEMPLATE.md');
    assert.equal(customCmdEntry, undefined, 'CUSTOM_COMMAND_TEMPLATE.md must be removed from TEMPLATE_MAP');
  });

  test('TEMPLATE_MAP includes COST_REPORT_TEMPLATE.md with null source', () => {
    const entry = TEMPLATE_MAP.find(([, out]) => out === 'COST_REPORT_TEMPLATE.md');
    assert.ok(entry, 'COST_REPORT_TEMPLATE.md must be in TEMPLATE_MAP');
    assert.equal(entry[0], null, 'COST_REPORT_TEMPLATE.md must have null source');
  });

  test('TEMPLATE_MAP includes PLAN_SUMMARY_TEMPLATE.json with null source', () => {
    const entry = TEMPLATE_MAP.find(([, out]) => out === 'PLAN_SUMMARY_TEMPLATE.json');
    assert.ok(entry, 'PLAN_SUMMARY_TEMPLATE.json must be in TEMPLATE_MAP');
    assert.equal(entry[0], null, 'PLAN_SUMMARY_TEMPLATE.json must have null source');
  });

  test('COMMAND_NAMES has 14 entries (v1.0: collate + enhance removed — T03)', () => {
    assert.equal(COMMAND_NAMES.length, 14);
    assert.ok(!COMMAND_NAMES.includes('enhance.md'), 'COMMAND_NAMES must NOT include enhance.md (removed in v1.0 T03)');
    assert.ok(!COMMAND_NAMES.includes('collate.md'), 'COMMAND_NAMES must NOT include collate.md (removed from user surface in v1.0 T03)');
    assert.ok(COMMAND_NAMES.includes('check-agent.md'), 'COMMAND_NAMES must include check-agent.md');
    assert.ok(COMMAND_NAMES.includes('validate.md'), 'COMMAND_NAMES must include validate.md');
  });

  test('schemas namespace in generated structure-manifest.json includes _defs/ subdirectory schemas (FORGE-S25-T12)', () => {
    const manifestPath = path.join(__dirname, '..', '..', 'schemas', 'structure-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const files = manifest.namespaces.schemas.files;
    // The phaseSummary _defs file is single-sourced and $ref'd by task + bug
    // schemas. The manifest's recursive schemas walker must surface nested
    // *.schema.json files with their relative path so structure-check sees them.
    assert.ok(
      files.includes(path.join('_defs', 'phaseSummary.schema.json')),
      `schemas.files must include _defs/phaseSummary.schema.json, got: ${JSON.stringify(files)}`
    );
  });

  test('commands namespace in generated structure-manifest.json has prefixed: true', () => {
    const manifestPath = path.join(__dirname, '..', '..', 'schemas', 'structure-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.strictEqual(
      manifest.namespaces.commands.prefixed,
      true,
      'commands namespace must have prefixed:true so check-structure resolves {prefix}/approve.md not approve.md'
    );
  });

  test('workflows-js namespace in generated structure-manifest.json mirrors base-pack/workflows-js/*.js (FORGE-S28 — workflows-js rebuild wiring)', () => {
    const manifestPath = path.join(__dirname, '..', '..', 'schemas', 'structure-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const ns = manifest.namespaces['workflows-js'];
    assert.ok(ns, 'structure-manifest.json must declare a "workflows-js" namespace');
    assert.equal(ns.dir, '.claude/workflows', 'workflows-js namespace dir must be .claude/workflows');
    const jsDir = path.join(__dirname, '..', '..', 'init', 'base-pack', 'workflows-js');
    const expected = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js')).sort();
    assert.deepEqual(
      ns.files, expected,
      'workflows-js namespace files must mirror base-pack/workflows-js/*.js exactly (dynamic enumeration)'
    );
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

  // S-7: only generated personas (those in PERSONA_MAP) appear in edges. Some workflows (e.g.
  // architect_sprint_intake) reference non-generated personas (product-manager) which are filtered
  // out, leaving an empty personas list. That is correct — the test must allow empty persona lists
  // for workflows whose only persona dep is non-generated.
  test('every meta workflow with deps: has a personas list (may be empty after non-generated-persona filter)', () => {
    const metaDir = path.join(__dirname, '..', '..', 'meta', 'workflows');
    const edges = parseMetaDeps(metaDir, WORKFLOW_MAP);
    for (const [id, dep] of Object.entries(edges)) {
      assert.ok(Array.isArray(dep.personas), `workflow "${id}" must have a personas array`);
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

  // S-7: product-manager.md must NOT appear in any workflow's persona edges.
  // meta-new-sprint.md declares personas:[product-manager], which is a non-generated
  // persona (no entry in PERSONA_MAP). Edges should only reference generated personas.
  test('S-7: parseMetaDeps must not emit product-manager.md in persona edges (non-generated persona filter)', () => {
    const metaDir = path.join(__dirname, '..', '..', 'meta', 'workflows');
    const edges = parseMetaDeps(metaDir, WORKFLOW_MAP);
    const generatedPersonaPaths = new Set(PERSONA_MAP.map(([, out]) => `.forge/personas/${out}`));
    for (const [workflowId, dep] of Object.entries(edges)) {
      for (const personaPath of dep.personas) {
        assert.ok(
          generatedPersonaPaths.has(personaPath),
          `workflow "${workflowId}" references non-generated persona "${personaPath}" — ` +
          `only PERSONA_MAP entries may appear in workflow edges (S-7 fix)`
        );
      }
    }
  });

  // S-7: generated structure-manifest.json personas namespace must not list product-manager.md
  test('S-7: structure-manifest.json personas.files must not include product-manager.md', () => {
    const manifestPath = path.join(__dirname, '..', '..', 'schemas', 'structure-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const files = manifest.namespaces.personas.files;
    assert.ok(
      !files.includes('product-manager.md'),
      `personas.files must not include product-manager.md (it has no generated output) — found: ${JSON.stringify(files)}`
    );
  });
});

describe('build-manifest.cjs — --check mode (FORGE-S25-T28)', () => {
  const os = require('os');

  function tmpDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'bm-check-'));
  }
  function rmrf(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) rmrf(full);
      else fs.unlinkSync(full);
    }
    fs.rmdirSync(dir);
  }

  test('buildManifest is exported and returns an object with namespaces', () => {
    const FORGE_ROOT = path.join(__dirname, '..', '..');
    const { buildManifest } = require('../build-manifest.cjs');
    const manifest = buildManifest(FORGE_ROOT);
    assert.ok(manifest && typeof manifest === 'object', 'buildManifest must return an object');
    assert.ok(manifest.namespaces && typeof manifest.namespaces === 'object', 'must have namespaces');
    assert.ok(manifest.namespaces.personas, 'must have personas namespace');
  });

  test('checkManifestDrift exits 0 when committed manifest matches regenerated', () => {
    const FORGE_ROOT = path.join(__dirname, '..', '..');
    const { checkManifestDrift } = require('../build-manifest.cjs');
    // The committed structure-manifest.json should be up to date
    const result = checkManifestDrift(FORGE_ROOT);
    assert.strictEqual(result.upToDate, true, `manifest should be up to date; diff: ${JSON.stringify(result.diff)}`);
  });

  test('checkManifestDrift exits with upToDate=false when committed manifest is stale', () => {
    const FORGE_ROOT = path.join(__dirname, '..', '..');
    const { checkManifestDrift, buildManifest } = require('../build-manifest.cjs');
    const manifestPath = path.join(FORGE_ROOT, 'schemas', 'structure-manifest.json');
    const original = fs.readFileSync(manifestPath, 'utf8');
    try {
      // Mutate the committed manifest to simulate drift
      const stale = JSON.parse(original);
      stale.namespaces.personas.files.push('__fake-persona.md');
      fs.writeFileSync(manifestPath, JSON.stringify(stale, null, 2) + '\n', 'utf8');
      const result = checkManifestDrift(FORGE_ROOT);
      assert.strictEqual(result.upToDate, false, 'should detect drift when committed manifest is stale');
      assert.ok(result.diff.length > 0, 'diff should be non-empty');
    } finally {
      fs.writeFileSync(manifestPath, original, 'utf8');
    }
  });
});