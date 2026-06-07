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
