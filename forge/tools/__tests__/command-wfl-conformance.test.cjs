'use strict';

// command-wfl-conformance.test.cjs — FORGE-S28-T07
//
// Asserts that the three wfl-dispatched commands use workflow() invocations
// (not the old Read .forge/workflows/... prose path), and that generate-commands.md
// carries the conformance-rung language for the rebuild upgrade path.
//
// Tests 1–5 are static assertions against source files.
// Test 6 exercises the real buildBasePack() generator via tmpdir.
// Test 7 (FORGE-S31-T04): task-boundary assertion — init.md base-pack conformance
//   is gated on FORGE-S31-T05 (which authors init.md + the full command wrapper).
//   wfl-init.js was authored in T04; init.md ships in T05. This test verifies the
//   T04/T05 boundary is respected: init.md must NOT yet be present in base-pack.
//
// Iron Law 2: this file was written BEFORE any implementation change —
// all tests fail on the pre-implementation source, proving the test is
// a genuine regression gate.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Resolve forge root (forge/forge) from this test file's location:
//   forge-engineering/forge/forge/tools/__tests__/  →  forge-engineering/forge/forge/
const FORGE_ROOT = path.join(__dirname, '..', '..');

const BASE_PACK_COMMANDS = path.join(FORGE_ROOT, 'init', 'base-pack', 'commands');
const GENERATE_COMMANDS_MD = path.join(FORGE_ROOT, 'init', 'generation', 'generate-commands.md');
const SCRIPT_PATH = path.join(FORGE_ROOT, 'tools', 'build-base-pack.cjs');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cmd-wfl-conformance-'));
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

// ─────────────────────────────────────────────────────────────────────────────
// Test 1–3: static assertion on base-pack command source files
// ─────────────────────────────────────────────────────────────────────────────

