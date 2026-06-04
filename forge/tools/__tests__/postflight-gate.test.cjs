'use strict';
// postflight-gate.test.cjs — tests for the postflight exit guard (FORGE-S26-T19).
// Tests written BEFORE postflight-gate.cjs exists (test-first discipline).
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

let tmpDir;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'postflight-gate-test-'));
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// Helper: write a workflow markdown with an outputs block
function writeWorkflow(dir, phase, directives) {
  const workflowsDir = path.join(dir, '.forge', 'workflows');
  fs.mkdirSync(workflowsDir, { recursive: true });
  const md = [
    '---',
    'audience: subagent',
    '---',
    '',
    '# Test Workflow',
    '',
    `\`\`\`outputs phase=${phase}`,
    ...directives,
    '```',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(workflowsDir, 'plan_task.md'), md, 'utf8');
  return md;
}

// Helper: write a minimal .forge/config.json
function writeConfig(dir) {
  const forgeDir = path.join(dir, '.forge');
  fs.mkdirSync(forgeDir, { recursive: true });
  fs.writeFileSync(
    path.join(forgeDir, 'config.json'),
    JSON.stringify({ paths: { engineering: 'engineering', store: '.forge/store' } }),
    'utf8',
  );
}

// Helper: write a minimal task store record
function writeTaskRecord(dir, taskId, overrides = {}) {
  const storeDir = path.join(dir, '.forge', 'store', 'tasks');
  fs.mkdirSync(storeDir, { recursive: true });
  const record = {
    taskId,
    sprintId: 'FORGE-S99',
    status: 'implementing',
    path: `engineering/sprints/FORGE-S99/${taskId}`,
    ...overrides,
  };
  fs.writeFileSync(path.join(storeDir, `${taskId}.json`), JSON.stringify(record), 'utf8');
}

const POSTFLIGHT_GATE = path.resolve(__dirname, '../postflight-gate.cjs');

