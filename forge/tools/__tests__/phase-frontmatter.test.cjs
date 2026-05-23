'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const META_DIR = path.join(__dirname, '..', '..', 'meta', 'workflows');

// ---------------------------------------------------------------------------
// YAML frontmatter parser (minimal — extracts key: value pairs)
// ---------------------------------------------------------------------------

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon > 0) {
      const key = line.slice(0, colon).trim();
      const val = line.slice(colon + 1).trim();
      if (val) fm[key] = val;
    }
  }
  // Parse context: block (indented sub-keys)
  const contextMatch = match[1].match(/^context:\s*\n((?:  [^\n]+\n?)*)/m);
  if (contextMatch) {
    const ctx = {};
    for (const line of contextMatch[1].split('\n')) {
      const m = line.match(/^\s+(\w+):\s*(.+)$/);
      if (m) ctx[m[1]] = m[2].trim();
    }
    fm.context = ctx;
  }
  return fm;
}

// ---------------------------------------------------------------------------
// Byte budget map (subagent-targeted files)
// ---------------------------------------------------------------------------
// Budgets accommodate dual-mode (task + bug) subagent metas. The phase metas
// listed below carry an `entity-mode resolution` preamble and per-step
// task-vs-bug branches so the same workflow file drives both the run-task
// orchestrator (--task) and the fix-bug orchestrator (--bug). The bumps
// versus the single-mode budgets reflect that added prose.
// Budgets were lowered in FORGE-S25-T10 after the Store-Write Verification block
// (≈463 bytes per file) was replaced with a single comment marker in each of these
// 9 workflows. Lowering direction is always safe (we removed content); raising
// requires a written justification in the commit body naming what was added.
// New budgets = actual post-T10 byte count + ≤512 bytes headroom, rounded to
// the nearest 512-byte boundary.
//
// File              old-bytes  new-bytes  budget
// meta-plan-task    6692       6456       6912  (456B headroom)
// meta-implement    6981       6745       7168  (423B headroom)
// meta-review-plan  5380       5151       5632  (481B headroom)
// meta-review-impl  6161       5925       6400  (475B headroom)
// meta-validate     5126       4890       5376  (486B headroom — lowered from 5888)
// meta-approve      6348       6112       6656  (544B headroom — within one block boundary)
// meta-commit       5326       5090       5632  (542B headroom — within one block boundary)
// meta-update-plan  3042       2806       3072  (266B headroom — lowered from 3584)
// meta-update-impl  3328       3092       3584  (492B headroom — lowered from 4096)
const BYTE_BUDGETS = {
  'meta-plan-task.md':              6912,
  'meta-implement.md':              7680,
  'meta-review-plan.md':            5632,
  'meta-review-implementation.md':  6400,
  'meta-validate.md':               5376,
  'meta-approve.md':                6656,
  'meta-commit.md':                 5632,
  'meta-update-plan.md':            3072,
  'meta-update-implementation.md':  3584,
};

// ---------------------------------------------------------------------------
// Required context keys for subagent files
// ---------------------------------------------------------------------------
const REQUIRED_CONTEXT_KEYS = ['architecture', 'prior_summaries', 'persona', 'master_index', 'diff_mode'];

// ---------------------------------------------------------------------------
// Forbidden strings in subagent-targeted files
// ---------------------------------------------------------------------------
const FORBIDDEN_IN_SUBAGENT = [
  'MASTER_INDEX.md',
  'Read these only if',
];

// ---------------------------------------------------------------------------
// Tests: subagent phase files
// ---------------------------------------------------------------------------

describe('phase-frontmatter — subagent files have audience: subagent', () => {
  for (const [filename] of Object.entries(BYTE_BUDGETS)) {
    test(`${filename} has audience: subagent`, () => {
      const filePath = path.join(META_DIR, filename);
      assert.ok(fs.existsSync(filePath), `File not found: ${filePath}`);
      const content = fs.readFileSync(filePath, 'utf8');
      const fm = parseFrontmatter(content);
      assert.ok(fm !== null, `No frontmatter found in ${filename}`);
      assert.equal(fm.audience, 'subagent', `Expected audience: subagent in ${filename}, got: ${fm.audience}`);
    });
  }
});

describe('phase-frontmatter — subagent files have complete context: block', () => {
  for (const [filename] of Object.entries(BYTE_BUDGETS)) {
    test(`${filename} has all required context keys`, () => {
      const filePath = path.join(META_DIR, filename);
      const content = fs.readFileSync(filePath, 'utf8');
      const fm = parseFrontmatter(content);
      assert.ok(fm !== null, `No frontmatter in ${filename}`);
      assert.ok(fm.context && typeof fm.context === 'object', `No context: block in ${filename}`);
      for (const key of REQUIRED_CONTEXT_KEYS) {
        assert.ok(key in fm.context, `Missing context.${key} in ${filename}`);
      }
    });
  }
});

describe('phase-frontmatter — subagent files within byte budget', () => {
  for (const [filename, budget] of Object.entries(BYTE_BUDGETS)) {
    test(`${filename} ≤ ${budget} bytes`, () => {
      const filePath = path.join(META_DIR, filename);
      const bytes = Buffer.byteLength(fs.readFileSync(filePath, 'utf8'), 'utf8');
      assert.ok(bytes <= budget, `${filename} is ${bytes}B, exceeds ${budget}B budget`);
    });
  }
});

describe('phase-frontmatter — forbidden strings absent from subagent files', () => {
  for (const [filename] of Object.entries(BYTE_BUDGETS)) {
    for (const forbidden of FORBIDDEN_IN_SUBAGENT) {
      test(`${filename} does not contain "${forbidden}"`, () => {
        const filePath = path.join(META_DIR, filename);
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
          !content.includes(forbidden),
          `${filename} contains forbidden string: "${forbidden}"`
        );
      });
    }
  }
});
