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

  // FORGE-S31-T04: wfl-init.js is the fourth driver but is NOT a rebuild sub-target.
  // It installs via `4ge init claude .` CLI bootstrap (CLI-first bootstrap ADR,
  // doc/decisions/cli-first-bootstrap.md). Assert this boundary explicitly to
  // prevent future sprints from accidentally adding wfl-init to rebuild wiring.
  it('rebuild.md workflows-js category does NOT list wfl-init as a sub-target', () => {
    const s = read('rebuild.md');
    // Find the workflows-js category section
    const wflJsIdx = s.indexOf('Category: `workflows-js`');
    if (wflJsIdx !== -1) {
      // Extract up to the next ## heading or end of file
      const section = s.slice(wflJsIdx, s.indexOf('\n## ', wflJsIdx + 1) || s.length);
      assert.ok(
        !section.includes('wfl-init'),
        'rebuild.md workflows-js section must NOT list wfl-init — ' +
        'wfl-init.js installs via CLI bootstrap (4ge init claude .), not via /forge:rebuild'
      );
    } else {
      // If the section doesn't exist, wfl-init can't be in it — pass
      assert.ok(true, 'workflows-js category not found in rebuild.md — wfl-init cannot be listed');
    }
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
