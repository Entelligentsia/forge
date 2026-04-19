'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const HOOK = path.join(__dirname, '..', 'validate-write.js');
const PLUGIN_ROOT = path.join(__dirname, '..', '..');

function makeTempProject() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-hook-'));
  fs.mkdirSync(path.join(tmp, '.forge', 'store', 'tasks'),       { recursive: true });
  fs.mkdirSync(path.join(tmp, '.forge', 'store', 'events', 'S1'), { recursive: true });
  return tmp;
}

function runHook(tmp, envelope, extraEnv) {
  return spawnSync('node', [HOOK], {
    cwd: tmp,
    input: JSON.stringify(envelope),
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: PLUGIN_ROOT, ...(extraEnv || {}) },
    encoding: 'utf8',
  });
}

const VALID_TASK = {
  taskId: 'T01', sprintId: 'S01', title: 'Test', status: 'draft', path: 'eng/t01',
};

describe('validate-write hook — passthrough', () => {
  test('non-Forge path passes through (exit 0)', () => {
    const tmp = makeTempProject();
    const r = runHook(tmp, {
      tool_name: 'Write',
      tool_input: { file_path: path.join(tmp, 'src', 'foo.ts'), content: 'export const x = 1;' },
    });
    assert.equal(r.status, 0, r.stderr);
  });

  test('unmatched .forge/ path passes through', () => {
    const tmp = makeTempProject();
    const r = runHook(tmp, {
      tool_name: 'Write',
      tool_input: { file_path: path.join(tmp, '.forge', 'store', 'NOT_KNOWN.json'), content: '{}' },
    });
    assert.equal(r.status, 0, r.stderr);
  });

  test('non-Write/Edit tool name passes through', () => {
    const tmp = makeTempProject();
    const r = runHook(tmp, {
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
    });
    assert.equal(r.status, 0);
  });
});

describe('validate-write hook — task JSON', () => {
  test('valid task write is allowed', () => {
    const tmp = makeTempProject();
    const r = runHook(tmp, {
      tool_name: 'Write',
      tool_input: {
        file_path: path.join(tmp, '.forge', 'store', 'tasks', 'T01.json'),
        content: JSON.stringify(VALID_TASK),
      },
    });
    assert.equal(r.status, 0, r.stderr);
  });

  test('task missing taskId is blocked with message naming taskId', () => {
    const tmp = makeTempProject();
    const bad = { ...VALID_TASK }; delete bad.taskId;
    const r = runHook(tmp, {
      tool_name: 'Write',
      tool_input: {
        file_path: path.join(tmp, '.forge', 'store', 'tasks', 'T01.json'),
        content: JSON.stringify(bad),
      },
    });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /taskId/);
    assert.match(r.stderr, /write blocked/);
  });

  test('invalid JSON is blocked with parse error', () => {
    const tmp = makeTempProject();
    const r = runHook(tmp, {
      tool_name: 'Write',
      tool_input: {
        file_path: path.join(tmp, '.forge', 'store', 'tasks', 'T01.json'),
        content: '{not json',
      },
    });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Invalid JSON/);
  });

  test('Edit that transforms valid task into invalid is blocked (post-edit validation)', () => {
    const tmp = makeTempProject();
    const filePath = path.join(tmp, '.forge', 'store', 'tasks', 'T01.json');
    fs.writeFileSync(filePath, JSON.stringify(VALID_TASK, null, 2));
    const r = runHook(tmp, {
      tool_name: 'Edit',
      tool_input: {
        file_path: filePath,
        old_string: '"status": "draft"',
        new_string: '"status": "not-a-real-status"',
      },
    });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /status/);
  });
});

describe('validate-write hook — event sidecar', () => {
  test('sidecar with non-integer inputTokens is blocked', () => {
    const tmp = makeTempProject();
    const r = runHook(tmp, {
      tool_name: 'Write',
      tool_input: {
        file_path: path.join(tmp, '.forge', 'store', 'events', 'S1', '_E1_usage.json'),
        content: JSON.stringify({ eventId: 'E1', inputTokens: 'not-a-number' }),
      },
    });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /inputTokens/);
  });

  test('sidecar with valid fields is allowed', () => {
    const tmp = makeTempProject();
    const r = runHook(tmp, {
      tool_name: 'Write',
      tool_input: {
        file_path: path.join(tmp, '.forge', 'store', 'events', 'S1', '_E1_usage.json'),
        content: JSON.stringify({ eventId: 'E1', inputTokens: 100, outputTokens: 50 }),
      },
    });
    assert.equal(r.status, 0, r.stderr);
  });
});

