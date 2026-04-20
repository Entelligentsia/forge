'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { preflight } = require('../preflight-gate.cjs');
const { parseGates } = require('../parse-gates.cjs');

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-'));
}

describe('preflight-gate.cjs :: preflight()', () => {
  test('happy path: artifact present, state valid, predecessor approved → ok', () => {
    const dir = tmpdir();
    const planPath = path.join(dir, 'PLAN.md');
    fs.writeFileSync(planPath, 'x'.repeat(300));
    const reviewPath = path.join(dir, 'PLAN_REVIEW.md');
    fs.writeFileSync(reviewPath, '**Verdict:** Approved\n');

    const workflowMd = [
      '```gates phase=implement',
      `artifact ${dir}/PLAN.md min=200`,
      'require task.status in [plan-approved, implementing]',
      `after review-plan = approved`,
      '```',
    ].join('\n');
    const gates = parseGates(workflowMd);

    const result = preflight({
      phase: 'implement',
      gates,
      state: { task: { status: 'plan-approved' } },
      substitutions: {},
      verdictSources: { 'review-plan': reviewPath },
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.missing, []);
  });

  test('missing artifact blocks the phase', () => {
    const dir = tmpdir();
    const workflowMd = [
      '```gates phase=implement',
      `artifact ${dir}/PLAN.md min=200`,
      '```',
    ].join('\n');
    const gates = parseGates(workflowMd);
    const result = preflight({
      phase: 'implement',
      gates,
      state: {},
      substitutions: {},
    });
    assert.equal(result.ok, false);
    assert.ok(result.missing.some((m) => m.includes('PLAN.md')));
  });

  test('0-byte artifact (stub) is treated as missing when min > 0', () => {
    const dir = tmpdir();
    const stubPath = path.join(dir, 'PLAN.md');
    fs.writeFileSync(stubPath, '');
    const workflowMd = [
      '```gates phase=implement',
      `artifact ${stubPath} min=200`,
      '```',
    ].join('\n');
    const gates = parseGates(workflowMd);
    const result = preflight({ phase: 'implement', gates, state: {}, substitutions: {} });
    assert.equal(result.ok, false);
    assert.ok(result.missing.some((m) => /PLAN\.md/.test(m)));
  });

  test('forbidden state blocks: task.status == completed blocks plan phase', () => {
    const workflowMd = [
      '```gates phase=plan',
      'forbid task.status == completed',
      '```',
    ].join('\n');
    const gates = parseGates(workflowMd);
    const result = preflight({
      phase: 'plan',
      gates,
      state: { task: { status: 'completed' } },
      substitutions: {},
    });
    assert.equal(result.ok, false);
    assert.ok(result.missing.some((m) => /forbid|completed/.test(m)));
  });

  test('required state predicate: status not in allowed set blocks', () => {
    const workflowMd = [
      '```gates phase=implement',
      'require task.status in [plan-approved, implementing]',
      '```',
    ].join('\n');
    const gates = parseGates(workflowMd);
    const result = preflight({
      phase: 'implement',
      gates,
      state: { task: { status: 'draft' } },
      substitutions: {},
    });
    assert.equal(result.ok, false);
    assert.ok(result.missing.some((m) => /task\.status/.test(m)));
  });

  test('path template {sprint} / {task} substitution resolves correctly', () => {
    const dir = tmpdir();
    fs.mkdirSync(path.join(dir, 'S1'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'S1', 'T1'), { recursive: true });
    const planPath = path.join(dir, 'S1', 'T1', 'PLAN.md');
    fs.writeFileSync(planPath, 'x'.repeat(300));

    const workflowMd = [
      '```gates phase=implement',
      `artifact ${dir}/{sprint}/{task}/PLAN.md min=200`,
      '```',
    ].join('\n');
    const gates = parseGates(workflowMd);
    const result = preflight({
      phase: 'implement',
      gates,
      state: {},
      substitutions: { sprint: 'S1', task: 'T1' },
    });
    assert.equal(result.ok, true);
  });

  test('predecessor verdict not approved → blocks', () => {
    const dir = tmpdir();
    const reviewPath = path.join(dir, 'REVIEW.md');
    fs.writeFileSync(reviewPath, '**Verdict:** Revision Required\n');

    const workflowMd = [
      '```gates phase=implement',
      'after review-plan = approved',
      '```',
    ].join('\n');
    const gates = parseGates(workflowMd);
    const result = preflight({
      phase: 'implement',
      gates,
      state: {},
      substitutions: {},
      verdictSources: { 'review-plan': reviewPath },
    });
    assert.equal(result.ok, false);
    assert.ok(result.missing.some((m) => /review-plan/.test(m)));
  });

  test('predecessor verdict file missing → blocks', () => {
    const workflowMd = [
      '```gates phase=implement',
      'after review-plan = approved',
      '```',
    ].join('\n');
    const gates = parseGates(workflowMd);
    const result = preflight({
      phase: 'implement',
      gates,
      state: {},
      substitutions: {},
      verdictSources: { 'review-plan': '/nonexistent/REVIEW.md' },
    });
    assert.equal(result.ok, false);
  });

  test('unknown phase returns ok: false with explanatory missing entry', () => {
    const gates = parseGates('```gates phase=plan\nforbid task.status == completed\n```\n');
    const result = preflight({ phase: 'nonexistent', gates, state: {}, substitutions: {} });
    assert.equal(result.ok, false);
    assert.ok(result.missing.some((m) => /no gate|unknown/i.test(m)));
  });

  test('phase with no gates block (empty spec) → ok: true', () => {
    const gates = {};
    // Explicit: a phase we didn't declare gates for shouldn't silently pass.
    // Design decision: unknown phase is treated as misconfiguration (fail).
    // But a phase present with an empty spec (all lists empty) passes.
    const emptySpecGates = { plan: { artifacts: [], require: [], forbid: [], after: [] } };
    const result = preflight({ phase: 'plan', gates: emptySpecGates, state: {}, substitutions: {} });
    assert.equal(result.ok, true);
  });

  test('CLI shim exits 2 when --phase is missing', () => {
    const { spawnSync } = require('node:child_process');
    const tool = path.resolve(__dirname, '..', 'preflight-gate.cjs');
    const r = spawnSync(process.execPath, [tool, '--task', 'T1'], { encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Usage:/);
  });

  test('CLI shim exits 2 when neither --task nor --bug is given', () => {
    const { spawnSync } = require('node:child_process');
    const tool = path.resolve(__dirname, '..', 'preflight-gate.cjs');
    const r = spawnSync(process.execPath, [tool, '--phase', 'implement'], { encoding: 'utf8' });
    assert.equal(r.status, 2);
  });

  test('CLI shim finds phase gates in a non-meta-named workflow file', () => {
    const { spawnSync } = require('node:child_process');
    const tool = path.resolve(__dirname, '..', 'preflight-gate.cjs');

    const dir = tmpdir();
    const workflowsDir = path.join(dir, '.forge', 'workflows');
    fs.mkdirSync(workflowsDir, { recursive: true });
    fs.writeFileSync(path.join(workflowsDir, 'orchestrate_task.md'), [
      '# Orchestrate Task Workflow',
      '',
      '```gates phase=plan',
      'forbid task.status == completed',
      '```',
    ].join('\n'));

    const r = spawnSync(
      process.execPath,
      [tool, '--phase', 'plan', '--task', 'T1'],
      { encoding: 'utf8', cwd: dir },
    );

    // Should NOT exit 2 ("could not locate workflow file") — gate is found so exit 0 or 1
    assert.notEqual(r.status, 2, `Expected phase to be found, got: ${r.stderr}`);
  });

  test('CLI shim exits 2 when no workflow file contains the requested phase', () => {
    const { spawnSync } = require('node:child_process');
    const tool = path.resolve(__dirname, '..', 'preflight-gate.cjs');

    const dir = tmpdir();
    const workflowsDir = path.join(dir, '.forge', 'workflows');
    fs.mkdirSync(workflowsDir, { recursive: true });
    fs.writeFileSync(path.join(workflowsDir, 'orchestrate_task.md'), [
      '# Workflow',
      '',
      '```gates phase=implement',
      'forbid task.status == completed',
      '```',
    ].join('\n'));

    const r = spawnSync(
      process.execPath,
      [tool, '--phase', 'plan', '--task', 'T1'],
      { encoding: 'utf8', cwd: dir },
    );

    assert.equal(r.status, 2);
    assert.match(r.stderr, /could not locate/);
  });

  test('multiple failures are all reported, not just the first', () => {
    const dir = tmpdir();
    const workflowMd = [
      '```gates phase=implement',
      `artifact ${dir}/MISSING.md min=1`,
      'require task.status in [plan-approved]',
      '```',
    ].join('\n');
    const gates = parseGates(workflowMd);
    const result = preflight({
      phase: 'implement',
      gates,
      state: { task: { status: 'draft' } },
      substitutions: {},
    });
    assert.equal(result.ok, false);
    assert.ok(result.missing.length >= 2);
  });

  // Regression: Bug #58 — alphabetical-first gate selection uses wrong workflow's gate
  test('[regression #58] --workflow arg selects correct workflow when multiple files define same phase', () => {
    const { spawnSync } = require('node:child_process');
    const tool = path.resolve(__dirname, '..', 'preflight-gate.cjs');

    const dir = tmpdir();
    const workflowsDir = path.join(dir, '.forge', 'workflows');
    fs.mkdirSync(workflowsDir, { recursive: true });

    // aaa_wrong.md sorts alphabetically before implement_plan.md
    // Its gate requires task.status == wrong-status (will block if used)
    fs.writeFileSync(path.join(workflowsDir, 'aaa_wrong.md'), [
      '```gates phase=implement',
      'require task.status in [wrong-status]',
      '```',
    ].join('\n'));

    // implement_plan.md has no gate conditions — should pass immediately
    fs.writeFileSync(path.join(workflowsDir, 'implement_plan.md'), [
      '```gates phase=implement',
      '```',
    ].join('\n'));

    // With --workflow implement_plan.md, should use the correct (empty-gates) workflow
    // and exit 0 (no gate conditions = passes). Without the fix, aaa_wrong.md wins
    // and blocks with exit 1.
    const r = spawnSync(
      process.execPath,
      [tool, '--phase', 'implement', '--task', 'T1', '--workflow', 'implement_plan'],
      { encoding: 'utf8', cwd: dir },
    );

    assert.equal(r.status, 0, `Expected exit 0 (correct workflow selected), got ${r.status}. stderr: ${r.stderr}`);
  });

  // Regression: Bug #59 — ReferenceError: VERDICT_ARTIFACTS accessed before initialization
  test('[regression #59] implement phase with after-clause does not crash with ReferenceError', () => {
    const { spawnSync } = require('node:child_process');
    const tool = path.resolve(__dirname, '..', 'preflight-gate.cjs');

    const dir = tmpdir();
    const workflowsDir = path.join(dir, '.forge', 'workflows');
    fs.mkdirSync(workflowsDir, { recursive: true });
    fs.writeFileSync(path.join(workflowsDir, 'implement_plan.md'), [
      '```gates phase=implement',
      'after review-plan = approved',
      '```',
    ].join('\n'));

    // Create a minimal .forge/store structure with a real task record so
    // resolveVerdictSources actually iterates the afterList and accesses VERDICT_ARTIFACTS
    const storeDir = path.join(dir, '.forge', 'store', 'tasks');
    fs.mkdirSync(storeDir, { recursive: true });
    fs.writeFileSync(path.join(storeDir, 'FORGE-S11-T02.json'), JSON.stringify({
      taskId: 'FORGE-S11-T02',
      sprintId: 'FORGE-S11',
      title: 'Test task',
      status: 'plan-approved',
      path: 'engineering/sprints/FORGE-S11/FORGE-S11-T02-fix-preflight-gate',
    }));

    const r = spawnSync(
      process.execPath,
      [tool, '--phase', 'implement', '--task', 'FORGE-S11-T02'],
      { encoding: 'utf8', cwd: dir },
    );

    // Must NOT crash with a ReferenceError (that would produce a non-0/1/2 exit or
    // a 'ReferenceError' message in stderr). exit 0, 1, or 2 are all acceptable —
    // what matters is no uncaught exception.
    const hasReferenceError = r.stderr.includes('ReferenceError') || r.stderr.includes('before initialization');
    assert.ok(!hasReferenceError, `Should not crash with ReferenceError. stderr: ${r.stderr}`);
    assert.ok([0, 1, 2].includes(r.status), `Exit code should be 0, 1, or 2, got ${r.status}. stderr: ${r.stderr}`);
  });
});
