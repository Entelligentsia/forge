'use strict';
// Test: preflight-gate workflow selection disambiguation (forge#72)
// Tests that loadWorkflowMarkdown selects the correct workflow file when
// multiple files define the same phase, using placeholder-key filtering.
// Iron Law 2: this test file is committed BEFORE the fix is implemented.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TOOL = path.resolve(__dirname, '..', 'preflight-gate.cjs');

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-wf-sel-'));
}

function makeWorkflowsDir(base) {
  const dir = path.join(base, '.forge', 'workflows');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// fix_bug.md uses {bug} substitution; orchestrate_task.md uses {task} substitution.
// These are the shared phases (implement, review-plan, approve, commit).
function writeFakeWorkflows(workflowsDir) {
  fs.writeFileSync(path.join(workflowsDir, 'fix_bug.md'), [
    '# Fix Bug Workflow',
    '',
    '```gates phase=plan-fix',
    'artifact bugs/{bug}/BUG_FIX_PLAN.md min=100',
    '```',
    '',
    '```gates phase=review-plan',
    'artifact bugs/{bug}/BUG_FIX_PLAN.md min=100',
    '```',
    '',
    '```gates phase=implement',
    'artifact bugs/{bug}/BUG_FIX_PLAN.md min=100',
    'after review-plan = approved',
    '```',
    '',
    '```gates phase=approve',
    'after review-plan = approved',
    '```',
    '',
    '```gates phase=commit',
    'after approve = approved',
    '```',
  ].join('\n'));

  fs.writeFileSync(path.join(workflowsDir, 'orchestrate_task.md'), [
    '# Orchestrate Task Workflow',
    '',
    '```gates phase=review-plan',
    'artifact sprints/{sprint}/{task}/PLAN.md min=100',
    '```',
    '',
    '```gates phase=implement',
    'artifact sprints/{sprint}/{task}/PLAN.md min=100',
    'after review-plan = approved',
    '```',
    '',
    '```gates phase=approve',
    'after review-plan = approved',
    '```',
    '',
    '```gates phase=commit',
    'after approve = approved',
    '```',
  ].join('\n'));
}

describe('preflight-gate: workflow selection disambiguation (forge#72)', () => {
  // Test 1: --phase review-plan --task FORGE-S13-T11 (no --bug supplied)
  // Should select orchestrate_task.md (task sub present), NOT fix_bug.md (bug sub absent).
  // With current (unfixed) code: fix_bug.md wins (alphabetical first match).
  // With fix: fix_bug.md is rejected (uses {bug} which is not in substitutions).
  test('review-plan + task sub selects orchestrate_task.md, not fix_bug.md', () => {
    const base = makeTmpDir();
    const workflowsDir = makeWorkflowsDir(base);
    writeFakeWorkflows(workflowsDir);

    // Create a fake plan artifact so the gate itself can pass
    const sprintDir = path.join(base, 'sprints', 'FORGE-S13', 'FORGE-S13-T11-foo');
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(path.join(sprintDir, 'PLAN.md'), 'x'.repeat(200));

    // Create a fake store so getTask works (minimal stub)
    const storeDir = path.join(base, '.forge', 'store');
    const tasksDir = path.join(storeDir, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(path.join(tasksDir, 'FORGE-S13-T11.json'), JSON.stringify({
      taskId: 'FORGE-S13-T11',
      sprintId: 'FORGE-S13',
      status: 'planning',
      path: 'sprints/FORGE-S13/FORGE-S13-T11-foo',
    }));
    // Stub COLLATION_STATE
    fs.writeFileSync(path.join(storeDir, 'COLLATION_STATE.json'), JSON.stringify({
      sprints: {}, tasks: {}, bugs: {},
    }));

    const r = spawnSync(
      process.execPath,
      [TOOL, '--phase', 'review-plan', '--task', 'FORGE-S13-T11'],
      { encoding: 'utf8', cwd: base },
    );

    // With the fix: should NOT exit 2 (gate definition not found).
    // It may exit 1 (gate failed — artifact missing from path) but must NOT
    // fail with "artifact missing: sprints/.../BUG_FIX_PLAN.md" (fix_bug path).
    assert.notEqual(r.status, 2, `Gate definition not found (fix_bug.md shadowing) — stderr: ${r.stderr}`);
    // The error (if any) must reference {task} artifacts, not {bug} artifacts
    assert.ok(
      !r.stderr.includes('BUG_FIX_PLAN.md'),
      `fix_bug.md artifact path leaked into error: ${r.stderr}`,
    );
  });

  // Test 2: --phase plan-fix --bug BUG-007 selects fix_bug.md
  // (only fix_bug.md defines this phase — no ambiguity)
  test('plan-fix + bug sub selects fix_bug.md (only file with that phase)', () => {
    const base = makeTmpDir();
    const workflowsDir = makeWorkflowsDir(base);
    writeFakeWorkflows(workflowsDir);

    const storeDir = path.join(base, '.forge', 'store');
    const bugsDir = path.join(storeDir, 'bugs');
    fs.mkdirSync(bugsDir, { recursive: true });
    fs.writeFileSync(path.join(bugsDir, 'BUG-007.json'), JSON.stringify({
      bugId: 'BUG-007',
      status: 'open',
      path: 'bugs/BUG-007-broken-foo',
    }));
    fs.writeFileSync(path.join(storeDir, 'COLLATION_STATE.json'), JSON.stringify({
      sprints: {}, tasks: {}, bugs: {},
    }));

    const r = spawnSync(
      process.execPath,
      [TOOL, '--phase', 'plan-fix', '--bug', 'BUG-007'],
      { encoding: 'utf8', cwd: base },
    );

    // Should not exit 2 (gate definition should be found in fix_bug.md)
    assert.notEqual(r.status, 2,
      `plan-fix phase should be found in fix_bug.md — stderr: ${r.stderr}`);
  });

  // Test 3: --phase review-plan --bug BUG-007 selects fix_bug.md
  // ({bug} substitution present → fix_bug.md passes placeholder filter)
  test('review-plan + bug sub selects fix_bug.md (bug placeholder satisfied)', () => {
    const base = makeTmpDir();
    const workflowsDir = makeWorkflowsDir(base);
    writeFakeWorkflows(workflowsDir);

    const storeDir = path.join(base, '.forge', 'store');
    const bugsDir = path.join(storeDir, 'bugs');
    fs.mkdirSync(bugsDir, { recursive: true });
    fs.writeFileSync(path.join(storeDir, 'COLLATION_STATE.json'), JSON.stringify({
      sprints: {}, tasks: {}, bugs: {},
    }));

    const bugDir = path.join(base, 'bugs', 'BUG-007-broken-foo');
    fs.mkdirSync(bugDir, { recursive: true });
    fs.writeFileSync(path.join(bugDir, 'BUG_FIX_PLAN.md'), 'x'.repeat(200));
    fs.writeFileSync(path.join(bugsDir, 'BUG-007.json'), JSON.stringify({
      bugId: 'BUG-007',
      status: 'open',
      path: 'bugs/BUG-007-broken-foo',
    }));

    const r = spawnSync(
      process.execPath,
      [TOOL, '--phase', 'review-plan', '--bug', 'BUG-007'],
      { encoding: 'utf8', cwd: base },
    );

    // Should find fix_bug.md's gate definition and NOT exit 2
    assert.notEqual(r.status, 2,
      `review-plan with bug sub should find fix_bug.md gate — stderr: ${r.stderr}`);
    // Must NOT reference task artifacts in the error
    assert.ok(
      !r.stderr.includes('PLAN.md') || r.stderr.includes('BUG_FIX_PLAN'),
      `Should use fix_bug.md artifact paths, not orchestrate_task.md — stderr: ${r.stderr}`,
    );
  });

  // Test 4: --workflow orchestrate_task flag still wins even when fix_bug.md comes first alphabetically
  // (explicit --workflow flag has highest priority — regression guard for existing test #58 behaviour)
  test('explicit --workflow orchestrate_task wins over fix_bug.md for shared phase', () => {
    const base = makeTmpDir();
    const workflowsDir = makeWorkflowsDir(base);
    writeFakeWorkflows(workflowsDir);

    const storeDir = path.join(base, '.forge', 'store');
    const tasksDir = path.join(storeDir, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(path.join(tasksDir, 'FORGE-S13-T11.json'), JSON.stringify({
      taskId: 'FORGE-S13-T11',
      sprintId: 'FORGE-S13',
      status: 'implementing',
      path: 'sprints/FORGE-S13/FORGE-S13-T11-foo',
    }));
    fs.writeFileSync(path.join(storeDir, 'COLLATION_STATE.json'), JSON.stringify({
      sprints: {}, tasks: {}, bugs: {},
    }));

    const r = spawnSync(
      process.execPath,
      [TOOL, '--phase', 'implement', '--task', 'FORGE-S13-T11', '--workflow', 'orchestrate_task'],
      { encoding: 'utf8', cwd: base },
    );

    // Should not exit 2 (gate definition should be found via --workflow flag)
    // The explicit --workflow flag must still take priority over any filter
    assert.notEqual(r.status, 2,
      `--workflow orchestrate_task should find implement gate — stderr: ${r.stderr}`);
    // Must NOT reference bug artifacts
    assert.ok(
      !r.stderr.includes('BUG_FIX_PLAN.md'),
      `explicit --workflow should not fall back to fix_bug.md — stderr: ${r.stderr}`,
    );
  });
});
