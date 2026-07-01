'use strict';

// kb-doc-contract.test.cjs — drift-guard for the shared 10-doc KB contract
// (FORGE-S35-T01).
//
// ONE contract, three declaration sites that MUST stay byte-identical (same
// items, same order):
//   1. forge/forge/tools/verify-phase.cjs          — const ARCH_DOCS
//   2. forge/forge/init/base-pack/workflows-js/wfl-init.js  — const KB_DOC_IDS
//   3. forge-cli/.../init/run-init-types.ts        — export const KB_DOC_IDS
//
// The verify-phase gate (site 1) and both fan-out drivers (sites 2 & 3) read the
// same phase-2-discover.md table for interim paths; if these arrays disagree the
// gate and the generators drift (a widened gate mis-checks docs the fan-out
// never produced, or vice-versa). This test fails loudly on any divergence.
//
// Site 3 lives in the sibling forge-cli/ tree, which is not always reachable
// from the plugin test root (e.g. when the plugin is vendored standalone). When
// unreachable we skip-with-note; forge-cli's own typecheck/e2e covers it there.

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

// The canonical contract. Keep in lockstep with the three sites above.
const CANONICAL = [
  'architecture/stack',
  'architecture/processes',
  'architecture/routing',
  'architecture/database',
  'architecture/testing',
  'architecture/deployment',
  'architecture/entity-model',
  'architecture/stack-checklist',
  'business-domain/domain-model',
  'business-domain/domain-concepts',
];

// __dirname = <repo>/forge/forge/tools/__tests__
const TOOLS_DIR = path.join(__dirname, '..');
const FORGE_FORGE = path.join(TOOLS_DIR, '..');
const REPO_ROOT = path.join(FORGE_FORGE, '..', '..');

const VERIFY_PHASE = path.join(TOOLS_DIR, 'verify-phase.cjs');
const WFL_INIT = path.join(FORGE_FORGE, 'init', 'base-pack', 'workflows-js', 'wfl-init.js');
const RUN_INIT_TYPES = path.join(
  REPO_ROOT,
  'forge-cli', 'src', 'extensions', 'forgecli', 'orchestrators', 'init', 'run-init-types.ts'
);

/**
 * Extract a string-array literal assigned to `name` from source text.
 * Matches `const name = [ ... ]` / `export const name = [ ... ]`, captures the
 * bracket body up to the first `]`, and pulls every quoted item in order.
 */
function extractArray(src, name) {
  const re = new RegExp(`(?:export\\s+)?const\\s+${name}\\s*=\\s*\\[([^\\]]*)\\]`);
  const m = src.match(re);
  if (!m) return null;
  return [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
}

describe('KB-doc contract drift-guard', () => {
  it('verify-phase.cjs ARCH_DOCS equals the canonical 10-doc contract', () => {
    const src = fs.readFileSync(VERIFY_PHASE, 'utf8');
    const arr = extractArray(src, 'ARCH_DOCS');
    assert.ok(arr, 'could not extract ARCH_DOCS from verify-phase.cjs');
    assert.deepStrictEqual(arr, CANONICAL, 'verify-phase.cjs ARCH_DOCS drifted from the contract');
  });

  it('wfl-init.js KB_DOC_IDS equals the canonical 10-doc contract', () => {
    const src = fs.readFileSync(WFL_INIT, 'utf8');
    const arr = extractArray(src, 'KB_DOC_IDS');
    assert.ok(arr, 'could not extract KB_DOC_IDS from wfl-init.js');
    assert.deepStrictEqual(arr, CANONICAL, 'wfl-init.js KB_DOC_IDS drifted from the contract');
  });

  it('run-init-types.ts KB_DOC_IDS equals the canonical contract (skip if unreachable)', (t) => {
    if (!fs.existsSync(RUN_INIT_TYPES)) {
      t.skip('forge-cli/run-init-types.ts not reachable from this tree — covered by forge-cli typecheck/e2e');
      return;
    }
    const src = fs.readFileSync(RUN_INIT_TYPES, 'utf8');
    const arr = extractArray(src, 'KB_DOC_IDS');
    assert.ok(arr, 'could not extract KB_DOC_IDS from run-init-types.ts');
    assert.deepStrictEqual(arr, CANONICAL, 'run-init-types.ts KB_DOC_IDS drifted from the contract');
  });
});
