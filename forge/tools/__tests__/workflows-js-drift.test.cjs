'use strict';

// workflows-js-drift.test.cjs — drift guard for FORGE-S28-T01
//
// Asserts that each file in forge/forge/init/base-pack/workflows-js/ is
// byte-identical (after CRLF normalisation) to its generated counterpart in
// .claude/workflows/.
//
// Contract:
//   - Before generator wiring: both files already exist and should match.
//   - After any edit to the generated copy (instead of the base-pack source):
//     this test FAILS — that is the intended regression-guard behaviour.
//   - After generator re-runs (forge:rebuild): generated copies are
//     re-derived from base-pack, so the test stays green.
//
// When run from this file's location (forge/forge/tools/__tests__/) the repo
// root is four levels up — but we anchor to the dogfooding project root via
// the .forge/config.json paths lookup so the test works from any cwd.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Resolve repo root: this test lives at
//   forge-engineering/forge/forge/tools/__tests__/
// __dirname is:  <repo>/forge/forge/tools/__tests__
// repo root is:  <repo> = __dirname/../../../..  (4 levels up)
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

// Base-pack source directory (canonical source-of-truth)
const BASE_PACK_JS = path.join(
  __dirname, '..', '..', 'init', 'base-pack', 'workflows-js'
);

// Generated output directory (dogfooding project's .claude/workflows/)
const GENERATED_DIR = path.join(REPO_ROOT, '.claude', 'workflows');

// The three JS workflow files covered by the drift guard
// (wfl-fix-bug.js was authored in T04 and is already present in both
//  base-pack/workflows-js/ and .claude/workflows/ — drift-coverage-only addition)
const JS_WORKFLOWS = [
  'wfl-run-task.js',
  'wfl-run-sprint.js',
  'wfl-fix-bug.js',
];

/**
 * Normalise content for byte-identity comparison:
 *   1. CRLF → LF
 *   2. Trailing whitespace per line removed
 *   3. Final newline normalised
 */
function normalise(content) {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n+$/, '\n');
}

describe('workflows-js drift guard — base-pack source matches generated copy', () => {
  for (const filename of JS_WORKFLOWS) {
    const srcPath = path.join(BASE_PACK_JS, filename);
    const genPath = path.join(GENERATED_DIR, filename);

    it(`${filename}: base-pack source exists`, () => {
      assert.ok(
        fs.existsSync(srcPath),
        `Base-pack source missing: ${srcPath}\n` +
        'Create it by copying from .claude/workflows/ — this is the canonical source-of-truth.'
      );
    });

    it(`${filename}: generated copy exists in .claude/workflows/`, () => {
      assert.ok(
        fs.existsSync(genPath),
        `Generated copy missing: ${genPath}\n` +
        'Run /forge:rebuild (or substitute-placeholders.cjs) to regenerate.'
      );
    });

    it(`${filename}: base-pack source is byte-identical to generated copy (normalised)`, () => {
      // Skip with a clear message if either file is missing (prior tests cover existence)
      if (!fs.existsSync(srcPath) || !fs.existsSync(genPath)) {
        // Use assert.fail to surface a clear message rather than a cryptic read error
        assert.fail(
          `Cannot compare — one or both files missing. ` +
          `src=${fs.existsSync(srcPath)} gen=${fs.existsSync(genPath)}`
        );
      }
      const srcContent = normalise(fs.readFileSync(srcPath, 'utf8'));
      const genContent = normalise(fs.readFileSync(genPath, 'utf8'));
      assert.equal(
        srcContent,
        genContent,
        `DRIFT DETECTED in ${filename}.\n` +
        'The generated copy (.claude/workflows/) has diverged from the base-pack source.\n' +
        'Fix: edit forge/forge/init/base-pack/workflows-js/' + filename + ' and re-run /forge:rebuild.\n' +
        'NEVER edit .claude/workflows/ directly — it is regenerated on every rebuild.'
      );
    });
  }
});

// Regression guard for the wfl-fix-bug.js meta defect (shipped in v1.2.0): the
// driver used `desc:`/`steps:` instead of `description:`/`phases:`, so the
// Workflow runtime rejected it ("meta.description must be a non-empty string")
// and the named-workflow registry silently skipped it — /forge:fix-bug could
// never launch wfl:fix-bug. Every JS workflow's meta MUST expose the runtime
// contract: name, a non-empty description, and a phases array.
describe('workflows-js meta contract — each driver is launchable by the Workflow runtime', () => {
  function metaBlock(content) {
    const start = content.indexOf('export const meta');
    assert.ok(start !== -1, 'no `export const meta` block found');
    // Capture up to the first `};` or `}` that closes the object literal.
    const rest = content.slice(start);
    const end = rest.search(/\n}\s*;?\s*\n/);
    return end === -1 ? rest : rest.slice(0, end);
  }

  for (const filename of JS_WORKFLOWS) {
    const srcPath = path.join(BASE_PACK_JS, filename);

    it(`${filename}: meta has name + non-empty description + phases (not desc/steps)`, () => {
      const block = metaBlock(fs.readFileSync(srcPath, 'utf8'));
      assert.match(block, /\bname:\s*'wfl:[a-z-]+'/, `${filename}: meta.name must be a 'wfl:*' string`);
      assert.match(block, /\bdescription:\s*'[^']/, `${filename}: meta.description must be a non-empty string (the Workflow runtime rejects a missing/empty description)`);
      assert.match(block, /\bphases:\s*\[/, `${filename}: meta.phases must be an array (drives the progress display)`);
      assert.doesNotMatch(block, /^\s*desc:/m, `${filename}: use 'description:' not 'desc:' — the runtime requires meta.description`);
      assert.doesNotMatch(block, /^\s*steps:/m, `${filename}: use 'phases:' not 'steps:' — the runtime renders meta.phases`);
    });
  }
});
