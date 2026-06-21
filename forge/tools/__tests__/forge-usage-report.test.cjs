'use strict';
// forge-usage-report.test.cjs — deterministic token accounting for Claude Code
// orchestration runs (FORGE-S38). Builds a self-contained fixture (fake project
// store + fake Workflow transcript dir) in an OS tmpdir, runs the tool, and
// asserts accurate per-event token attribution, overhead bucketing, idempotency,
// and no-op-when-already-populated.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL = path.resolve(__dirname, '..', 'forge-usage-report.cjs');

// --- fixture helpers --------------------------------------------------------

function makeEvent(eventId, role, action) {
  return {
    eventId,
    sprintId: 'bugs',
    bugId: 'CART-BUG-001',
    role,
    action,
    phase: role,
    startTimestamp: '2026-06-21T03:00:00Z',
    endTimestamp: '2026-06-21T03:01:00Z',
    durationMinutes: 1,
    model: 'claude-sonnet-4-6',
    provider: 'anthropic',
  };
}

// An assistant transcript record carrying provider usage.
function asstMsg(usage) {
  return JSON.stringify({
    type: 'assistant',
    message: { role: 'assistant', type: 'message', usage },
  });
}

// A tool_use record emitting a complete event via mcp__forge__store.
function emitComplete(eventId) {
  const eventJson = JSON.stringify({ eventId, action: 'complete', role: 'plan', sprintId: 'bugs' });
  return JSON.stringify({
    type: 'assistant',
    message: {
      role: 'assistant',
      content: [
        { type: 'tool_use', name: 'mcp__forge__store', input: { command: 'emit', args: ['bugs', eventJson] } },
      ],
    },
  });
}

function buildFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-usage-'));
  const project = path.join(root, 'project');
  const eventsDir = path.join(project, '.forge', 'store', 'events', 'bugs');
  fs.mkdirSync(eventsDir, { recursive: true });
  // Two phase events on disk, no token fields yet.
  fs.writeFileSync(path.join(eventsDir, 'evt-plan.json'), JSON.stringify(makeEvent('evt-plan', 'plan', 'complete'), null, 2));
  fs.writeFileSync(path.join(eventsDir, 'evt-commit.json'), JSON.stringify(makeEvent('evt-commit', 'commit', 'complete'), null, 2));

  // Fake workflow transcript dir.
  const wfDir = path.join(root, 'wf_test');
  fs.mkdirSync(wfDir, { recursive: true });
  // Agent 1 → evt-plan: usage across two assistant turns + a complete-emit.
  fs.writeFileSync(path.join(wfDir, 'agent-a1.jsonl'), [
    asstMsg({ input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 10, cache_creation_input_tokens: 5 }),
    asstMsg({ input_tokens: 200, output_tokens: 80, cache_read_input_tokens: 20, cache_creation_input_tokens: 0 }),
    emitComplete('evt-plan'),
  ].join('\n') + '\n');
  // Agent 2 → evt-commit.
  fs.writeFileSync(path.join(wfDir, 'agent-a2.jsonl'), [
    asstMsg({ input_tokens: 300, output_tokens: 120, cache_read_input_tokens: 0, cache_creation_input_tokens: 40 }),
    emitComplete('evt-commit'),
  ].join('\n') + '\n');
  // Agent 3 → overhead (usage but NO complete-emit).
  fs.writeFileSync(path.join(wfDir, 'agent-a3.jsonl'), [
    asstMsg({ input_tokens: 30, output_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }),
  ].join('\n') + '\n');

  return { root, project, eventsDir, wfDir };
}

function run(fx, extra = []) {
  const out = execFileSync('node', [
    TOOL,
    '--workflow-dir', fx.wfDir,
    '--project-dir', fx.project,
    '--sprint', 'bugs',
    '--json',
    ...extra,
  ], { encoding: 'utf8' });
  return JSON.parse(out);
}

function readEvent(fx, id) {
  return JSON.parse(fs.readFileSync(path.join(fx.eventsDir, `${id}.json`), 'utf8'));
}

// --- tests ------------------------------------------------------------------

test('stamps accurate per-event token fields from the transcript (--apply)', () => {
  const fx = buildFixture();
  try {
    const report = run(fx, ['--apply']);
    const plan = readEvent(fx, 'evt-plan');
    assert.equal(plan.inputTokens, 300, 'inputTokens summed across turns');
    assert.equal(plan.outputTokens, 130);
    assert.equal(plan.cacheReadTokens, 30);
    assert.equal(plan.cacheWriteTokens, 5);
    assert.equal(plan.tokenSource, 'reported', 'transcript usage is provider-reported');

    const commit = readEvent(fx, 'evt-commit');
    assert.equal(commit.inputTokens, 300);
    assert.equal(commit.cacheWriteTokens, 40);

    // Overhead bucket captures the unattributed agent's tokens.
    assert.ok(report.overhead, 'report has an overhead bucket');
    assert.equal(report.overhead.inputTokens, 30);
    assert.equal(report.attributed, 2, 'two events attributed');
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test('dry-run does not mutate events', () => {
  const fx = buildFixture();
  try {
    run(fx); // default dry-run
    const plan = readEvent(fx, 'evt-plan');
    assert.equal(plan.inputTokens, undefined, 'dry-run must not write token fields');
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test('idempotent — applying twice equals applying once', () => {
  const fx = buildFixture();
  try {
    run(fx, ['--apply']);
    const once = readEvent(fx, 'evt-plan');
    run(fx, ['--apply']);
    const twice = readEvent(fx, 'evt-plan');
    assert.deepEqual(twice, once, 're-applying must not double-count');
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test('no-op when the event already carries a tokenSource (pi-populated)', () => {
  const fx = buildFixture();
  try {
    // Pre-populate evt-plan as if pi's usage-hook already wrote it.
    const e = readEvent(fx, 'evt-plan');
    e.inputTokens = 999; e.outputTokens = 999; e.tokenSource = 'reported';
    fs.writeFileSync(path.join(fx.eventsDir, 'evt-plan.json'), JSON.stringify(e, null, 2));
    run(fx, ['--apply']);
    const after = readEvent(fx, 'evt-plan');
    assert.equal(after.inputTokens, 999, 'must not overwrite an already-populated event');
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test('written events remain schema-valid', () => {
  const fx = buildFixture();
  try {
    run(fx, ['--apply']);
    const { loadSchemas } = require('../lib/schema-loader.cjs');
    const { validateRecord } = require('../lib/validate.js');
    const schemas = loadSchemas();
    const errs = validateRecord(readEvent(fx, 'evt-plan'), schemas.event, { entity: 'event' });
    assert.equal(errs.length, 0, `event must stay schema-valid: ${errs.join('; ')}`);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});
