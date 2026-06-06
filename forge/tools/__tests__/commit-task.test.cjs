'use strict';
// commit-task.cjs — deterministic commit choreography (forge-engineering#40).
//
// The commit phase was the most expensive phase of the pipeline (15–31% of
// run input tokens) because an LLM re-derived deterministic choreography
// every run: staging-set discovery, boundary verification, commit, terminal
// status transition. This tool owns all of it; the LLM supplies only the
// commit message.
//
// Staging-set derivation order:
//   1. record.path artifact directory (always)
//   2. summaries.implementation.files_changed (provenance from the implement phase)
//   3. --also <path> extras (validated to stay inside the project root)
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const COMMIT_TASK = path.join(__dirname, '..', 'commit-task.cjs');

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout.trim();
}

function makeFixture({ status = 'approved', filesChanged = ['src/app.js'], withSummary = true } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-commit-task-'));
  git(tmp, ['init', '-q']);
  git(tmp, ['config', 'user.email', 'test@example.com']);
  git(tmp, ['config', 'user.name', 'Test']);

  fs.mkdirSync(path.join(tmp, '.forge', 'store', 'tasks'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '.forge', 'config.json'),
    JSON.stringify({ paths: { store: '.forge/store' } }, null, 2));

  const artDir = path.join(tmp, 'engineering', 'sprints', 'S01', 'S01-T01');
  fs.mkdirSync(artDir, { recursive: true });
  fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
  fs.writeFileSync(path.join(artDir, 'PLAN.md'), '# plan\n');
  fs.writeFileSync(path.join(tmp, 'src', 'app.js'), 'v1\n');
  git(tmp, ['add', '-A']);
  git(tmp, ['commit', '-q', '-m', 'init']);

  // Working-tree changes the task produced.
  fs.writeFileSync(path.join(tmp, 'src', 'app.js'), 'v2\n');
  fs.writeFileSync(path.join(artDir, 'ARCHITECT_APPROVAL.md'), 'approved\n');
  // An unrelated change that must NEVER be swept into the commit.
  fs.writeFileSync(path.join(tmp, 'unrelated.txt'), 'leave me\n');

  const record = {
    taskId: 'S01-T01',
    sprintId: 'S01',
    title: 'Test task',
    status,
    path: 'engineering/sprints/S01/S01-T01',
  };
  if (withSummary) {
    record.summaries = {
      implementation: {
        objective: 'Change app.js',
        written_at: '2026-06-06T10:00:00Z',
        files_changed: filesChanged,
      },
    };
  }
  fs.writeFileSync(path.join(tmp, '.forge', 'store', 'tasks', 'S01-T01.json'),
    JSON.stringify(record, null, 2));
  return tmp;
}

function run(cwd, args) {
  return spawnSync(process.execPath, [COMMIT_TASK, ...args], { cwd, encoding: 'utf8' });
}

function commitCount(cwd) {
  return Number(git(cwd, ['rev-list', '--count', 'HEAD']));
}

describe('commit-task.cjs — dry run', () => {
  test('prints the staging plan as JSON and writes nothing', () => {
    const tmp = makeFixture();
    const r = run(tmp, ['--task', 'S01-T01', '--skip-gate', '--dry-run']);
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
    const plan = JSON.parse(r.stdout);
    assert.equal(plan.dryRun, true);
    assert.ok(plan.stage.includes('engineering/sprints/S01/S01-T01'), 'plan must stage the artifact dir');
    assert.ok(plan.stage.includes('src/app.js'), 'plan must stage provenance files');
    assert.equal(commitCount(tmp), 1, 'dry-run must not commit');
    const rec = JSON.parse(fs.readFileSync(path.join(tmp, '.forge', 'store', 'tasks', 'S01-T01.json'), 'utf8'));
    assert.equal(rec.status, 'approved', 'dry-run must not transition status');
  });
});

