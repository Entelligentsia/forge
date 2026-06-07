'use strict';

// Regression test for the Workflow-harness parse contract on base-pack
// wfl-*.js drivers (init/base-pack/workflows-js/).
//
// The Workflow tool permits exactly ONE export — the leading
// `export const meta = {...}` literal. The remainder of the file is
// evaluated as the body of an async function (top-level `await` and
// `return` are valid; a second `export` such as
// `export default async function` is a SyntaxError at launch).
//
// Caught in the field: wfl-init.js shipped with an
// `export default async function wflInit(args)` wrapper and every
// /forge:init dispatch died with "Unexpected keyword 'export'".

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WFL_DIR = path.resolve(__dirname, '..', '..', 'init', 'base-pack', 'workflows-js');

const driverFiles = fs.readdirSync(WFL_DIR).filter((f) => f.startsWith('wfl-') && f.endsWith('.js'));

describe('base-pack wfl-*.js drivers parse under the Workflow harness contract', () => {
  test('driver directory is non-empty', () => {
    assert.ok(driverFiles.length >= 4, `expected >= 4 drivers, found ${driverFiles.length}`);
  });

  for (const f of driverFiles) {
    test(`${f}: starts with export const meta and has no other export`, () => {
      const src = fs.readFileSync(path.join(WFL_DIR, f), 'utf8');
      assert.ok(src.startsWith('export const meta = {'), `${f} must begin with 'export const meta = {'`);

      // Strip the meta statement (balanced-brace scan from the first '{')
      const start = src.indexOf('{');
      let depth = 0;
      let end = -1;
      for (let i = start; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') {
          depth--;
          if (depth === 0) { end = i; break; }
        }
      }
      assert.ok(end > 0, `${f}: could not find end of meta object`);
      const body = src.slice(end + 1).replace(/^\s*;?/, '');

      assert.ok(
        !/(^|\n)\s*export\s/.test(body),
        `${f} must not contain a second export statement — the harness evaluates the body as an async function body`
      );

      // Parse the body exactly the way the harness does: async function body
      // with the workflow globals in scope.
      assert.doesNotThrow(() => {
        // eslint-disable-next-line no-new-func
        new Function(
          'args', 'agent', 'parallel', 'pipeline', 'phase', 'log', 'budget', 'workflow',
          `"use strict"; return (async () => {${body}})`,
        );
      }, `${f}: body must parse as an async function body`);
    });
  }
});

// ── Workflow-API contract (forge#112) ────────────────────────────────────────
//
// The harness's API shapes that wfl-init.js violated in the field:
//   - phase(title) takes ONLY a title — a callback second arg is silently
//     discarded (the entire phase body no-ops while reporting success).
//   - parallel() takes thunks (() => agent(...)), not in-flight promises.
//   - agent(prompt, opts) — model goes in opts.model, never as first arg.

describe('wfl-*.js drivers respect the Workflow API contract (forge#112)', () => {
  for (const f of driverFiles) {
    const src = fs.readFileSync(path.join(WFL_DIR, f), 'utf8');

    test(`${f}: phase() is title-only — no callback argument`, () => {
      assert.ok(
        !/phase\(\s*['"][^'"]+['"]\s*,/.test(src),
        `${f}: phase('Title', ...) found — the harness ignores everything after the title; phase bodies must run inline`
      );
    });

    test(`${f}: parallel() receives thunks, not bare agent() promises`, () => {
      assert.ok(
        !/parallel\(\s*\[\s*agent\(/.test(src),
        `${f}: parallel([agent(...)]) found — parallel() takes thunks: parallel([() => agent(...)])`
      );
    });

    test(`${f}: agent() first arg is the prompt, not a model tier`, () => {
      assert.ok(
        !/agent\(\s*ROLE_TIER\b/.test(src),
        `${f}: agent(ROLE_TIER[...], ...) found — signature is agent(prompt, { model, ... })`
      );
    });
  }

  test('wfl-init.js: every referenced init/**.md rulebook exists in plugin source', () => {
    const src = fs.readFileSync(path.join(WFL_DIR, 'wfl-init.js'), 'utf8');
    const refs = new Set(
      (src.match(/init\/[a-z-]+\/[a-z0-9-]+\.md/g) || [])
    );
    assert.ok(refs.size > 0, 'expected wfl-init.js to reference init/**.md rulebooks');
    const initRoot = path.resolve(__dirname, '..', '..');
    for (const ref of refs) {
      assert.ok(
        fs.existsSync(path.join(initRoot, ref)),
        `wfl-init.js references ${ref} but it does not exist under forge/ — ` +
        'it would be missing from the vendored .forge/ too (build-payload bundles what exists)'
      );
    }
  });
});

// ── verify-phase.cjs CLI contract (forge#112 follow-up) ──────────────────────
//
// The tool supports --phase 1|2|3 only, and --phase 2 REQUIRES --kb-path
// (exit 2 on bad args). Driver prompts must match the real CLI.

describe('wfl-init.js verify-phase invocations match the tool CLI', () => {
  const src = fs.readFileSync(path.join(WFL_DIR, 'wfl-init.js'), 'utf8');
  const invocations = src.match(/verify-phase\.cjs[^\n`]*/g) || [];

  test('at least one verify-phase invocation exists', () => {
    assert.ok(invocations.length > 0);
  });

  test('every --phase value is 1, 2, or 3 (tool exits 2 otherwise)', () => {
    for (const inv of invocations.filter((i) => i.includes('--phase'))) {
      const m = inv.match(/--phase\s+(\d+)/);
      if (!m) continue; // prose placeholder like "--phase N"
      assert.ok(['1', '2', '3'].includes(m[1]), `verify-phase.cjs supports phases 1-3 only, found: ${inv}`);
    }
  });

  test('every --phase 2 invocation carries --kb-path (required by the tool)', () => {
    for (const inv of invocations.filter((i) => /--phase\s+2/.test(i))) {
      assert.ok(
        inv.includes('--kb-path'),
        `--phase 2 requires --kb-path <path> (tool exits 2 without it): ${inv}`
      );
    }
  });
});