describe('base-pack command files use workflow() invocations (not Read prose)', () => {

  it("Test 1: run-task.md contains workflow('wfl:run-task'", () => {
    const content = fs.readFileSync(path.join(BASE_PACK_COMMANDS, 'run-task.md'), 'utf8');
    assert.ok(
      content.includes("workflow('wfl:run-task'"),
      "run-task.md must contain workflow('wfl:run-task' but got:\n" + content
    );
  });

  it("Test 1b: run-task.md does NOT contain Read .forge/workflows/orchestrate_task.md", () => {
    const content = fs.readFileSync(path.join(BASE_PACK_COMMANDS, 'run-task.md'), 'utf8');
    assert.ok(
      !content.includes('Read `.forge/workflows/orchestrate_task.md`'),
      "run-task.md must NOT contain 'Read `.forge/workflows/orchestrate_task.md`' but it does"
    );
  });

  it("Test 2: run-sprint.md contains workflow('wfl:run-sprint'", () => {
    const content = fs.readFileSync(path.join(BASE_PACK_COMMANDS, 'run-sprint.md'), 'utf8');
    assert.ok(
      content.includes("workflow('wfl:run-sprint'"),
      "run-sprint.md must contain workflow('wfl:run-sprint' but got:\n" + content
    );
  });

  it("Test 2b: run-sprint.md does NOT contain Read .forge/workflows/run_sprint.md", () => {
    const content = fs.readFileSync(path.join(BASE_PACK_COMMANDS, 'run-sprint.md'), 'utf8');
    assert.ok(
      !content.includes('Read `.forge/workflows/run_sprint.md`'),
      "run-sprint.md must NOT contain 'Read `.forge/workflows/run_sprint.md`' but it does"
    );
  });

  it("Test 3: fix-bug.md contains workflow('wfl:fix-bug'", () => {
    const content = fs.readFileSync(path.join(BASE_PACK_COMMANDS, 'fix-bug.md'), 'utf8');
    assert.ok(
      content.includes("workflow('wfl:fix-bug'"),
      "fix-bug.md must contain workflow('wfl:fix-bug' but got:\n" + content
    );
  });

  it("Test 3b: fix-bug.md does NOT contain Read .forge/workflows/fix_bug.md", () => {
    const content = fs.readFileSync(path.join(BASE_PACK_COMMANDS, 'fix-bug.md'), 'utf8');
    assert.ok(
      !content.includes('Read `.forge/workflows/fix_bug.md`'),
      "fix-bug.md must NOT contain 'Read `.forge/workflows/fix_bug.md`' but it does"
    );
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Test 4–5: generate-commands.md conformance-rung language
// ─────────────────────────────────────────────────────────────────────────────

describe('generate-commands.md carries the wfl: conformance rung', () => {

  it("Test 4: generate-commands.md contains 'wfl:' (conformance rung language present)", () => {
    const content = fs.readFileSync(GENERATE_COMMANDS_MD, 'utf8');
    assert.ok(
      content.includes('wfl:'),
      "generate-commands.md must contain 'wfl:' (the conformance rung) but it does not"
    );
  });

  it("Test 5: generate-commands.md contains 'Replaced non-conformant command' (upgrade-on-rebuild log phrase)", () => {
    const content = fs.readFileSync(GENERATE_COMMANDS_MD, 'utf8');
    assert.ok(
      content.includes('Replaced non-conformant command'),
      "generate-commands.md must contain 'Replaced non-conformant command' but it does not"
    );
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Test 6: real buildBasePack() generator produces wfl: invocations
// ─────────────────────────────────────────────────────────────────────────────

describe('buildBasePack() generates wfl: command bodies for the three affected commands', () => {
  let outDir;
  let mod;

  before(() => {
    outDir = tmpDir();
    // eslint-disable-next-line global-require
    mod = require(SCRIPT_PATH);
    mod.buildBasePack({ forgeRoot: FORGE_ROOT, outRoot: outDir });
  });

  after(() => {
    rmrf(outDir);
  });

  it("Test 6a: generated run-task.md contains workflow('wfl:run-task'", () => {
    const content = fs.readFileSync(path.join(outDir, 'commands', 'run-task.md'), 'utf8');
    assert.ok(
      content.includes("workflow('wfl:run-task'"),
      "generated run-task.md must contain workflow('wfl:run-task' but got:\n" + content
    );
  });

  it("Test 6b: generated run-sprint.md contains workflow('wfl:run-sprint'", () => {
    const content = fs.readFileSync(path.join(outDir, 'commands', 'run-sprint.md'), 'utf8');
    assert.ok(
      content.includes("workflow('wfl:run-sprint'"),
      "generated run-sprint.md must contain workflow('wfl:run-sprint' but got:\n" + content
    );
  });

  it("Test 6c: generated fix-bug.md contains workflow('wfl:fix-bug'", () => {
    const content = fs.readFileSync(path.join(outDir, 'commands', 'fix-bug.md'), 'utf8');
    assert.ok(
      content.includes("workflow('wfl:fix-bug'"),
      "generated fix-bug.md must contain workflow('wfl:fix-bug' but got:\n" + content
    );
  });

  it("Test 6d: generated run-task.md does NOT contain Read .forge/workflows/orchestrate_task.md", () => {
    const content = fs.readFileSync(path.join(outDir, 'commands', 'run-task.md'), 'utf8');
    assert.ok(
      !content.includes('Read `.forge/workflows/orchestrate_task.md`'),
      "generated run-task.md must NOT contain the old Read prose path"
    );
  });

  it("Test 6e: generated run-sprint.md does NOT contain Read .forge/workflows/run_sprint.md", () => {
    const content = fs.readFileSync(path.join(outDir, 'commands', 'run-sprint.md'), 'utf8');
    assert.ok(
      !content.includes('Read `.forge/workflows/run_sprint.md`'),
      "generated run-sprint.md must NOT contain the old Read prose path"
    );
  });

  it("Test 6f: generated fix-bug.md does NOT contain Read .forge/workflows/fix_bug.md", () => {
    const content = fs.readFileSync(path.join(outDir, 'commands', 'fix-bug.md'), 'utf8');
    assert.ok(
      !content.includes('Read `.forge/workflows/fix_bug.md`'),
      "generated fix-bug.md must NOT contain the old Read prose path"
    );
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Test 7: FORGE-S31-T05 — base-pack/commands/init.md presence + conformance
// init.md was authored in T05 as the project-local command wrapper that
// dispatches workflow('wfl:init'). This test asserts PRESENCE and conformance:
//   - init.md exists in base-pack/commands/
//   - contains workflow('wfl:init' dispatch
//   - frontmatter includes name: init
//   - does NOT contain $FORGE_ROOT or ${CLAUDE_PLUGIN_ROOT} in execution core
//     (base-pack commands must use vendored .forge/tools/ paths only)
// ─────────────────────────────────────────────────────────────────────────────

describe('FORGE-S31-T05 — base-pack/commands/init.md presence + wfl:init conformance', () => {

  it('Test 7: base-pack/commands/init.md EXISTS (authored by T05)', () => {
    const initMdPath = path.join(BASE_PACK_COMMANDS, 'init.md');
    assert.ok(
      fs.existsSync(initMdPath),
      'init.md not found in base-pack/commands/ — T05 must author this file.'
    );
  });

  it('Test 7b: init.md contains workflow(\'wfl:init\') dispatch', () => {
    const initMdPath = path.join(BASE_PACK_COMMANDS, 'init.md');
    if (!fs.existsSync(initMdPath)) return; // depends on Test 7
    const content = fs.readFileSync(initMdPath, 'utf8');
    assert.ok(
      content.includes("workflow('wfl:init'"),
      'base-pack/commands/init.md must contain workflow(\'wfl:init\') dispatch line.\n' +
      'The project-local wrapper must dispatch the wfl:init driver, not read sdlc-init.md.'
    );
  });

  it('Test 7c: init.md frontmatter includes "name: init"', () => {
    const initMdPath = path.join(BASE_PACK_COMMANDS, 'init.md');
    if (!fs.existsSync(initMdPath)) return; // depends on Test 7
    const content = fs.readFileSync(initMdPath, 'utf8');
    assert.ok(
      content.includes('name: init'),
      'base-pack/commands/init.md frontmatter must include "name: init".'
    );
  });

  it('Test 7d: init.md does NOT reference $FORGE_ROOT or ${CLAUDE_PLUGIN_ROOT}', () => {
    const initMdPath = path.join(BASE_PACK_COMMANDS, 'init.md');
    if (!fs.existsSync(initMdPath)) return; // depends on Test 7
    const content = fs.readFileSync(initMdPath, 'utf8');
    assert.ok(
      !content.includes('$FORGE_ROOT') && !content.includes('${CLAUDE_PLUGIN_ROOT}'),
      'base-pack/commands/init.md must NOT reference $FORGE_ROOT or ${CLAUDE_PLUGIN_ROOT}.\n' +
      'Base-pack commands are installed as project-local wrappers — use .forge/tools/ paths instead.'
    );
  });

});
