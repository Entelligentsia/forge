'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const META_DIR = path.join(__dirname, '..', '..', 'meta', 'workflows');
const BASE_PACK_DIR = path.join(__dirname, '..', '..', 'init', 'base-pack', 'workflows');

// Pairs: [meta source filename, base-pack filename]
const ORCHESTRATOR_PAIRS = [
  ['meta-orchestrate.md', 'orchestrate_task.md'],
  ['meta-fix-bug.md',     'fix_bug.md'],
];

// Key body markers that MUST be present in the base-pack copy
// (pulled verbatim from what T01_6 wired into the meta sources)
const REQUIRED_MARKERS = {
  'orchestrate_task.md': [
    '# --- Materialize project overlay (replaces MASTER_INDEX.md read in subagent) ---',
    'build-overlay.cjs',
    'overlay_md',
  ],
  'fix_bug.md': [
    '# --- Materialize project overlay (replaces MASTER_INDEX.md read in subagent) ---',
    'build-overlay.cjs',
    'bug_overlay_md',
  ],
};

// Stale strings that must NOT appear in the base-pack copies
const FORBIDDEN_STRINGS = [
  'Also read `engineering/MASTER_INDEX.md`',
];

describe('orchestrator-base-pack-parity — base-pack copies carry build-overlay materialization', () => {
  for (const [_metaFile, basePackFile] of ORCHESTRATOR_PAIRS) {
    describe(basePackFile, () => {
      const basePackPath = path.join(BASE_PACK_DIR, basePackFile);

      test('file exists', () => {
        assert.ok(fs.existsSync(basePackPath), `Base-pack file not found: ${basePackPath}`);
      });

      for (const marker of REQUIRED_MARKERS[basePackFile]) {
        test(`contains required marker: ${marker.slice(0, 60)}`, () => {
          const content = fs.readFileSync(basePackPath, 'utf8');
          assert.ok(
            content.includes(marker),
            `${basePackFile} is missing required marker:\n  ${marker}`
          );
        });
      }

      for (const forbidden of FORBIDDEN_STRINGS) {
        test(`does not contain stale string: ${forbidden}`, () => {
          const content = fs.readFileSync(basePackPath, 'utf8');
          assert.ok(
            !content.includes(forbidden),
            `${basePackFile} still contains stale string:\n  ${forbidden}`
          );
        });
      }
    });
  }
});

describe('orchestrator-base-pack-parity — base-pack copies have audience: orchestrator-only frontmatter', () => {
  for (const [_metaFile, basePackFile] of ORCHESTRATOR_PAIRS) {
    test(`${basePackFile} has audience: orchestrator-only`, () => {
      const basePackPath = path.join(BASE_PACK_DIR, basePackFile);
      const content = fs.readFileSync(basePackPath, 'utf8');
      assert.ok(
        content.includes('audience: orchestrator-only'),
        `${basePackFile} is missing audience: orchestrator-only frontmatter`
      );
    });
  }
});

describe('orchestrator-base-pack-parity — meta source and base-pack share key algorithm markers', () => {
  for (const [metaFile, basePackFile] of ORCHESTRATOR_PAIRS) {
    test(`${basePackFile} shares build-overlay marker with ${metaFile}`, () => {
      const metaContent = fs.readFileSync(path.join(META_DIR, metaFile), 'utf8');
      const basePackContent = fs.readFileSync(path.join(BASE_PACK_DIR, basePackFile), 'utf8');

      assert.ok(
        metaContent.includes('build-overlay.cjs'),
        `Meta source ${metaFile} does not contain build-overlay.cjs — check meta source integrity`
      );
      assert.ok(
        basePackContent.includes('build-overlay.cjs'),
        `Base-pack ${basePackFile} does not contain build-overlay.cjs — base-pack is out of sync with meta source`
      );
    });
  }
});