describe('commit-task.cjs — happy path', () => {
  test('stages provenance + artifact dir, commits, transitions approved → committed', () => {
    const tmp = makeFixture();
    const r = run(tmp, ['--task', 'S01-T01', '--skip-gate', '--message', 'feat: change app (S01-T01)']);
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}\n${r.stdout}`);
    const out = JSON.parse(r.stdout);
    assert.equal(out.ok, true);
    assert.ok(out.sha, 'result must carry the commit sha');

    assert.equal(commitCount(tmp), 2, 'exactly one new commit');
    const committed = git(tmp, ['show', '--name-only', '--pretty=format:', 'HEAD']).split('\n').filter(Boolean);
    assert.ok(committed.includes('src/app.js'));
    assert.ok(committed.includes('engineering/sprints/S01/S01-T01/ARCHITECT_APPROVAL.md'));
    assert.ok(!committed.includes('unrelated.txt'), 'unrelated working-tree changes must not be swept in');

    const msg = git(tmp, ['log', '-1', '--pretty=%s']);
    assert.equal(msg, 'feat: change app (S01-T01)');

    const rec = JSON.parse(fs.readFileSync(path.join(tmp, '.forge', 'store', 'tasks', 'S01-T01.json'), 'utf8'));
    assert.equal(rec.status, 'committed', 'task must transition to committed');
  });

  test('appends the co-author trailer when --trailer is given', () => {
    const tmp = makeFixture();
    const r = run(tmp, ['--task', 'S01-T01', '--skip-gate', '--message', 'feat: x (S01-T01)',
      '--trailer', 'Co-authored-by: glm-5.1:cloud <noreply@ollama.ai>']);
    assert.equal(r.status, 0, r.stderr);
    const body = git(tmp, ['log', '-1', '--pretty=%B']);
    assert.ok(body.includes('Co-authored-by: glm-5.1:cloud <noreply@ollama.ai>'));
  });

  test('falls back to artifact dir only when no provenance exists (warn on stderr)', () => {
    const tmp = makeFixture({ withSummary: false });
    const r = run(tmp, ['--task', 'S01-T01', '--skip-gate', '--message', 'docs: artifacts (S01-T01)']);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(/no files_changed provenance/i.test(r.stderr), 'must warn about missing provenance');
    const committed = git(tmp, ['show', '--name-only', '--pretty=format:', 'HEAD']).split('\n').filter(Boolean);
    assert.ok(committed.includes('engineering/sprints/S01/S01-T01/ARCHITECT_APPROVAL.md'));
    assert.ok(!committed.includes('src/app.js'), 'source changes are NOT staged without provenance or --also');
  });

  test('--also adds extra paths to the staging set', () => {
    const tmp = makeFixture({ withSummary: false });
    const r = run(tmp, ['--task', 'S01-T01', '--skip-gate', '--message', 'feat: x (S01-T01)',
      '--also', 'src/app.js']);
    assert.equal(r.status, 0, r.stderr);
    const committed = git(tmp, ['show', '--name-only', '--pretty=format:', 'HEAD']).split('\n').filter(Boolean);
    assert.ok(committed.includes('src/app.js'));
  });
});

describe('commit-task.cjs — guards', () => {
  test('pre-existing staged changes abort (commit-boundary guard)', () => {
    const tmp = makeFixture();
    git(tmp, ['add', 'unrelated.txt']);
    const r = run(tmp, ['--task', 'S01-T01', '--skip-gate', '--message', 'feat: x (S01-T01)']);
    assert.equal(r.status, 1, 'dirty index must abort');
    assert.ok(/staged changes/i.test(r.stderr), `expected staged-changes error, got: ${r.stderr}`);
    assert.equal(commitCount(tmp), 1, 'no commit on abort');
  });

  test('wrong task status aborts; --force bypasses (operator-gated via FORGE_ALLOW_FORCE)', () => {
    const tmp = makeFixture({ status: 'implementing' });
    const r1 = run(tmp, ['--task', 'S01-T01', '--skip-gate', '--message', 'feat: x (S01-T01)']);
    assert.equal(r1.status, 1);
    assert.ok(/implementing/.test(r1.stderr), 'error must name the offending status');
    // --force passes through to store-cli update-status --force, which is
    // operator-gated behind FORGE_ALLOW_FORCE=1 — subagents must not force
    // the FSM; commit-task inherits that gate transitively (by design).
    const r2 = spawnSync(process.execPath,
      [COMMIT_TASK, '--task', 'S01-T01', '--skip-gate', '--force', '--message', 'feat: x (S01-T01)'],
      { cwd: tmp, encoding: 'utf8', env: { ...process.env, FORGE_ALLOW_FORCE: '1' } });
    assert.equal(r2.status, 0, r2.stderr);
  });

  test('missing record aborts', () => {
    const tmp = makeFixture();
    const r = run(tmp, ['--task', 'NOPE-T99', '--skip-gate', '--message', 'feat: x']);
    assert.equal(r.status, 1);
  });

  test('missing --message aborts (non-dry-run)', () => {
    const tmp = makeFixture();
    const r = run(tmp, ['--task', 'S01-T01', '--skip-gate']);
    assert.equal(r.status, 1);
    assert.ok(/--message/.test(r.stderr));
  });

  test('--also path escaping the project root aborts', () => {
    const tmp = makeFixture();
    const r = run(tmp, ['--task', 'S01-T01', '--skip-gate', '--message', 'feat: x (S01-T01)',
      '--also', '../evil.txt']);
    assert.equal(r.status, 1);
    assert.ok(/outside the project root/i.test(r.stderr));
  });

  test('without --skip-gate a failing preflight gate aborts', () => {
    // Give the fixture a commit gates block requiring an artifact that does
    // not exist — preflight-gate exits 1 and commit-task must halt.
    const tmp = makeFixture();
    fs.mkdirSync(path.join(tmp, '.forge', 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.forge', 'workflows', 'orchestrate_task.md'),
      '# stub\n\n```gates phase=commit\nartifact engineering/missing/NOPE.md\n```\n');
    const r = run(tmp, ['--task', 'S01-T01', '--message', 'feat: x (S01-T01)']);
    assert.equal(r.status, 1, `gate failure must abort, got ${r.status}: ${r.stderr}`);
    assert.ok(/gate/i.test(r.stderr), `expected gate error, got: ${r.stderr}`);
    assert.equal(commitCount(tmp), 1, 'no commit past a failed gate');
  });
});
