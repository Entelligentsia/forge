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

    fs.writeFileSync(path.join(workflowsDir, 'aaa_wrong.md'), [
      '```gates phase=implement',
      'require task.status in [wrong-status]',
      '```',
    ].join('\n'));

    fs.writeFileSync(path.join(workflowsDir, 'implement_plan.md'), [
      '```gates phase=implement',
      '```',
    ].join('\n'));

    const r = spawnSync(
      process.execPath,
      [tool, '--phase', 'implement', '--task', 'T1', '--workflow', 'implement_plan'],
      { encoding: 'utf8', cwd: dir },
    );

    assert.equal(r.status, 0, `Expected exit 0 (correct workflow selected), got ${r.status}. stderr: ${r.stderr}`);
  });

  // FORGE-S12-T02: Finalize phase gate for bug workflows — collate must produce INDEX.md
  test('[FORGE-S12-T02] finalize gate blocks when bug INDEX.md is missing (collate failed)', () => {
    const dir = tmpdir();
    const bugDir = path.join(dir, 'bugs', 'BUG-007-some-slug');
    fs.mkdirSync(bugDir, { recursive: true });

    const workflowMd = [
      '```gates phase=finalize',
      `artifact ${dir}/bugs/{bug}/INDEX.md`,
      '```',
    ].join('\n');
    const gates = parseGates(workflowMd);
    const result = preflight({
      phase: 'finalize',
      gates,
      state: { bug: { bugId: 'BUG-007', status: 'in-progress', path: 'engineering/bugs/BUG-007-some-slug' } },
      substitutions: { bug: 'BUG-007-some-slug' },
    });
    assert.equal(result.ok, false);
    assert.ok(result.missing.some(m => m.includes('INDEX.md')));
  });

  test('[FORGE-S12-T02] finalize gate passes when bug INDEX.md exists (collate succeeded)', () => {
    const dir = tmpdir();
    const bugDir = path.join(dir, 'bugs', 'BUG-007-some-slug');
    fs.mkdirSync(bugDir, { recursive: true });
    fs.writeFileSync(path.join(bugDir, 'INDEX.md'), '# Bug: Something\n');

    const workflowMd = [
      '```gates phase=finalize',
      `artifact ${dir}/bugs/{bug}/INDEX.md`,
      '```',
    ].join('\n');
    const gates = parseGates(workflowMd);
    const result = preflight({
      phase: 'finalize',
      gates,
      state: { bug: { bugId: 'BUG-007', status: 'in-progress' } },
      substitutions: { bug: 'BUG-007-some-slug' },
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.missing, []);
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

    const hasReferenceError = r.stderr.includes('ReferenceError') || r.stderr.includes('before initialization');
    assert.ok(!hasReferenceError, `Should not crash with ReferenceError. stderr: ${r.stderr}`);
    assert.ok([0, 1, 2].includes(r.status), `Exit code should be 0, 1, or 2, got ${r.status}. stderr: ${r.stderr}`);
  });

  // Regression: S12-T06 — taskDir resolves to artifact directory name, not source filename
  // When task.path is a source file (e.g. "forge/tools/store-cli.cjs"), lastSegment()
  // extracts the filename instead of the artifact directory name (e.g. "FORGE-S12-T06-model-discovery").
  // This breaks {task} substitution and resolveVerdictSources.
  test('[regression S12-T06] CLI resolves {task} to artifact directory name, not source filename', () => {
    const { spawnSync } = require('node:child_process');
    const tool = path.resolve(__dirname, '..', 'preflight-gate.cjs');

    const dir = tmpdir();

    // Create sprint directory with task artifact directory
    const sprintDir = path.join(dir, 'engineering', 'sprints', 'FORGE-S12');
    const taskArtifactDir = path.join(sprintDir, 'FORGE-S12-T06-model-discovery');
    fs.mkdirSync(taskArtifactDir, { recursive: true });
    fs.writeFileSync(path.join(taskArtifactDir, 'PLAN.md'), 'x'.repeat(200));
    fs.writeFileSync(path.join(taskArtifactDir, 'PLAN_REVIEW.md'), '**Verdict:** Approved\n');

    // Create .forge structure
    const configDir = path.join(dir, '.forge');
    fs.mkdirSync(path.join(configDir, 'workflows'), { recursive: true });
    fs.mkdirSync(path.join(configDir, 'store', 'tasks'), { recursive: true });
    fs.mkdirSync(path.join(configDir, 'store', 'sprints'), { recursive: true });

    // Config with engineering and store paths
    fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify({
      paths: { engineering: 'engineering', store: '.forge/store' },
    }));

    // Task record with source-file path (the bug trigger)
    fs.writeFileSync(path.join(configDir, 'store', 'tasks', 'FORGE-S12-T06.json'), JSON.stringify({
      taskId: 'FORGE-S12-T06',
      sprintId: 'FORGE-S12',
      title: 'Deterministic model discovery',
      status: 'plan-approved',
      path: 'forge/tools/store-cli.cjs',
    }));

    // Sprint record
    fs.writeFileSync(path.join(configDir, 'store', 'sprints', 'FORGE-S12.json'), JSON.stringify({
      sprintId: 'FORGE-S12',
      title: 'Test sprint',
      status: 'active',
      taskIds: ['FORGE-S12-T06'],
      path: 'engineering/sprints/FORGE-S12',
    }));

    // Workflow with gate using {task} substitution and after clause
    fs.writeFileSync(path.join(configDir, 'workflows', 'orchestrate_task.md'), [
      '# Orchestrate Task',
      '',
      '```gates phase=implement',
      'artifact {engineering}/sprints/{sprint}/{task}/PLAN.md min=100',
      'require task.status in [plan-approved, implementing]',
      'after review-plan = approved',
      '```',
    ].join('\n'));

    const r = spawnSync(
      process.execPath,
      [tool, '--phase', 'implement', '--task', 'FORGE-S12-T06'],
      { encoding: 'utf8', cwd: dir },
    );

    // With the bug, {task} resolves to "store-cli.cjs" (wrong),
    // causing artifact-not-found and wrong verdict source path.
    // After the fix, {task} resolves to "FORGE-S12-T06-model-discovery" (correct).
    assert.equal(r.status, 0, `Expected exit 0 (all gates pass), got ${r.status}. stderr: ${r.stderr}`);
  });
});