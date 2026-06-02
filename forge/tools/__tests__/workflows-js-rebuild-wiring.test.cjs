'use strict';

// workflows-js-rebuild-wiring.test.cjs — guard for FORGE-S28 workflows-js
// rebuild/update wiring.
//
// The JS orchestration workflows under .claude/workflows/ are verbatim copies
// from base-pack/workflows-js/. Before this wiring they were materialised ONLY
// at /forge:init time, with no /forge:rebuild or /forge:update regeneration
// path — so a fixed base-pack JS workflow could not be delivered to existing
// installs (see FORGE-BUG-041). These string-invariant assertions lock in the
// command-doc surface that exposes `workflows-js` as a first-class target.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const COMMANDS_DIR = path.join(__dirname, '..', '..', 'commands');
const read = (f) => fs.readFileSync(path.join(COMMANDS_DIR, f), 'utf8');

describe('workflows-js rebuild/update wiring', () => {
  it('rebuild.md declares a workflows-js category', () => {
    const s = read('rebuild.md');
    assert.ok(
      /##\s*Category:\s*`workflows-js`/.test(s),
      'rebuild.md must declare a "## Category: `workflows-js`" section'
    );
  });

  it('rebuild.md workflows-js category copies verbatim from base-pack/workflows-js', () => {
    const s = read('rebuild.md');
    assert.ok(
      s.includes('init/base-pack/workflows-js'),
      'rebuild.md workflows-js category must source from init/base-pack/workflows-js'
    );
    assert.ok(
      s.includes('.claude/workflows'),
      'rebuild.md workflows-js category must write to .claude/workflows'
    );
  });

  it('rebuild.md documents the workflows-js single-file sub-target form', () => {
    const s = read('rebuild.md');
    assert.ok(
      s.includes('workflows-js:wfl-run-task') || s.includes('workflows-js wfl-run-task'),
      'rebuild.md must document a workflows-js granular sub-target (e.g. workflows-js:wfl-run-task)'
    );
  });

  it('update.md lists workflows-js as a recognised regenerate target', () => {
    const s = read('update.md');
    // The recognised-targets sentence enumerates valid migration targets.
    const recognisedLine = s.split('\n').find((l) => l.includes('recognised targets are'));
    assert.ok(recognisedLine, 'update.md must contain the "recognised targets are" enumeration');
    assert.ok(
      recognisedLine.includes('workflows-js') ||
        /recognised targets are[\s\S]{0,200}workflows-js/.test(s),
      'update.md recognised-targets enumeration must include workflows-js'
    );
  });
});
