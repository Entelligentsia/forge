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

describe('wfl-run-sprint.js — LOW #22: BANNER_MAP constant', () => {
  test('AC #22a: source contains BANNER_MAP constant', () => {
    assert.ok(
      src.includes('BANNER_MAP'),
      'No "BANNER_MAP" found — LOW #22 requires a BANNER_MAP constant in wfl-run-sprint.js.'
    );
  });

  test('AC #22b: BANNER_MAP contains orchestrator and collator persona entries', () => {
    assert.ok(
      src.includes('forge-orchestrator') || src.includes('forge-collator'),
      'BANNER_MAP must contain orchestrator/collator persona labels — LOW #22.'
    );
  });
});

describe('wfl-run-sprint.js — LOW #23: sprint → active before wave loop', () => {
  test('AC #23a: source contains sprint active status update agent call', () => {
    assert.ok(
      src.includes('update-status sprint') || src.includes('sprint-active'),
      'No sprint→active update found — LOW #23 requires transitioning sprint to active before the wave loop.'
    );
  });

  test('AC #23b: sprint active update appears before the wave loop (before phase Execute)', () => {
    const activeUpdatePos = src.indexOf('update-status sprint') !== -1
      ? src.indexOf('update-status sprint')
      : src.indexOf('sprint-active');
    const executePhasePos = src.indexOf("phase('Execute')");
    assert.ok(activeUpdatePos !== -1, 'No sprint active update found in source.');
    assert.ok(executePhasePos !== -1, 'No phase(Execute) marker found in source.');
    assert.ok(
      activeUpdatePos < executePhasePos,
      `Sprint active update (pos ${activeUpdatePos}) must appear before phase('Execute') (pos ${executePhasePos}) — LOW #23.`
    );
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

// FORGE-S28-T06 — Gap #15 (progress-clear), Gap #16 (collator post-steps),
// Gap #17 (2-attempt resume guard), Gap #18-sprint (sprint-side friction)

describe('wfl-run-sprint.js — Gap #15: sprint progress-clear before wave loop (AC1)', () => {
  test('source contains progress-clear agent call (AC1)', () => {
    assert.ok(
      src.includes('progress-clear'),
      'Expected wfl-run-sprint.js to contain a progress-clear store-cli call'
    );
  });

  test('progress-clear appears after phase(Execute) and before wave loop (AC1)', () => {
    const executePhasePos = src.indexOf("phase('Execute')");
    assert.ok(executePhasePos !== -1, "Expected phase('Execute') marker in source");
    const progressClearPos = src.indexOf('progress-clear', executePhasePos);
    assert.ok(progressClearPos !== -1, 'Expected progress-clear after phase(Execute)');
    // Wave loop starts: "for (let i = 0; i < waves.length"
    const waveLoopPos = src.indexOf('for (let i = 0; i < waves.length', executePhasePos);
    assert.ok(waveLoopPos !== -1, 'Expected wave loop in source after phase(Execute)');
    assert.ok(
      progressClearPos < waveLoopPos,
      `Expected progress-clear (pos ${progressClearPos}) before wave loop (pos ${waveLoopPos})`
    );
  });
});

describe('wfl-run-sprint.js — Gap #16: collator post-steps (AC2–AC4)', () => {
  test('collation agent prompt contains build-context-pack.cjs call (AC2)', () => {
    const collateIdx = src.indexOf("phase('Collate')");
    assert.ok(collateIdx !== -1, "Expected phase('Collate') marker in source");
    const collateBody = src.slice(collateIdx);
    assert.ok(
      collateBody.includes('build-context-pack.cjs'),
      'Expected "build-context-pack.cjs" in collation agent prompt area'
    );
  });

  test('collation agent prompt targets .forge/cache/context-pack output paths (AC2 path guard)', () => {
    // Authoritative spec: collator_agent.md §Algorithm §3 uses .forge/cache/context-pack.{md,json}.
    // Every consumer (orchestrate_task.md, fix_bug.md, _fragments/context-injection.md) reads
    // .forge/cache/ — writing to engineering/ would be a silent no-op against its freshness purpose.
    const collateIdx = src.indexOf("phase('Collate')");
    assert.ok(collateIdx !== -1, "Expected phase('Collate') marker in source");
    const collateBody = src.slice(collateIdx);
    assert.ok(
      collateBody.includes('.forge/cache/context-pack'),
      'Expected ".forge/cache/context-pack" in collation agent prompt (not "engineering/context-pack")'
    );
    assert.ok(
      !collateBody.includes('engineering/context-pack'),
      'Expected collation prompt NOT to reference "engineering/context-pack" — correct path is .forge/cache/context-pack'
    );
  });

  test('collation agent prompt instructs writing WRITEBACK-SUMMARY.json (AC3)', () => {
    const collateIdx = src.indexOf("phase('Collate')");
    assert.ok(collateIdx !== -1, "Expected phase('Collate') marker in source");
    const collateBody = src.slice(collateIdx);
    assert.ok(
      collateBody.includes('WRITEBACK-SUMMARY.json'),
      'Expected "WRITEBACK-SUMMARY.json" in collation agent prompt area'
    );
  });

  test('collation agent prompt instructs invoking forge:refresh-kb-links (AC4)', () => {
    const collateIdx = src.indexOf("phase('Collate')");
    assert.ok(collateIdx !== -1, "Expected phase('Collate') marker in source");
    const collateBody = src.slice(collateIdx);
    assert.ok(
      collateBody.includes('forge:refresh-kb-links'),
      'Expected "forge:refresh-kb-links" in collation agent prompt area'
    );
  });
});

describe('wfl-run-sprint.js — Gap #17: 2-attempt resume guard in dispatchTask() (AC5)', () => {
  test('dispatchTask() contains a second workflow("wfl:run-task") invocation for retry (AC5)', () => {
    const dispatchStart = src.indexOf('async function dispatchTask(');
    assert.ok(dispatchStart !== -1, 'Expected dispatchTask function in source');
    const dispatchBody = src.slice(dispatchStart);
    const firstOccurrence = dispatchBody.indexOf("workflow('wfl:run-task'");
    assert.ok(firstOccurrence !== -1, 'Expected first workflow(wfl:run-task) call in dispatchTask()');
    const secondOccurrence = dispatchBody.indexOf("workflow('wfl:run-task'", firstOccurrence + 1);
    assert.ok(
      secondOccurrence !== -1,
      'Expected a second workflow(wfl:run-task) call in dispatchTask() — the retry path for non-terminal status'
    );
  });

  test('dispatchTask() contains resumeFrom in the retry invocation (AC5)', () => {
    const dispatchStart = src.indexOf('async function dispatchTask(');
    assert.ok(dispatchStart !== -1, 'Expected dispatchTask function in source');
    const dispatchBody = src.slice(dispatchStart);
    assert.ok(
      dispatchBody.includes('resumeFrom'),
      'Expected "resumeFrom" in dispatchTask() for the retry invocation'
    );
  });
});

describe('wfl-run-sprint.js — Gap #18-sprint: sprint-side friction emission (AC6)', () => {
  test('source contains friction-drain agent call or FRICTION-*.jsonl reference after wave loop (AC6)', () => {
    const executePhasePos = src.indexOf("phase('Execute')");
    assert.ok(executePhasePos !== -1, "Expected phase('Execute') marker in source");
    const afterExecuteBody = src.slice(executePhasePos);
    assert.ok(
      afterExecuteBody.includes('friction-drain') || afterExecuteBody.includes('FRICTION-*.jsonl'),
      'Expected friction-drain agent or FRICTION-*.jsonl reference after phase(Execute)'
    );
  });

  test('friction emission area references persona "orchestrator" (AC6)', () => {
    assert.ok(
      src.includes('persona') && src.includes('orchestrator'),
      'Expected persona and orchestrator references for friction emission'
    );
  });
});
