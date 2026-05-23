'use strict';

// Tests for forge/tools/build-enum-catalog.cjs (FORGE-S25-T26)
// Covers: catalog structure, canonical transition tables, commandNames format,
//         drift detection against hooks/lib/common.cjs:FORGE_COMMAND_PATTERNS.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const SCRIPT_PATH = path.join(__dirname, '..', 'build-enum-catalog.cjs');
const {
  buildCatalog,
  writeCatalog,
  CANONICAL_TASK_TRANSITIONS,
  CANONICAL_SPRINT_TRANSITIONS,
  CANONICAL_BUG_TRANSITIONS,
  COMMAND_NAMES,
} = require(SCRIPT_PATH);

const FORGE_ROOT = path.join(__dirname, '..', '..');

// Utility: create a temp dir and clean up after test
function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'build-enum-catalog-'));
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

describe('build-enum-catalog.cjs', () => {

  // ── Catalog structure ─────────────────────────────────────────────────────

  test('buildCatalog returns object with required top-level keys', () => {
    const catalog = buildCatalog(FORGE_ROOT);
    assert.ok(catalog, 'catalog should be truthy');
    assert.ok(typeof catalog.version === 'string', 'version must be string');
    assert.ok(typeof catalog.generated === 'string', 'generated must be string');
    assert.ok(typeof catalog.note === 'string', 'note must be string');
    assert.ok(catalog.enums && typeof catalog.enums === 'object', 'enums must be object');
    assert.ok(Array.isArray(catalog.commandNames), 'commandNames must be array');
  });

  test('enums["task.status"] contains all 13 task status values from schema', () => {
    const catalog = buildCatalog(FORGE_ROOT);
    const taskEnum = catalog.enums['task.status'];
    assert.ok(Array.isArray(taskEnum), 'task.status must be array');
    assert.equal(taskEnum.length, 13, `expected 13 task statuses, got ${taskEnum.length}`);
    // Spot-check canonical values
    assert.ok(taskEnum.includes('draft'), 'must include draft');
    assert.ok(taskEnum.includes('committed'), 'must include committed');
    assert.ok(taskEnum.includes('plan-revision-required'), 'must include plan-revision-required');
    assert.ok(taskEnum.includes('code-revision-required'), 'must include code-revision-required');
    assert.ok(taskEnum.includes('escalated'), 'must include escalated');
  });

  test('enums["sprint.status"] contains all 7 sprint status values from schema', () => {
    const catalog = buildCatalog(FORGE_ROOT);
    const sprintEnum = catalog.enums['sprint.status'];
    assert.ok(Array.isArray(sprintEnum), 'sprint.status must be array');
    assert.equal(sprintEnum.length, 7, `expected 7 sprint statuses, got ${sprintEnum.length}`);
    assert.ok(sprintEnum.includes('planning'), 'must include planning');
    assert.ok(sprintEnum.includes('retrospective-done'), 'must include retrospective-done');
    assert.ok(sprintEnum.includes('partially-completed'), 'must include partially-completed');
  });

  test('enums["bug.status"] contains all 4 bug status values from schema', () => {
    const catalog = buildCatalog(FORGE_ROOT);
    const bugEnum = catalog.enums['bug.status'];
    // Note: bug schema has 4 values (reported, triaged, in-progress, fixed)
    // abandoned is a transition target but NOT in bug.schema.json enum (schema not updated by T26)
    assert.ok(Array.isArray(bugEnum), 'bug.status must be array');
    assert.ok(bugEnum.length >= 4, `expected at least 4 bug statuses, got ${bugEnum.length}`);
    assert.ok(bugEnum.includes('reported'), 'must include reported');
    assert.ok(bugEnum.includes('fixed'), 'must include fixed');
  });

  // ── Canonical transition tables ───────────────────────────────────────────

  test('task.committed is terminal — to: [] (D-T-9)', () => {
    const committed = CANONICAL_TASK_TRANSITIONS['committed'];
    assert.ok(Array.isArray(committed), 'committed entry must exist');
    assert.deepEqual(committed, [], 'committed must be terminal (empty to array)');
  });

  test('task.draft does NOT include plan-revision-required or code-revision-required (D-T-1)', () => {
    const draftTo = CANONICAL_TASK_TRANSITIONS['draft'];
    assert.ok(Array.isArray(draftTo), 'draft entry must exist');
    assert.ok(!draftTo.includes('plan-revision-required'), 'draft must not allow plan-revision-required');
    assert.ok(!draftTo.includes('code-revision-required'), 'draft must not allow code-revision-required');
  });

  test('task.planned does NOT include implemented or code-revision-required (D-T-2, D-T-3)', () => {
    const plannedTo = CANONICAL_TASK_TRANSITIONS['planned'];
    assert.ok(Array.isArray(plannedTo), 'planned entry must exist');
    assert.ok(!plannedTo.includes('implemented'), 'planned must not allow implemented (skip plan-approved)');
    assert.ok(!plannedTo.includes('code-revision-required'), 'planned must not allow code-revision-required');
  });

  test('task.plan-approved does NOT include code-revision-required (D-T-4)', () => {
    const planApprovedTo = CANONICAL_TASK_TRANSITIONS['plan-approved'];
    assert.ok(Array.isArray(planApprovedTo), 'plan-approved entry must exist');
    assert.ok(!planApprovedTo.includes('code-revision-required'), 'plan-approved must not allow code-revision-required');
    assert.ok(planApprovedTo.includes('plan-revision-required'), 'plan-approved must allow plan-revision-required');
  });

  test('sprint.completed allows ONLY retrospective-done (D-S-2)', () => {
    const completedTo = CANONICAL_SPRINT_TRANSITIONS['completed'];
    assert.deepEqual(completedTo, ['retrospective-done'], 'completed must only allow retrospective-done');
  });

  test('sprint.blocked allows active and abandoned for recovery (D-S-4)', () => {
    const blockedTo = CANONICAL_SPRINT_TRANSITIONS['blocked'];
    assert.ok(Array.isArray(blockedTo), 'blocked entry must exist');
    assert.ok(blockedTo.includes('active'), 'sprint.blocked must allow active (recovery)');
    assert.ok(blockedTo.includes('abandoned'), 'sprint.blocked must allow abandoned');
  });

  test('bug.in-progress allows abandoned (D-B-1)', () => {
    const inProgressTo = CANONICAL_BUG_TRANSITIONS['in-progress'];
    assert.ok(Array.isArray(inProgressTo), 'in-progress entry must exist');
    assert.ok(inProgressTo.includes('abandoned'), 'bug.in-progress must allow abandoned');
  });

  // ── commandNames format ───────────────────────────────────────────────────

  test('all commandNames entries match /^forge:[a-z-]+$/ (colon-namespaced, R-2)', () => {
    const pattern = /^forge:[a-z-]+$/;
    for (const cmd of COMMAND_NAMES) {
      assert.match(cmd, pattern, `commandName '${cmd}' must match /^forge:[a-z-]+$/`);
    }
  });

  // ── Drift detection ───────────────────────────────────────────────────────

  test('every forge:* catalog commandName has a matching regex in FORGE_COMMAND_PATTERNS', () => {
    const { FORGE_COMMAND_PATTERNS } = require('../../hooks/lib/common.cjs');
    const catalog = buildCatalog(FORGE_ROOT);
    const forgeCommands = catalog.commandNames.filter(n => n.startsWith('forge:'));

    const unmatched = [];
    for (const cmd of forgeCommands) {
      // A command like 'forge:plan' should be matched by at least one pattern.
      // Patterns match against command strings (the 'cmd' portion after 'forge:').
      // We test the full command name string against each pattern.
      const matched = FORGE_COMMAND_PATTERNS.some(p => p.test(cmd));
      if (!matched) unmatched.push(cmd);
    }

    assert.deepEqual(
      unmatched,
      [],
      `These catalog commandNames have no matching regex in FORGE_COMMAND_PATTERNS: ${unmatched.join(', ')}\n` +
      'Add a regex to hooks/lib/common.cjs:FORGE_COMMAND_PATTERNS for each.',
    );
  });

  // ── writeCatalog ──────────────────────────────────────────────────────────

  test('writeCatalog writes valid JSON files to a temp dir', () => {
    const tmp = tmpDir();
    // Create a minimal fake forgeRoot structure for writeCatalog
    // We use the real FORGE_ROOT but redirect output to tmp by monkey-patching.
    // Instead, create a forgeRoot under tmp with necessary dirs.
    const fakeRoot = path.join(tmp, 'forge');
    fs.mkdirSync(path.join(fakeRoot, 'schemas'), { recursive: true });
    fs.mkdirSync(path.join(fakeRoot, '.claude-plugin'), { recursive: true });
    // Copy task/sprint/bug schemas from real root
    for (const schema of ['task.schema.json', 'sprint.schema.json', 'bug.schema.json']) {
      const src = path.join(FORGE_ROOT, 'schemas', schema);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(fakeRoot, 'schemas', schema));
      }
    }
    // Write a minimal plugin.json
    fs.writeFileSync(path.join(fakeRoot, '.claude-plugin', 'plugin.json'),
      JSON.stringify({ version: '0.0.0-test' }), 'utf8');

    try {
      const { catalogPath, transitionPaths } = writeCatalog(fakeRoot);

      assert.ok(fs.existsSync(catalogPath), 'enum-catalog.json must be written');
      const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
      assert.equal(catalog.version, '0.0.0-test', 'version must match plugin.json');
      assert.ok(catalog.enums, 'catalog must have enums');
      assert.ok(Array.isArray(catalog.commandNames), 'catalog must have commandNames');

      assert.equal(transitionPaths.length, 3, 'must write 3 transition files');
      for (const p of transitionPaths) {
        assert.ok(fs.existsSync(p), `transition file must exist: ${p}`);
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        assert.ok(Array.isArray(data), 'transition file must be an array');
        assert.ok(data.length > 0, 'transition file must be non-empty');
        assert.ok(typeof data[0].from === 'string', 'each entry must have from: string');
        assert.ok(Array.isArray(data[0].to), 'each entry must have to: string[]');
      }
    } finally {
      rmrf(tmp);
    }
  });
});

