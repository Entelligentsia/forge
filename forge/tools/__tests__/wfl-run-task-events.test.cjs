'use strict';
// forge-engineering#39 Phase 3 — event-type discipline in the wfl-run-task JS driver.
//
// Two defect classes this locks down:
//   1. emitSkip() emitted `"iteration":0`, violating event.schema.json's
//      `iteration: minimum 1` — the skip event was silently rejected.
//   2. runPhase() emit instructions never mentioned `type`, so subagents
//      guessed — the store residue (`type:"start"`, `type:"complete"`) came
//      from copying the action value into type. The instructions must now
//      carry explicit token guidance per _fragments/event-vocabulary.md.
//
// String-invariant tests on the base-pack source, mirroring
// wfl-run-sprint-events.test.cjs / wfl-fix-bug-events.test.cjs.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const WFL_SRC = path.join(__dirname, '..', '..', 'init', 'base-pack', 'workflows-js', 'wfl-run-task.js');
const src = fs.readFileSync(WFL_SRC, 'utf8');

describe('wfl-run-task.js — event-type discipline (forge-engineering#39)', () => {

  test('no schema-violating "iteration":0 emit remains (minimum is 1)', () => {
    assert.ok(!src.includes('"iteration":0'),
      'Found "iteration":0 — event.schema.json requires iteration >= 1; the emitSkip event is silently rejected.');
  });

  test('source carries a TASK_TYPE_TOKENS map mirroring _fragments/event-vocabulary.md', () => {
    assert.ok(src.includes('TASK_TYPE_TOKENS'),
      'Expected a TASK_TYPE_TOKENS map (phase role → pass/fail type token) in wfl-run-task.js');
    for (const tok of ['task-planned', 'task-implemented', 'task-validated', 'task-approved', 'task-committed', 'review-failed']) {
      assert.ok(src.includes(`'${tok}'`) || src.includes(`"${tok}"`),
        `Expected task vocabulary token "${tok}" in the TASK_TYPE_TOKENS map`);
    }
  });

  test('runPhase emit instructions forbid a type field on the start event', () => {
    const emitIdx = src.indexOf('EMIT YOUR PHASE EVENTS');
    assert.ok(emitIdx !== -1, 'Expected EMIT YOUR PHASE EVENTS instruction block');
    const area = src.slice(emitIdx, emitIdx + 2500);
    assert.ok(/MUST NOT include a "type"/.test(area),
      'Expected the start-event instruction to forbid a "type" field (untyped start events are the contract)');
  });

  test('runPhase emit instructions forbid copying the action value into type', () => {
    const emitIdx = src.indexOf('EMIT YOUR PHASE EVENTS');
    const area = src.slice(emitIdx, emitIdx + 2500);
    assert.ok(/NEVER copy the action value/.test(area),
      'Expected an explicit "NEVER copy the action value" guard — type:"start"/"complete" residue came from exactly this');
  });

  test('runPhase emit instructions reference the event-vocabulary fragment', () => {
    const emitIdx = src.indexOf('EMIT YOUR PHASE EVENTS');
    const area = src.slice(emitIdx, emitIdx + 2500);
    assert.ok(area.includes('event-vocabulary'),
      'Expected a reference to _fragments/event-vocabulary.md in the emit instructions');
  });

  test('node --check passes on wfl-run-task.js source', () => {
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