describe('validate-write hook — progress log', () => {
  test('valid pipe-delimited append is allowed', () => {
    const tmp = makeTempProject();
    const logPath = path.join(tmp, '.forge', 'store', 'events', 'S1', 'progress.log');
    fs.writeFileSync(logPath, '');
    const r = runHook(tmp, {
      tool_name: 'Edit',
      tool_input: {
        file_path: logPath,
        old_string: '',
        new_string: '2026-04-19T10:00:00.000Z|engineer|plan.start|start|beginning plan\n',
      },
    });
    assert.equal(r.status, 0, r.stderr);
  });

  test('oversize detail (>500 chars) is blocked', () => {
    const tmp = makeTempProject();
    const logPath = path.join(tmp, '.forge', 'store', 'events', 'S1', 'progress.log');
    fs.writeFileSync(logPath, '');
    const huge = 'x'.repeat(600);
    const r = runHook(tmp, {
      tool_name: 'Edit',
      tool_input: {
        file_path: logPath,
        old_string: '',
        new_string: `2026-04-19T10:00:00.000Z|engineer|plan.start|start|${huge}\n`,
      },
    });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /detail/);
  });

  test('invalid status enum is blocked', () => {
    const tmp = makeTempProject();
    const logPath = path.join(tmp, '.forge', 'store', 'events', 'S1', 'progress.log');
    fs.writeFileSync(logPath, '');
    const r = runHook(tmp, {
      tool_name: 'Edit',
      tool_input: {
        file_path: logPath,
        old_string: '',
        new_string: '2026-04-19T10:00:00.000Z|engineer|plan.start|bogus|hello\n',
      },
    });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /status/);
  });

  test('agentName with shell metachar is blocked', () => {
    const tmp = makeTempProject();
    const logPath = path.join(tmp, '.forge', 'store', 'events', 'S1', 'progress.log');
    fs.writeFileSync(logPath, '');
    const r = runHook(tmp, {
      tool_name: 'Edit',
      tool_input: {
        file_path: logPath,
        old_string: '',
        new_string: '2026-04-19T10:00:00.000Z|engineer;rm -rf|plan.start|start|hi\n',
      },
    });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /agentName/);
  });
});

describe('validate-write hook — emergency bypass', () => {
  test('FORGE_SKIP_WRITE_VALIDATION=1 bypasses validation and writes audit line', () => {
    const tmp = makeTempProject();
    const bad = { ...VALID_TASK }; delete bad.taskId;
    // create progress.log so the audit line has a place to land
    const logPath = path.join(tmp, '.forge', 'store', 'events', 'S1', 'progress.log');
    fs.writeFileSync(logPath, '');

    const r = runHook(tmp, {
      tool_name: 'Write',
      tool_input: {
        // route the write into the S1 event bucket so the audit hits the same progress.log
        file_path: path.join(tmp, '.forge', 'store', 'events', 'S1', 'bogus.json'),
        content: JSON.stringify(bad),
      },
    }, { FORGE_SKIP_WRITE_VALIDATION: '1' });

    assert.equal(r.status, 0, r.stderr);
    const audit = fs.readFileSync(logPath, 'utf8');
    assert.match(audit, /FORGE_SKIP_WRITE_VALIDATION/);
  });
});

describe('validate-write hook — performance', () => {
  test('validated write completes in <500ms', () => {
    const tmp = makeTempProject();
    const t0 = Date.now();
    const r = runHook(tmp, {
      tool_name: 'Write',
      tool_input: {
        file_path: path.join(tmp, '.forge', 'store', 'tasks', 'T01.json'),
        content: JSON.stringify(VALID_TASK),
      },
    });
    const dt = Date.now() - t0;
    assert.equal(r.status, 0, r.stderr);
    // 500ms is generous because node cold-start is ~100ms on its own. The
    // plan's 150ms target is for the hook body, not the node interpreter.
    assert.ok(dt < 500, `hook took ${dt}ms`);
  });
});