describe('build-enum-catalog.cjs — --check mode (FORGE-S25-T28)', () => {
  test('checkCatalogDrift is exported', () => {
    const { checkCatalogDrift } = require(SCRIPT_PATH);
    assert.equal(typeof checkCatalogDrift, 'function', 'checkCatalogDrift must be exported');
  });

  test('checkCatalogDrift returns upToDate:true when committed catalog matches regenerated', () => {
    const { checkCatalogDrift } = require(SCRIPT_PATH);
    const result = checkCatalogDrift(FORGE_ROOT);
    assert.strictEqual(result.upToDate, true,
      `enum-catalog should be up to date; diff: ${JSON.stringify(result.diff)}`);
  });

  test('checkCatalogDrift returns upToDate:false when enum-catalog.json is stale', () => {
    const { checkCatalogDrift } = require(SCRIPT_PATH);
    const catalogPath = path.join(FORGE_ROOT, 'schemas', 'enum-catalog.json');
    const original = fs.readFileSync(catalogPath, 'utf8');
    try {
      // Mutate the committed catalog to simulate drift
      const stale = JSON.parse(original);
      stale.enums['task.status'].push('__fake-status');
      fs.writeFileSync(catalogPath, JSON.stringify(stale, null, 2) + '\n', 'utf8');
      const result = checkCatalogDrift(FORGE_ROOT);
      assert.strictEqual(result.upToDate, false, 'should detect drift when catalog is stale');
      assert.ok(result.diff.length > 0, 'diff should be non-empty');
    } finally {
      fs.writeFileSync(catalogPath, original, 'utf8');
    }
  });
});
