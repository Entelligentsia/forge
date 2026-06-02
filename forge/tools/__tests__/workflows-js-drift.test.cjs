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
