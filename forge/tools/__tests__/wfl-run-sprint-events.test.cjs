'use strict';
// FORGE-S28-T03 — Gap #3 (worktree isolation documented-latent) and
// Gap #4 (sprint-grain lifecycle events: sprint-start, task-dispatch, sprint-complete)
// String-invariant tests on wfl-run-sprint.js source + schema validation cases.
// Tests are intentionally string-based (no workflow execution) — the JS workflow
// runs inside the Workflow tool runtime, not under node --test.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const WFL_SRC = path.join(__dirname, '..', '..', 'init', 'base-pack', 'workflows-js', 'wfl-run-sprint.js');
const src = fs.readFileSync(WFL_SRC, 'utf8');

describe('wfl-run-sprint.js — Gap #4: sprint-grain event emissions', () => {
  test('source contains "sprint-start" event type reference (AC2)', () => {
    assert.ok(src.includes('sprint-start'),
      'Expected wfl-run-sprint.js to reference "sprint-start" event type');
  });

  test('source contains "task-dispatch" event type reference (AC3)', () => {
    assert.ok(src.includes('task-dispatch'),
      'Expected wfl-run-sprint.js to reference "task-dispatch" event type');
  });

  test('dispatchTask() emits task-dispatch agent() call before workflow("wfl:run-task") (AC3)', () => {
    // Find dispatchTask function and check that task-dispatch appears before wfl:run-task
    const dispatchStart = src.indexOf('async function dispatchTask(');
    assert.ok(dispatchStart !== -1, 'Expected dispatchTask function in source');
    const dispatchBody = src.slice(dispatchStart);
    const taskDispatchPos = dispatchBody.indexOf('task-dispatch');
    const wflRunTaskPos = dispatchBody.indexOf("workflow('wfl:run-task'");
    assert.ok(taskDispatchPos !== -1, 'Expected "task-dispatch" inside dispatchTask()');
    assert.ok(wflRunTaskPos !== -1, 'Expected workflow("wfl:run-task") call inside dispatchTask()');
    assert.ok(taskDispatchPos < wflRunTaskPos,
      `Expected task-dispatch emission (pos ${taskDispatchPos}) to appear before wfl:run-task call (pos ${wflRunTaskPos})`);
  });

  test('source contains sprint-complete event emission in collation agent (AC4)', () => {
    // The collation agent prompt should include sprint-complete emission
    const collateIdx = src.indexOf("phase('Collate')");
    assert.ok(collateIdx !== -1, 'Expected Collate phase marker in source');
    const collateBody = src.slice(collateIdx);
    assert.ok(collateBody.includes('sprint-complete'),
      'Expected "sprint-complete" in collation agent prompt area');
  });
});

describe('wfl-run-sprint.js — Gap #3: worktree isolation (documented-latent)', () => {
  test('source contains mode guard for sequential mode worktree skip (AC1)', () => {
    assert.ok(
      src.includes("mode === 'sequential'") || src.includes('mode === "sequential"'),
      'Expected sequential mode guard for worktree skip in source'
    );
  });

  test('source contains "git worktree add" draft agent call (AC1)', () => {
    assert.ok(src.includes('git worktree add'),
      'Expected "git worktree add" draft agent call in source');
  });

  test('source contains "git worktree remove" teardown agent call (AC1)', () => {
    assert.ok(src.includes('git worktree remove'),
      'Expected "git worktree remove" teardown agent call in source');
  });
});

describe('wfl-run-sprint.js — syntax check (AC7)', () => {
  test('node --check passes on wfl-run-sprint.js source', () => {
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
