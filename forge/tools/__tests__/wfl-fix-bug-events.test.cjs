'use strict';
// forge-engineering#39 — bug-skipped event emission in the wfl-fix-bug JS driver.
// The legacy pre-loop skip emit was triple-broken against event.schema.json:
//   1. type "bug_skipped" — not in the enum (kebab "bug-skipped" is canonical)
//   2. missing required fields eventId / model / provider
//   3. undeclared "reason" key (additionalProperties: false) — must be "notes"
// String-invariant tests on the base-pack source, mirroring
// wfl-run-sprint-events.test.cjs (the workflow runs inside the Workflow tool
// runtime, not under node --test).
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const WFL_SRC = path.join(__dirname, '..', '..', 'init', 'base-pack', 'workflows-js', 'wfl-fix-bug.js');
const src = fs.readFileSync(WFL_SRC, 'utf8');

describe('wfl-fix-bug.js — bug-skipped emission (forge-engineering#39)', () => {

  test('source does not reference the schema-rejected underscore token bug_skipped', () => {
    assert.ok(!src.includes('bug_skipped'),
      'Expected no "bug_skipped" in wfl-fix-bug.js — canonical token is "bug-skipped" per _fragments/event-vocabulary.md');
  });

  test('source emits the canonical bug-skipped event type', () => {
    assert.ok(src.includes('"type":"bug-skipped"'),
      'Expected \'"type":"bug-skipped"\' emit in wfl-fix-bug.js');
  });

  test('skip emit carries required schema fields eventId, model, provider', () => {
    const emitPos = src.indexOf('"type":"bug-skipped"');
    assert.ok(emitPos !== -1, 'Expected bug-skipped emit in source');
    const emitArea = src.slice(Math.max(0, emitPos - 400), emitPos + 600);
    for (const key of ['"eventId"', '"model"', '"provider"']) {
      assert.ok(emitArea.includes(key),
        `Expected ${key} in the bug-skipped emit JSON (top-level required by event.schema.json)`);
    }
  });

  test('skip emit uses declared "notes" key, not undeclared "reason"', () => {
    const emitPos = src.indexOf('"type":"bug-skipped"');
    assert.ok(emitPos !== -1, 'Expected bug-skipped emit in source');
    const emitArea = src.slice(Math.max(0, emitPos - 400), emitPos + 600);
    assert.ok(!emitArea.includes('"reason"'),
      'Expected no "reason" key in bug-skipped emit — event.schema.json has additionalProperties:false; use "notes"');
    assert.ok(emitArea.includes('"notes"'),
      'Expected "notes" key carrying the skip reason in the bug-skipped emit');
  });

  test('source carries a BUG_TYPE_TOKENS map mirroring _fragments/event-vocabulary.md', () => {
    assert.ok(src.includes('BUG_TYPE_TOKENS'),
      'Expected a BUG_TYPE_TOKENS map (phase role → pass/fail type token) in wfl-fix-bug.js');
    for (const tok of ['bug-triaged', 'fix-planned', 'fix-approved', 'fix-revision-requested', 'bug-committed', 'bug-commit-failed']) {
      assert.ok(src.includes(`'${tok}'`) || src.includes(`"${tok}"`),
        `Expected bug vocabulary token "${tok}" in the BUG_TYPE_TOKENS map`);
    }
  });

  test('runBugPhase emit instructions forbid a type field on the start event and action-value copying', () => {
    const emitIdx = src.indexOf('EMIT YOUR PHASE EVENTS');
    assert.ok(emitIdx !== -1, 'Expected EMIT YOUR PHASE EVENTS instruction block');
    const area = src.slice(emitIdx, emitIdx + 2500);
    assert.ok(/MUST NOT include a "type"/.test(area),
      'Expected the start-event instruction to forbid a "type" field — type:"start" store residue came from this gap');
    assert.ok(/NEVER copy the action value/.test(area),
      'Expected an explicit "NEVER copy the action value" guard in the emit instructions');
    assert.ok(area.includes('event-vocabulary'),
      'Expected a reference to _fragments/event-vocabulary.md in the emit instructions');
  });

  test('node --check passes on wfl-fix-bug.js source', () => {
    let output = '';
    let threw = false;
    try {
      output = execFileSync('node', ['--check', WFL_SRC], { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
    } catch (e) {
      threw = true;
      output = (e.stdout?.toString() || '') + (e.stderr?.toString() || '') || String(e);
    }
    assert.ok(!threw, `node --check failed:\n${output}`);
  });

});
