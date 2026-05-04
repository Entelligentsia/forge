'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const BUILD_OVERLAY = path.join(__dirname, '..', 'build-overlay.cjs');
const SCHEMA_PATH = path.join(__dirname, '..', '..', 'schemas', 'project-overlay.schema.json');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeOverlayFixture({ withTask = true, withBug = false, withSiblings = false } = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-overlay-'));
  const storeBase = path.join(tmpDir, '.forge', 'store');
  fs.mkdirSync(path.join(storeBase, 'tasks'), { recursive: true });
  fs.mkdirSync(path.join(storeBase, 'bugs'), { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, '.forge', 'config.json'),
    JSON.stringify({
      paths: {
        store: '.forge/store',
        engineering: 'engineering',
        forgeRoot: 'forge/forge',
      },
      commands: { test: 'node --test', lint: 'node --check' },
    }, null, 2)
  );

  // Write a synthetic MASTER_INDEX.md with rows for this task
  const indexLines = [
    '# MASTER_INDEX',
    '',
    '## Sprints',
    '| Sprint | Title | Status |',
    '|--------|-------|--------|',
    '| TEST-S01 | Test Sprint | active |',
    '| OTHER-S02 | Other Sprint | completed |',
    '',
    '## Tasks',
    '| Task | Sprint | Title | Status |',
    '|------|--------|-------|--------|',
    '| TEST-S01-T01 | TEST-S01 | Build overlay tool | implementing |',
    '| TEST-S01-T02 | TEST-S01 | Add tests | draft |',
    '| OTHER-S02-T01 | OTHER-S02 | Unrelated task | committed |',
    '',
    '## Bugs',
    '| Bug | Title | Status |',
    '|-----|-------|--------|',
    '| TEST-BUG-001 | Example bug | in-progress |',
  ];
  fs.mkdirSync(path.join(tmpDir, 'engineering'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'engineering', 'MASTER_INDEX.md'), indexLines.join('\n'));

  if (withTask) {
    const taskRecord = {
      taskId: 'TEST-S01-T01',
      sprintId: 'TEST-S01',
      title: 'Build overlay tool',
      status: 'implementing',
      path: 'engineering/sprints/TEST-S01/TEST-S01-T01_build-overlay',
      summaries: {
        plan: {
          objective: 'Design the overlay contract',
          key_changes: ['Created schema'],
          verdict: 'n/a',
          written_at: '2026-05-01T10:00:00Z',
        },
      },
    };
    fs.writeFileSync(
      path.join(storeBase, 'tasks', 'TEST-S01-T01.json'),
      JSON.stringify(taskRecord, null, 2)
    );
  }

  if (withSiblings) {
    // Sibling task in same sprint, NOT in MASTER_INDEX — verifies store is the source of truth
    fs.writeFileSync(
      path.join(storeBase, 'tasks', 'TEST-S01-T03.json'),
      JSON.stringify({
        taskId: 'TEST-S01-T03',
        sprintId: 'TEST-S01',
        title: 'Sibling not in master index',
        status: 'planned',
        path: 'engineering/sprints/TEST-S01/TEST-S01-T03',
      }, null, 2)
    );
    // Unrelated task in a different sprint — must NOT appear in slice
    fs.writeFileSync(
      path.join(storeBase, 'tasks', 'OTHER-S02-T01.json'),
      JSON.stringify({
        taskId: 'OTHER-S02-T01',
        sprintId: 'OTHER-S02',
        title: 'Unrelated task',
        status: 'committed',
        path: 'engineering/sprints/OTHER-S02/OTHER-S02-T01',
      }, null, 2)
    );
  }

  if (withBug) {
    const bugRecord = {
      bugId: 'TEST-BUG-001',
      title: 'Example bug',
      severity: 'minor',
      status: 'in-progress',
      path: 'engineering/bugs/TEST-BUG-001-example-bug',
      reportedAt: '2026-05-01T08:00:00.000Z',
    };
    fs.writeFileSync(
      path.join(storeBase, 'bugs', 'TEST-BUG-001.json'),
      JSON.stringify(bugRecord, null, 2)
    );
  }

  return tmpDir;
}

