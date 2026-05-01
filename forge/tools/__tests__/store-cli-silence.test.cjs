'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const STORE_CLI = path.join(__dirname, '..', 'store-cli.cjs');

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeStore() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-silence-'));
  const storeBase = path.join(tmpDir, '.forge', 'store');
  fs.mkdirSync(path.join(storeBase, 'tasks'), { recursive: true });
  fs.mkdirSync(path.join(storeBase, 'bugs'), { recursive: true });
  fs.mkdirSync(path.join(storeBase, 'events', 'SPRINT-01'), { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, '.forge', 'config.json'),
    JSON.stringify({ paths: { store: '.forge/store' } }, null, 2)
  );
  return tmpDir;
}

function run(cwd, args) {
  return spawnSync(process.execPath, [STORE_CLI, ...args], { cwd, encoding: 'utf8' });
}

const MINIMAL_TASK = {
  taskId: 'TEST-T01', sprintId: 'SPRINT-01', title: 'Silence test task',
  status: 'implementing', path: 'eng/t01',
};
const MINIMAL_BUG = {
  bugId: 'TEST-BUG-001', title: 'Silence test bug', severity: 'minor',
  status: 'in-progress', path: 'eng/bugs/TEST-BUG-001',
  reportedAt: '2026-05-01T10:00:00.000Z',
};
const VALID_SUMMARY = {
  objective: 'Test summary', written_at: '2026-05-01T10:00:00Z',
  verdict: 'n/a', artifact_ref: 'PROGRESS.md',
};
const MINIMAL_EVENT = {
  eventId: 'EV-001', taskId: 'TEST-T01', sprintId: 'SPRINT-01',
  role: 'implement', action: 'complete', phase: 'implement',
  iteration: 1,
  startTimestamp: '2026-05-01T10:00:00.000Z',
  endTimestamp: '2026-05-01T10:05:00.000Z',
  durationMinutes: 5, model: 'claude-sonnet-4-6',
};

// ---------------------------------------------------------------------------
// Helper: write entity fixture file directly (bypasses CLI for setup)
// ---------------------------------------------------------------------------
function seedTask(tmpDir, data) {
  fs.writeFileSync(
    path.join(tmpDir, '.forge', 'store', 'tasks', `${data.taskId}.json`),
    JSON.stringify(data, null, 2)
  );
}
function seedBug(tmpDir, data) {
  fs.writeFileSync(
    path.join(tmpDir, '.forge', 'store', 'bugs', `${data.bugId}.json`),
    JSON.stringify(data, null, 2)
  );
}

// ---------------------------------------------------------------------------
// Block C: success-path stdout must be empty
// ---------------------------------------------------------------------------