describe('postflight-gate.cjs :: postflight()', () => {
  test('output-missing: artifact file does not exist', () => {
    const { postflight } = require(POSTFLIGHT_GATE);
    const outputs = {
      plan: {
        artifacts: [{ path: path.join(tmpDir, 'nonexistent-artifact.md'), minBytes: 0 }],
        require: [],
      },
    };
    const result = postflight({ phase: 'plan', outputs, substitutions: {} });
    assert.equal(result.ok, false);
    assert.ok(result.missing.length > 0, 'expected at least one missing item');
    assert.ok(result.reasonCode === 'output-missing', `expected output-missing, got ${result.reasonCode}`);
  });

  test('output-stub: artifact exists but below min=', () => {
    const { postflight } = require(POSTFLIGHT_GATE);
    const smallFile = path.join(tmpDir, 'small.md');
    fs.writeFileSync(smallFile, 'x', 'utf8');
    const outputs = {
      implement: {
        artifacts: [{ path: smallFile, minBytes: 1000 }],
        require: [],
      },
    };
    const result = postflight({ phase: 'implement', outputs, substitutions: {} });
    assert.equal(result.ok, false);
    assert.ok(result.reasonCode === 'output-stub', `expected output-stub, got ${result.reasonCode}`);
    assert.ok(result.detail.includes('stub') || result.detail.includes('small') || result.detail.includes('bytes'),
      `expected stub/size info in detail, got: ${result.detail}`);
  });

  test('pass: artifact meets min= and require predicate', () => {
    const { postflight } = require(POSTFLIGHT_GATE);
    const goodFile = path.join(tmpDir, 'good.md');
    fs.writeFileSync(goodFile, 'x'.repeat(500), 'utf8');
    const outputs = {
      plan: {
        artifacts: [{ path: goodFile, minBytes: 200 }],
        require: [],
      },
    };
    const result = postflight({ phase: 'plan', outputs, substitutions: {} });
    assert.equal(result.ok, true);
    assert.equal(result.missing.length, 0);
  });

  test('multiple failures → single object with combined detail', () => {
    const { postflight } = require(POSTFLIGHT_GATE);
    const outputs = {
      plan: {
        artifacts: [
          { path: path.join(tmpDir, 'missing-a.md'), minBytes: 0 },
          { path: path.join(tmpDir, 'missing-b.md'), minBytes: 0 },
        ],
        require: [],
      },
    };
    const result = postflight({ phase: 'plan', outputs, substitutions: {} });
    assert.equal(result.ok, false);
    assert.ok(result.missing.length >= 2, 'expected at least 2 missing items');
    // detail should mention both failures
    assert.ok(result.detail.includes('missing-a') || result.detail.includes('output-missing'),
      'expected detail to mention failed artifacts');
  });

  test('require predicate fails → reasonCode: require-failed', () => {
    const { postflight } = require(POSTFLIGHT_GATE);
    const outputs = {
      plan: {
        artifacts: [],
        require: [{ field: 'task.status', op: '==', value: 'plan-approved' }],
      },
    };
    // state has wrong status
    const state = { task: { status: 'implementing' } };
    const result = postflight({ phase: 'plan', outputs, state, substitutions: {} });
    assert.equal(result.ok, false);
    assert.equal(result.reasonCode, 'require-failed');
  });

  test('CLI exit 1 on output-missing, stdout is valid JSON', () => {
    const testDir = path.join(tmpDir, 'cli-test-missing');
    writeConfig(testDir);
    writeTaskRecord(testDir, 'FORGE-S99-T01');
    // Write a workflow with outputs block for plan phase
    writeWorkflow(testDir, 'plan', [
      'artifact engineering/sprints/FORGE-S99/FORGE-S99-T01/PLAN.md min=100',
    ]);
    // The artifact doesn't exist → should exit 1

    const result = spawnSync('node', [POSTFLIGHT_GATE, '--phase', 'plan', '--task', 'FORGE-S99-T01'], {
      cwd: testDir,
      encoding: 'utf8',
    });
    assert.equal(result.status, 1, `expected exit 1, got ${result.status}; stderr: ${result.stderr}`);
    // stdout should be valid JSON
    const stdout = result.stdout.trim();
    assert.ok(stdout.length > 0, 'expected JSON on stdout');
    let parsed;
    assert.doesNotThrow(() => { parsed = JSON.parse(stdout); }, 'expected valid JSON on stdout');
    assert.ok(parsed.reasonCode, 'expected reasonCode in JSON output');
    assert.ok(parsed.phase, 'expected phase in JSON output');
    assert.ok(parsed.detail, 'expected detail in JSON output');
  });

  test('CLI exit 0 when all outputs satisfied', () => {
    const testDir = path.join(tmpDir, 'cli-test-pass');
    writeConfig(testDir);
    writeTaskRecord(testDir, 'FORGE-S99-T02');
    // Create the artifact directory and file
    const artifactDir = path.join(testDir, 'engineering', 'sprints', 'FORGE-S99', 'FORGE-S99-T02');
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(path.join(artifactDir, 'PLAN.md'), 'x'.repeat(300), 'utf8');
    // Write workflow with outputs block
    writeWorkflow(testDir, 'plan', [
      'artifact engineering/sprints/FORGE-S99/FORGE-S99-T02/PLAN.md min=100',
    ]);
    // Use plan_task.md workflow
    const result = spawnSync('node', [POSTFLIGHT_GATE, '--phase', 'plan', '--task', 'FORGE-S99-T02'], {
      cwd: testDir,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, `expected exit 0, got ${result.status}; stderr: ${result.stderr}; stdout: ${result.stdout}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CART-S03-T01 false-halt regression (first live firing of the S26-T19 guards
// after the v1.2.16 base-pack recompile activated them):
//   1. The materialized outputs blocks use BARE field paths
//      (`require summaries.plan.verdict == n/a`) while the CLI passes
//      state={task:record} — readField walked from state, got undefined,
//      and every require predicate failed unconditionally.
//   2. Substitutions resolved {engineering}/{sprint}/{task} to
//      engineering/<sprintId>/<taskId> — missing the `sprints/` segment —
//      so every artifact check reported output-missing despite the artifact
//      existing at the canonical path.
// ─────────────────────────────────────────────────────────────────────────────

describe('postflight-gate.cjs :: real workflow shapes (CART-S03-T01 regression)', () => {
  test('bare summaries.* require paths resolve against the task record', () => {
    const { postflight } = require(POSTFLIGHT_GATE);
    const outputs = {
      plan: {
        artifacts: [],
        require: [{ field: 'summaries.plan.verdict', op: '==', value: 'n/a' }],
      },
    };
    const state = { task: { summaries: { plan: { verdict: 'n/a' } } } };
    const result = postflight({ phase: 'plan', outputs, state, substitutions: {} });
    assert.equal(result.ok, true,
      `bare summaries path must resolve via the task record; got: ${result.detail}`);
  });

  test('task.-prefixed require paths keep working (backward compat)', () => {
    const { postflight } = require(POSTFLIGHT_GATE);
    const outputs = {
      plan: {
        artifacts: [],
        require: [{ field: 'task.status', op: '==', value: 'planned' }],
      },
    };
    const result = postflight({
      phase: 'plan', outputs,
      state: { task: { status: 'planned' } },
      substitutions: {},
    });
    assert.equal(result.ok, true);
  });

  test('buildSubstitutions: task record resolves {sprint} to sprints/<sprintId>', () => {
    const { buildSubstitutions } = require(POSTFLIGHT_GATE);
    const subs = buildSubstitutions({
      taskRecord: { sprintId: 'CART-S03' },
      engineeringRoot: 'engineering',
      entityId: 'CART-S03-T01',
    });
    assert.equal(subs.engineering, 'engineering');
    assert.equal(subs.sprint, 'sprints/CART-S03');
    assert.equal(subs.task, 'CART-S03-T01');
  });

  test('canonical template resolves to the real artifact location', () => {
    const { postflight, buildSubstitutions } = require(POSTFLIGHT_GATE);
    const artifactDir = path.join(tmpDir, 'engineering', 'sprints', 'CART-S03', 'CART-S03-T01');
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(path.join(artifactDir, 'PLAN.md'), 'x'.repeat(300), 'utf8');
    const subs = buildSubstitutions({
      taskRecord: { sprintId: 'CART-S03' },
      engineeringRoot: path.join(tmpDir, 'engineering'),
      entityId: 'CART-S03-T01',
    });
    const outputs = {
      plan: {
        artifacts: [{ path: '{engineering}/{sprint}/{task}/PLAN.md', minBytes: 200 }],
        require: [],
      },
    };
    const result = postflight({ phase: 'plan', outputs, state: {}, substitutions: subs });
    assert.equal(result.ok, true, `expected artifact found; got: ${result.detail}`);
  });

  test('buildSubstitutions: bug record (no sprintId) resolves {sprint} to bugs segment', () => {
    const { buildSubstitutions } = require(POSTFLIGHT_GATE);
    const subs = buildSubstitutions({
      taskRecord: { bugId: 'CART-BUG-001' },
      engineeringRoot: 'engineering',
      entityId: 'CART-BUG-001',
    });
    // bug artifacts live at <engineering>/bugs/<bugId> — {sprint} maps to 'bugs'
    assert.equal(subs.sprint, 'bugs');
    assert.equal(subs.task, 'CART-BUG-001');
  });
});