function run(cwd, args) {
  return spawnSync(process.execPath, [BUILD_OVERLAY, ...args], { cwd, encoding: 'utf8' });
}

// ---------------------------------------------------------------------------
// Schema validation helper (minimal — no ajv, just required-field check)
// ---------------------------------------------------------------------------
function validateOverlay(obj) {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const errors = [];
  for (const req of schema.required || []) {
    if (obj[req] === undefined) errors.push(`missing required: ${req}`);
  }
  for (const key of Object.keys(obj)) {
    if (!schema.properties[key]) errors.push(`undeclared field: ${key}`);
  }
  if (obj.indexSlice && obj.indexSlice.length > 800) {
    errors.push(`indexSlice exceeds 800 chars: ${obj.indexSlice.length}`);
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('build-overlay.cjs — task variant', () => {
  test('exits 0 for known task', () => {
    const tmpDir = makeOverlayFixture({ withTask: true });
    try {
      const r = run(tmpDir, ['--task', 'TEST-S01-T01']);
      assert.equal(r.status, 0, `exit non-zero: stderr=${r.stderr}, stdout=${r.stdout}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('output is valid JSON', () => {
    const tmpDir = makeOverlayFixture({ withTask: true });
    try {
      const r = run(tmpDir, ['--task', 'TEST-S01-T01']);
      assert.equal(r.status, 0, r.stderr);
      const obj = JSON.parse(r.stdout);
      assert.ok(typeof obj === 'object', 'output should be an object');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('output validates against project-overlay.schema.json', () => {
    const tmpDir = makeOverlayFixture({ withTask: true });
    try {
      const r = run(tmpDir, ['--task', 'TEST-S01-T01']);
      assert.equal(r.status, 0, r.stderr);
      const obj = JSON.parse(r.stdout);
      const errors = validateOverlay(obj);
      assert.deepEqual(errors, [], `schema errors: ${errors.join(', ')}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('output is ≤ 1kB', () => {
    const tmpDir = makeOverlayFixture({ withTask: true });
    try {
      const r = run(tmpDir, ['--task', 'TEST-S01-T01']);
      assert.equal(r.status, 0, r.stderr);
      const bytes = Buffer.byteLength(r.stdout.trim(), 'utf8');
      assert.ok(bytes <= 1024, `output size ${bytes}B exceeds 1kB`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('indexSlice contains the task row but not unrelated tasks', () => {
    const tmpDir = makeOverlayFixture({ withTask: true });
    try {
      const r = run(tmpDir, ['--task', 'TEST-S01-T01']);
      assert.equal(r.status, 0, r.stderr);
      const obj = JSON.parse(r.stdout);
      assert.ok(obj.indexSlice.includes('TEST-S01-T01'), 'indexSlice should contain the task row');
      assert.ok(!obj.indexSlice.includes('OTHER-S02-T01'), 'indexSlice should not contain unrelated tasks');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('indexSlice ≤ 800 chars', () => {
    const tmpDir = makeOverlayFixture({ withTask: true });
    try {
      const r = run(tmpDir, ['--task', 'TEST-S01-T01']);
      assert.equal(r.status, 0, r.stderr);
      const obj = JSON.parse(r.stdout);
      assert.ok(obj.indexSlice.length <= 800, `indexSlice length ${obj.indexSlice.length} exceeds 800`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('taskId and sprintId are populated from task record', () => {
    const tmpDir = makeOverlayFixture({ withTask: true });
    try {
      const r = run(tmpDir, ['--task', 'TEST-S01-T01']);
      assert.equal(r.status, 0, r.stderr);
      const obj = JSON.parse(r.stdout);
      assert.equal(obj.taskId, 'TEST-S01-T01');
      assert.equal(obj.sprintId, 'TEST-S01');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('indexSlice is built from store records, not MASTER_INDEX', () => {
    // Sibling TEST-S01-T03 is in store but NOT in MASTER_INDEX; it must appear in slice.
    const tmpDir = makeOverlayFixture({ withTask: true, withSiblings: true });
    try {
      const r = run(tmpDir, ['--task', 'TEST-S01-T01']);
      assert.equal(r.status, 0, r.stderr);
      const obj = JSON.parse(r.stdout);
      assert.ok(obj.indexSlice.includes('TEST-S01-T01'), 'slice must include the target task');
      assert.ok(obj.indexSlice.includes('TEST-S01-T03'), 'slice must include sibling from store (not MASTER_INDEX)');
      assert.ok(!obj.indexSlice.includes('OTHER-S02-T01'), 'slice must not include tasks from other sprints');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('indexSlice survives when MASTER_INDEX is missing — store is sufficient', () => {
    const tmpDir = makeOverlayFixture({ withTask: true, withSiblings: true });
    try {
      fs.unlinkSync(path.join(tmpDir, 'engineering', 'MASTER_INDEX.md'));
      const r = run(tmpDir, ['--task', 'TEST-S01-T01']);
      assert.equal(r.status, 0, `exit non-zero: stderr=${r.stderr}`);
      const obj = JSON.parse(r.stdout);
      assert.ok(obj.indexSlice.includes('TEST-S01-T01'), 'slice should still contain the target task');
      assert.ok(obj.indexSlice.includes('TEST-S01-T03'), 'slice should still contain sibling from store');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('lastPhaseSummary contains delta from last completed phase', () => {
    const tmpDir = makeOverlayFixture({ withTask: true });
    try {
      const r = run(tmpDir, ['--task', 'TEST-S01-T01']);
      assert.equal(r.status, 0, r.stderr);
      const obj = JSON.parse(r.stdout);
      assert.ok(obj.lastPhaseSummary, 'lastPhaseSummary should be present');
      assert.ok(obj.lastPhaseSummary.phase, 'lastPhaseSummary should have phase field');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('build-overlay.cjs — bug variant', () => {
  test('--bug flag produces bug-scoped overlay', () => {
    const tmpDir = makeOverlayFixture({ withBug: true });
    try {
      const r = run(tmpDir, ['--bug', 'TEST-BUG-001']);
      assert.equal(r.status, 0, `exit non-zero: stderr=${r.stderr}`);
      const obj = JSON.parse(r.stdout);
      const errors = validateOverlay(obj);
      assert.deepEqual(errors, [], `schema errors: ${errors.join(', ')}`);
      assert.equal(obj.bugId, 'TEST-BUG-001');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('build-overlay.cjs — --format md', () => {
  test('--format md produces non-empty markdown output', () => {
    const tmpDir = makeOverlayFixture({ withTask: true });
    try {
      const r = run(tmpDir, ['--task', 'TEST-S01-T01', '--format', 'md']);
      assert.equal(r.status, 0, `exit non-zero: stderr=${r.stderr}`);
      assert.ok(r.stdout.trim().length > 0, 'markdown output should not be empty');
      assert.ok(r.stdout.includes('TEST-S01-T01'), 'markdown should contain task ID');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('build-overlay.cjs — error handling', () => {
  // FR-015: "task not found" exits 1 per CLI convention (non-zero = error).
  test('exits non-zero for unknown task', () => {
    const tmpDir = makeOverlayFixture({ withTask: false });
    try {
      const r = run(tmpDir, ['--task', 'NONEXISTENT-T99']);
      assert.notEqual(r.status, 0, 'should exit non-zero for unknown task');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('exits non-zero with no args', () => {
    const tmpDir = makeOverlayFixture();
    try {
      const r = run(tmpDir, []);
      assert.notEqual(r.status, 0, 'should exit non-zero with no args');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('missing fields handled gracefully — no crash', () => {
    const tmpDir = makeOverlayFixture({ withTask: true });
    try {
      // Delete MASTER_INDEX to test fallback
      fs.unlinkSync(path.join(tmpDir, 'engineering', 'MASTER_INDEX.md'));
      const r = run(tmpDir, ['--task', 'TEST-S01-T01']);
      // Should still succeed (indexSlice becomes empty string)
      assert.equal(r.status, 0, `exit non-zero: stderr=${r.stderr}`);
      const obj = JSON.parse(r.stdout);
      assert.equal(typeof obj.indexSlice, 'string', 'indexSlice should be a string even if empty');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