describe('store-cli-silence — write command', () => {
  test('write task: stdout empty on success', () => {
    const tmpDir = makeStore();
    try {
      const r = run(tmpDir, ['write', 'task', JSON.stringify(MINIMAL_TASK)]);
      assert.equal(r.status, 0, `exit non-zero: ${r.stderr}`);
      assert.equal(r.stdout, '', `stdout should be empty, got: ${r.stdout}`);
      assert.equal(r.stderr, '');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('write task: --verbose outputs JSON echo', () => {
    const tmpDir = makeStore();
    try {
      const r = run(tmpDir, ['write', 'task', JSON.stringify(MINIMAL_TASK), '--verbose']);
      assert.equal(r.status, 0, `exit non-zero: ${r.stderr}`);
      assert.ok(r.stdout.trim().length > 0, 'stdout should have JSON with --verbose');
      const parsed = JSON.parse(r.stdout.trim());
      assert.equal(parsed.ok, true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('store-cli-silence — update-status command', () => {
  test('update-status: stdout empty on success', () => {
    const tmpDir = makeStore();
    try {
      seedTask(tmpDir, MINIMAL_TASK);
      const r = run(tmpDir, ['update-status', 'task', 'TEST-T01', 'status', 'implemented']);
      assert.equal(r.status, 0, `exit non-zero: ${r.stderr}`);
      assert.equal(r.stdout, '', `stdout should be empty, got: ${r.stdout}`);
      assert.equal(r.stderr, '');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('update-status: --verbose outputs JSON echo', () => {
    const tmpDir = makeStore();
    try {
      seedTask(tmpDir, MINIMAL_TASK);
      const r = run(tmpDir, ['update-status', 'task', 'TEST-T01', 'status', 'implemented', '--verbose']);
      assert.equal(r.status, 0, `exit non-zero: ${r.stderr}`);
      assert.ok(r.stdout.trim().length > 0, 'stdout should have JSON with --verbose');
      const parsed = JSON.parse(r.stdout.trim());
      assert.equal(parsed.ok, true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('store-cli-silence — emit command', () => {
  test('emit full event: stdout empty on success', () => {
    const tmpDir = makeStore();
    try {
      const r = run(tmpDir, ['emit', 'SPRINT-01', JSON.stringify(MINIMAL_EVENT)]);
      assert.equal(r.status, 0, `exit non-zero: ${r.stderr}`);
      assert.equal(r.stdout, '', `stdout should be empty, got: ${r.stdout}`);
      assert.equal(r.stderr, '');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('emit --sidecar: stdout empty on success', () => {
    const tmpDir = makeStore();
    try {
      const r = run(tmpDir, ['emit', 'SPRINT-01', JSON.stringify({ eventId: 'SC-001', inputTokens: 100 }), '--sidecar']);
      assert.equal(r.status, 0, `exit non-zero: ${r.stderr}`);
      assert.equal(r.stdout, '', `stdout should be empty, got: ${r.stdout}`);
      assert.equal(r.stderr, '');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('emit full event: --verbose outputs JSON echo', () => {
    const tmpDir = makeStore();
    try {
      const ev2 = { ...MINIMAL_EVENT, eventId: 'EV-002' };
      const r = run(tmpDir, ['emit', 'SPRINT-01', JSON.stringify(ev2), '--verbose']);
      assert.equal(r.status, 0, `exit non-zero: ${r.stderr}`);
      assert.ok(r.stdout.trim().length > 0, 'stdout should have JSON with --verbose');
      const parsed = JSON.parse(r.stdout.trim());
      assert.equal(parsed.ok, true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('store-cli-silence — merge-sidecar command', () => {
  test('merge-sidecar: stdout empty on success', () => {
    const tmpDir = makeStore();
    try {
      const eventsDir = path.join(tmpDir, '.forge', 'store', 'events', 'SPRINT-01');
      // Write canonical event
      fs.writeFileSync(path.join(eventsDir, 'EV-MERGE.json'), JSON.stringify(MINIMAL_EVENT));
      // Write sidecar
      fs.writeFileSync(path.join(eventsDir, '_EV-MERGE_usage.json'), JSON.stringify({ eventId: 'EV-MERGE', inputTokens: 500 }));
      const r = run(tmpDir, ['merge-sidecar', 'SPRINT-01', 'EV-MERGE']);
      assert.equal(r.status, 0, `exit non-zero: ${r.stderr}`);
      assert.equal(r.stdout, '', `stdout should be empty, got: ${r.stdout}`);
      assert.equal(r.stderr, '');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('merge-sidecar: --verbose outputs JSON echo', () => {
    const tmpDir = makeStore();
    try {
      const eventsDir = path.join(tmpDir, '.forge', 'store', 'events', 'SPRINT-01');
      const ev = { ...MINIMAL_EVENT, eventId: 'EV-MERGE2' };
      fs.writeFileSync(path.join(eventsDir, 'EV-MERGE2.json'), JSON.stringify(ev));
      fs.writeFileSync(path.join(eventsDir, '_EV-MERGE2_usage.json'), JSON.stringify({ eventId: 'EV-MERGE2', inputTokens: 600 }));
      const r = run(tmpDir, ['merge-sidecar', 'SPRINT-01', 'EV-MERGE2', '--verbose']);
      assert.equal(r.status, 0, `exit non-zero: ${r.stderr}`);
      assert.ok(r.stdout.trim().length > 0, 'stdout should have JSON with --verbose');
      const parsed = JSON.parse(r.stdout.trim());
      assert.equal(parsed.ok, true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('store-cli-silence — progress command', () => {
  test('progress: stdout empty on success', () => {
    const tmpDir = makeStore();
    try {
      const r = run(tmpDir, ['progress', 'SPRINT-01', 'test-agent-1', 'forge', 'start', 'Starting test']);
      assert.equal(r.status, 0, `exit non-zero: ${r.stderr}`);
      assert.equal(r.stdout, '', `stdout should be empty, got: ${r.stdout}`);
      assert.equal(r.stderr, '');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('progress: --verbose outputs human-readable line', () => {
    const tmpDir = makeStore();
    try {
      const r = run(tmpDir, ['progress', 'SPRINT-01', 'test-agent-1', 'forge', 'start', 'Starting', '--verbose']);
      assert.equal(r.status, 0, `exit non-zero: ${r.stderr}`);
      assert.ok(r.stdout.trim().length > 0, 'stdout should have output with --verbose');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('store-cli-silence — progress-clear command', () => {
  test('progress-clear: stdout empty on success', () => {
    const tmpDir = makeStore();
    try {
      const r = run(tmpDir, ['progress-clear', 'SPRINT-01']);
      assert.equal(r.status, 0, `exit non-zero: ${r.stderr}`);
      assert.equal(r.stdout, '', `stdout should be empty, got: ${r.stdout}`);
      assert.equal(r.stderr, '');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('progress-clear: --verbose outputs confirmation', () => {
    const tmpDir = makeStore();
    try {
      const r = run(tmpDir, ['progress-clear', 'SPRINT-01', '--verbose']);
      assert.equal(r.status, 0, `exit non-zero: ${r.stderr}`);
      assert.ok(r.stdout.trim().length > 0, 'stdout should have output with --verbose');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('store-cli-silence — set-summary command', () => {
  test('set-summary (task): stdout empty on success', () => {
    const tmpDir = makeStore();
    const summaryFile = path.join(tmpDir, 'summary.json');
    try {
      seedTask(tmpDir, MINIMAL_TASK);
      fs.writeFileSync(summaryFile, JSON.stringify(VALID_SUMMARY));
      const r = run(tmpDir, ['set-summary', 'TEST-T01', 'plan', summaryFile]);
      assert.equal(r.status, 0, `exit non-zero: ${r.stderr}`);
      assert.equal(r.stdout, '', `stdout should be empty, got: ${r.stdout}`);
      assert.equal(r.stderr, '');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('set-summary: --verbose outputs JSON echo', () => {
    const tmpDir = makeStore();
    const summaryFile = path.join(tmpDir, 'summary.json');
    try {
      seedTask(tmpDir, MINIMAL_TASK);
      fs.writeFileSync(summaryFile, JSON.stringify(VALID_SUMMARY));
      const r = run(tmpDir, ['set-summary', 'TEST-T01', 'plan', summaryFile, '--verbose']);
      assert.equal(r.status, 0, `exit non-zero: ${r.stderr}`);
      assert.ok(r.stdout.trim().length > 0, 'stdout should have JSON with --verbose');
      const parsed = JSON.parse(r.stdout.trim());
      assert.equal(parsed.ok, true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('store-cli-silence — set-bug-summary command', () => {
  test('set-bug-summary: stdout empty on success', () => {
    const tmpDir = makeStore();
    const summaryFile = path.join(tmpDir, 'bug-summary.json');
    try {
      seedBug(tmpDir, MINIMAL_BUG);
      fs.writeFileSync(summaryFile, JSON.stringify(VALID_SUMMARY));
      const r = run(tmpDir, ['set-bug-summary', 'TEST-BUG-001', 'plan', summaryFile]);
      assert.equal(r.status, 0, `exit non-zero: ${r.stderr}`);
      assert.equal(r.stdout, '', `stdout should be empty, got: ${r.stdout}`);
      assert.equal(r.stderr, '');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('set-bug-summary: --verbose outputs JSON echo', () => {
    const tmpDir = makeStore();
    const summaryFile = path.join(tmpDir, 'bug-summary.json');
    try {
      seedBug(tmpDir, MINIMAL_BUG);
      fs.writeFileSync(summaryFile, JSON.stringify(VALID_SUMMARY));
      const r = run(tmpDir, ['set-bug-summary', 'TEST-BUG-001', 'plan', summaryFile, '--verbose']);
      assert.equal(r.status, 0, `exit non-zero: ${r.stderr}`);
      assert.ok(r.stdout.trim().length > 0, 'stdout should have JSON with --verbose');
      const parsed = JSON.parse(r.stdout.trim());
      assert.equal(parsed.ok, true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
