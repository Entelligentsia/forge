'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { preflight, resolveTaskArtifactDir } = require('../preflight-gate.cjs');
const { parseGates } = require('../parse-gates.cjs');

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-'));
}

describe('preflight-gate.cjs :: preflight()', () => {
  test('happy path: artifact present, state valid, predecessor approved → ok', () => {
    const dir = tmpdir();
    const planPath = path.join(dir, 'PLAN.md');
    fs.writeFileSync(planPath, 'x'.repeat(300));

    const workflowMd = [
      '```gates phase=implement',
      `artifact ${dir}/PLAN.md min=200`,
      'require task.status in [plan-approved, implementing]',
      `after review-plan = approved`,
      '```',
    ].join('\n');
    const gates = parseGates(workflowMd);

    // Predecessor verdict now lives in the structured store record
    // (summaries.<canonical>.verdict), not in a markdown file.
    const result = preflight({
      phase: 'implement',
      gates,
      state: {
        task: {
          status: 'plan-approved',
          summaries: { review_plan: { verdict: 'approved' } },
        },
      },
      substitutions: {},
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

  test('predecessor verdict not approved (revision) → blocks', () => {
    const workflowMd = [
      '```gates phase=implement',
      'after review-plan = approved',
      '```',
    ].join('\n');
    const gates = parseGates(workflowMd);
    const result = preflight({
      phase: 'implement',
      gates,
      state: {
        task: {
          summaries: { review_plan: { verdict: 'revision' } },
        },
      },
      substitutions: {},
    });
    assert.equal(result.ok, false);
    assert.ok(result.missing.some((m) => /review-plan.*verdict is "revision"/.test(m)));
  });

  test('predecessor verdict missing from store → blocks', () => {
    const workflowMd = [
      '```gates phase=implement',
      'after review-plan = approved',
      '```',
    ].join('\n');
    const gates = parseGates(workflowMd);
    const result = preflight({
      phase: 'implement',
      gates,
      state: { task: { status: 'planned', summaries: {} } },
      substitutions: {},
    });
    assert.equal(result.ok, false);
    assert.ok(result.missing.some((m) => /predecessor verdict missing.*review-plan/.test(m)));
  });

  test('approve phase: verdict read from task.status, not summaries', () => {
    // Regression: previously commit-phase preflight regex-parsed
    // ARCHITECT_APPROVAL.md for `**Verdict:**`, failing when the architect
    // wrote `## Approval Status: ✅ APPROVED` instead. Now the source of
    // truth is task.status === "approved" (set by approve workflow).
    const workflowMd = [
      '```gates phase=commit',
      'after approve = approved',
      '```',
    ].join('\n');
    const gates = parseGates(workflowMd);
    const result = preflight({
      phase: 'commit',
      gates,
      state: { task: { status: 'approved', summaries: {} } },
      substitutions: {},
    });
    assert.equal(result.ok, true, `expected ok, got: ${JSON.stringify(result.missing)}`);
  });

  test('approve phase: task.status !== approved → blocks commit', () => {
    const workflowMd = [
      '```gates phase=commit',
      'after approve = approved',
      '```',
    ].join('\n');
    const gates = parseGates(workflowMd);
    const result = preflight({
      phase: 'commit',
      gates,
      state: { task: { status: 'implemented', summaries: {} } },
      substitutions: {},
    });
    assert.equal(result.ok, false);
    assert.ok(result.missing.some((m) => /verdict missing.*approve/.test(m)));
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

  test('CLI shim exits 0 (no-op) when phase is gate-less (no workflow declares it)', () => {
    // Some pipeline phases are intentionally gate-less (writeback/collator
    // is a deterministic regen with no predecessor verdict). Live regression
    // from /forge:run-task HLO-S01-T01 phase 7 (writeback): preflight-gate
    // exited 2, escalating the chain. Exit 2 must be reserved for real
    // misconfiguration (bad args, parse errors), not for "phase not declared".
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
      [tool, '--phase', 'writeback', '--task', 'T1'],
      { encoding: 'utf8', cwd: dir },
    );

    assert.equal(r.status, 0, `expected exit 0 (skip), got ${r.status}: ${r.stderr}`);
    assert.match(r.stderr, /no preflight gates defined|skipping/);
  });

  test('CLI shim exits 0 (no-op) when workflow exists but declares no gate block for phase', () => {
    // Sibling case: workflow file IS loaded (e.g. by phase frontmatter match)
    // but contains no `gates phase=<role>` fence. Same semantic — gate-less
    // phase passes through.
    const { spawnSync } = require('node:child_process');
    const tool = path.resolve(__dirname, '..', 'preflight-gate.cjs');

    const dir = tmpdir();
    const workflowsDir = path.join(dir, '.forge', 'workflows');
    fs.mkdirSync(workflowsDir, { recursive: true });
    // Frontmatter declares phase: writeback but no gates fence anywhere.
    fs.writeFileSync(path.join(workflowsDir, 'collator_agent.md'), [
      '---',
      'phase: writeback',
      '---',
      '',
      '# Collator',
      '',
      'Deterministic regen. No gates needed.',
    ].join('\n'));

    const r = spawnSync(
      process.execPath,
      [tool, '--phase', 'writeback', '--task', 'T1'],
      { encoding: 'utf8', cwd: dir },
    );

    assert.equal(r.status, 0, `expected exit 0 (skip), got ${r.status}: ${r.stderr}`);
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

    // Task record with source-file path (the bug trigger). After the
    // verdict-source refactor (0.43.10), `after review-plan = approved`
    // reads structured summaries from the task record, not from markdown.
    fs.writeFileSync(path.join(configDir, 'store', 'tasks', 'FORGE-S12-T06.json'), JSON.stringify({
      taskId: 'FORGE-S12-T06',
      sprintId: 'FORGE-S12',
      title: 'Deterministic model discovery',
      status: 'plan-approved',
      path: 'forge/tools/store-cli.cjs',
      summaries: {
        review_plan: { verdict: 'approved' },
      },
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

describe('preflight-gate.cjs :: resolveTaskArtifactDir()', () => {
  function makeSprintTree(t) {
    // Returns the tmpdir; t is an object specifying dirs to create.
    // Shape: { engineering: 'engineering', sprintId, dirs: ['name1', 'name2', ...] }
    const root = tmpdir();
    const sprintDir = path.join(root, t.engineering || 'engineering', 'sprints', t.sprintId);
    fs.mkdirSync(sprintDir, { recursive: true });
    for (const name of t.dirs) fs.mkdirSync(path.join(sprintDir, name), { recursive: true });
    return root;
  }

  test('canonical: dir named "<taskId>-<slug>" matches (regression)', () => {
    const root = makeSprintTree({
      sprintId: 'FORGE-S21',
      dirs: ['FORGE-S21-T02-run-task-handler', 'README.md'],
    });
    const got = resolveTaskArtifactDir(
      { sprintId: 'FORGE-S21', taskId: 'FORGE-S21-T02' },
      'engineering',
      root,
    );
    assert.equal(got, 'FORGE-S21-T02-run-task-handler');
  });

  test('sprint-prefixed: dir named "<sprintId>-<taskId>-<slug>" matches (forge-bug fix)', () => {
    // Emberglow-style naming: bare taskId "T-C1-1", dir "S003-T-C1-1-...".
    // Pre-fix this returned null and the caller fell back to lastSegment(task.path),
    // producing the bogus path .../S003/TASK_PROMPT.md/PLAN.md.
    const root = makeSprintTree({
      sprintId: 'S003',
      dirs: ['S003-T-C1-1-register-login-as-a-public-unauthenticat', 'S003-T-C1-2-other'],
    });
    const got = resolveTaskArtifactDir(
      { sprintId: 'S003', taskId: 'T-C1-1' },
      'engineering',
      root,
    );
    assert.equal(got, 'S003-T-C1-1-register-login-as-a-public-unauthenticat');
  });

  test('sprint-prefixed: rejects unrelated dir that merely contains taskId as substring', () => {
    // "S003-T-C1-11-x" contains "T-C1-1" as a prefix but is a different task.
    // The matcher must NOT return it for taskId "T-C1-1".
    const root = makeSprintTree({
      sprintId: 'S003',
      dirs: ['S003-T-C1-11-something', 'S003-T-C1-1-real-target'],
    });
    const got = resolveTaskArtifactDir(
      { sprintId: 'S003', taskId: 'T-C1-1' },
      'engineering',
      root,
    );
    assert.equal(got, 'S003-T-C1-1-real-target');
  });

  test('sprint-prefixed: matches when dir is exactly "<sprintId>-<taskId>" (no slug)', () => {
    const root = makeSprintTree({
      sprintId: 'S003',
      dirs: ['S003-T-C1-1'],
    });
    const got = resolveTaskArtifactDir(
      { sprintId: 'S003', taskId: 'T-C1-1' },
      'engineering',
      root,
    );
    assert.equal(got, 'S003-T-C1-1');
  });

  test('canonical match preferred over sprint-prefixed when both exist', () => {
    // Pathological store where both naming conventions coexist. Canonical wins.
    const root = makeSprintTree({
      sprintId: 'S003',
      dirs: ['T-C1-1-canonical', 'S003-T-C1-1-sprint-prefixed'],
    });
    const got = resolveTaskArtifactDir(
      { sprintId: 'S003', taskId: 'T-C1-1' },
      'engineering',
      root,
    );
    assert.equal(got, 'T-C1-1-canonical');
  });

  test('returns null when no directory matches', () => {
    const root = makeSprintTree({
      sprintId: 'S003',
      dirs: ['unrelated-dir', 'another'],
    });
    const got = resolveTaskArtifactDir(
      { sprintId: 'S003', taskId: 'T-C1-1' },
      'engineering',
      root,
    );
    assert.equal(got, null);
  });

  test('returns null when sprint dir is missing entirely', () => {
    const root = tmpdir();
    const got = resolveTaskArtifactDir(
      { sprintId: 'S999', taskId: 'T-X-1' },
      'engineering',
      root,
    );
    assert.equal(got, null);
  });

  test('returns null on missing taskRecord fields', () => {
    const root = tmpdir();
    assert.equal(resolveTaskArtifactDir(null, 'engineering', root), null);
    assert.equal(resolveTaskArtifactDir({ taskId: 'X' }, 'engineering', root), null);
    assert.equal(resolveTaskArtifactDir({ sprintId: 'S' }, 'engineering', root), null);
  });

  // Regression for testbench-observed bug: sprint dir contains a directory
  // whose name is exactly `<taskId>` (no slug), e.g. `HLO-S01-T01`. Pre-fix,
  // Pass 1's `startsWith(taskId + '-')` rejected exact matches and Pass 2's
  // `sprintId + '-'` prefix didn't match either (sprintId is "S01", taskId
  // is "HLO-S01-T01"). resolveTaskArtifactDir returned null; the caller
  // then fell back to taskRecord.path (the TASK_PROMPT.md file) and built
  // bogus paths like `.../TASK_PROMPT.md/PLAN_REVIEW.md` (ENOTDIR).
  test('Pass 1 also accepts exact "<taskId>" (no slug) — testbench naming', () => {
    const root = makeSprintTree({
      sprintId: 'S01',
      dirs: ['HLO-S01-T01', 'SPRINT_PLAN.md'],
    });
    const got = resolveTaskArtifactDir(
      { sprintId: 'S01', taskId: 'HLO-S01-T01' },
      'engineering',
      root,
    );
    assert.equal(got, 'HLO-S01-T01');
  });
});