'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { statusBadge, padTable, fmtTokens, fmtCost, sourceLabel, GENERATED, buildSprintIndex, buildTaskIndex, buildBugIndex, resolveTaskDir, isBugId } = require('../collate.cjs');

describe('collate.cjs — statusBadge', () => {
  test('completed returns badge with status name', () => {
    const result = statusBadge('completed');
    assert.ok(result.includes('completed'), `expected "completed" in "${result}"`);
  });

  test('implementing returns badge with status name', () => {
    const result = statusBadge('implementing');
    assert.ok(result.includes('implementing'), `expected "implementing" in "${result}"`);
  });

  test('unknown status returns bare status string', () => {
    const result = statusBadge('unknown_status');
    assert.equal(result, 'unknown_status');
  });

  test('committed returns badge string', () => {
    const result = statusBadge('committed');
    assert.ok(result.includes('committed'), `expected "committed" in "${result}"`);
  });

  test('draft returns badge string', () => {
    const result = statusBadge('draft');
    assert.ok(result.includes('draft'), `expected "draft" in "${result}"`);
  });

  test('blocked returns badge string', () => {
    const result = statusBadge('blocked');
    assert.ok(result.includes('blocked'), `expected "blocked" in "${result}"`);
  });
});

describe('collate.cjs — padTable', () => {
  test('formats a simple 2x2 table with header separator', () => {
    const result = padTable([['Name', 'Count'], ['foo', '3']]);
    const lines = result.split('\n');
    assert.equal(lines.length, 3, `expected 3 lines (header, separator, data), got ${lines.length}`);
    assert.ok(lines[0].startsWith('| '), 'header line starts with |');
    assert.ok(lines[1].includes('-'), 'separator line has dashes');
    assert.ok(lines[1].startsWith('|'), 'separator line starts with |');
  });

  test('handles empty rows array', () => {
    assert.equal(padTable([]), '');
  });

  test('pads columns to equal width', () => {
    const result = padTable([['A', 'BBB'], ['CC', 'D']]);
    const lines = result.split('\n');
    // Both data lines should have the same width
    assert.equal(lines[0].length, lines[1].length, 'columns should be padded to equal width');
  });

  test('includes header separator row', () => {
    const result = padTable([['H1', 'H2'], ['v1', 'v2']]);
    assert.ok(result.includes('--'), 'should include separator row with dashes');
  });
});

describe('collate.cjs — fmtTokens', () => {
  test('formats integer with locale separators', () => {
    const result = fmtTokens(1500);
    assert.ok(result.includes('1') && result.includes('500'), `expected formatted 1500, got "${result}"`);
  });

  test('returns em-dash for null', () => {
    assert.equal(fmtTokens(null), '—');
  });

  test('returns em-dash for undefined', () => {
    assert.equal(fmtTokens(undefined), '—');
  });

  test('formats zero', () => {
    assert.equal(fmtTokens(0), '0');
  });
});

describe('collate.cjs — fmtCost', () => {
  test('formats number as USD with 4 decimal places', () => {
    assert.equal(fmtCost(0.05), '$0.0500');
  });

  test('returns em-dash for null', () => {
    assert.equal(fmtCost(null), '—');
  });

  test('returns em-dash for undefined', () => {
    assert.equal(fmtCost(undefined), '—');
  });

  test('formats whole dollar amount', () => {
    assert.equal(fmtCost(10), '$10.0000');
  });
});

describe('collate.cjs — sourceLabel', () => {
  test('reported-only sources return (reported)', () => {
    assert.equal(sourceLabel(new Set(['reported'])), '(reported)');
  });

  test('estimated-only sources return (estimated)', () => {
    assert.equal(sourceLabel(new Set(['estimated'])), '(estimated)');
  });

  test('mixed sources with reported and estimated return (mixed)', () => {
    assert.equal(sourceLabel(new Set(['reported', 'estimated'])), '(mixed)');
  });

  test('unrecognized single source returns (mixed)', () => {
    // 'api' is not a recognized label, so it falls through to (mixed)
    assert.equal(sourceLabel(new Set(['api'])), '(mixed)');
  });

  test('estimated with unrecognized source returns (estimated)', () => {
    // 'estimated' takes priority over unrecognized source label
    assert.equal(sourceLabel(new Set(['api', 'estimated'])), '(estimated)');
  });

  test('unknown-only sources return (unknown)', () => {
    assert.equal(sourceLabel(new Set([undefined])), '(unknown)');
  });

  test('reported and estimated together return (mixed)', () => {
    assert.equal(sourceLabel(new Set(['reported', 'estimated'])), '(mixed)');
  });

  test('reported with unknown returns (mixed)', () => {
    assert.equal(sourceLabel(new Set(['reported', undefined])), '(mixed)');
  });
});

describe('collate.cjs — GENERATED constant', () => {
  test('is the expected marker string', () => {
    assert.ok(GENERATED.includes('GENERATED'), `expected GENERATED marker, got "${GENERATED}"`);
    assert.ok(GENERATED.includes('collate'), `expected "collate" in marker, got "${GENERATED}"`);
  });
});

describe('collate.cjs — buildSprintIndex', () => {
  const sprint = {
    sprintId: 'TST-S01',
    title: 'Foundation Sprint',
    description: 'Builds the foundation.',
    goal: 'Deliver a working scaffold.',
    status: 'active',
    executionMode: 'sequential',
  };
  const tasks = [
    { taskId: 'TST-S01-T01', title: 'Bootstrap scaffold', status: 'committed', estimate: 'S' },
    { taskId: 'TST-S01-T02', title: 'Add CI pipeline', status: 'in-progress', estimate: 'M' },
  ];

  test('includes GENERATED marker', () => {
    const result = buildSprintIndex(sprint, tasks, []);
    assert.ok(result.includes('GENERATED'), 'should include GENERATED marker');
  });

  test('includes sprint title as heading', () => {
    const result = buildSprintIndex(sprint, tasks, []);
    assert.ok(result.includes('Foundation Sprint'), 'should include sprint title');
  });

  test('includes sprint ID', () => {
    const result = buildSprintIndex(sprint, tasks, []);
    assert.ok(result.includes('TST-S01'), 'should include sprint ID');
  });

  test('includes status badge', () => {
    const result = buildSprintIndex(sprint, tasks, []);
    assert.ok(result.includes('active'), 'should include status value');
  });

  test('includes goal', () => {
    const result = buildSprintIndex(sprint, tasks, []);
    assert.ok(result.includes('Deliver a working scaffold.'), 'should include sprint goal');
  });

  test('links to each task INDEX.md', () => {
    const result = buildSprintIndex(sprint, tasks, []);
    assert.ok(result.includes('TST-S01-T01/INDEX.md'), 'should link to first task INDEX.md');
    assert.ok(result.includes('TST-S01-T02/INDEX.md'), 'should link to second task INDEX.md');
  });

  test('includes task titles in task table', () => {
    const result = buildSprintIndex(sprint, tasks, []);
    assert.ok(result.includes('Bootstrap scaffold'), 'should include first task title');
    assert.ok(result.includes('Add CI pipeline'), 'should include second task title');
  });

  test('only includes sprint docs that are in availableDocs', () => {
    const result = buildSprintIndex(sprint, tasks, ['SPRINT_PLAN.md', 'COST_REPORT.md']);
    assert.ok(result.includes('SPRINT_PLAN.md'), 'should include available SPRINT_PLAN.md link');
    assert.ok(result.includes('COST_REPORT.md'), 'should include available COST_REPORT.md link');
    assert.ok(!result.includes('SPRINT_REQUIREMENTS.md'), 'should not include absent SPRINT_REQUIREMENTS.md');
  });

  test('renders with empty task list', () => {
    const result = buildSprintIndex(sprint, [], []);
    assert.ok(result.includes('TST-S01'), 'should still include sprint ID with no tasks');
    assert.ok(result.includes('GENERATED'), 'should still include GENERATED marker');
  });

  test('uses _taskDir for task link path when provided', () => {
    const tasksWithDir = [
      { taskId: 'TST-S01-T01', title: 'Bootstrap scaffold', status: 'committed', estimate: 'S', _taskDir: 'TST-S01-T01-bootstrap-scaffold' },
      { taskId: 'TST-S01-T02', title: 'Add CI pipeline', status: 'in-progress', estimate: 'M', _taskDir: 'TST-S01-T02-add-ci-pipeline' },
    ];
    const result = buildSprintIndex(sprint, tasksWithDir, []);
    assert.ok(result.includes('TST-S01-T01-bootstrap-scaffold/INDEX.md'), 'should use _taskDir slug for first task link');
    assert.ok(result.includes('TST-S01-T02-add-ci-pipeline/INDEX.md'), 'should use _taskDir slug for second task link');
    assert.ok(!result.includes('TST-S01-T01/INDEX.md'), 'should not use bare taskId as link when _taskDir is set');
  });

  test('falls back to taskId for task link when _taskDir is absent', () => {
    const result = buildSprintIndex(sprint, tasks, []);
    assert.ok(result.includes('TST-S01-T01/INDEX.md'), 'should fall back to taskId when no _taskDir');
  });
});

describe('collate.cjs — buildTaskIndex', () => {
  const task = {
    taskId: 'TST-S01-T01',
    sprintId: 'TST-S01',
    title: 'Bootstrap scaffold',
    description: 'Set up the monorepo scaffold.',
    status: 'committed',
    estimate: 'S',
  };

  test('includes GENERATED marker', () => {
    const result = buildTaskIndex(task, []);
    assert.ok(result.includes('GENERATED'), 'should include GENERATED marker');
  });

  test('includes task title as heading', () => {
    const result = buildTaskIndex(task, []);
    assert.ok(result.includes('Bootstrap scaffold'), 'should include task title');
  });

  test('includes task ID', () => {
    const result = buildTaskIndex(task, []);
    assert.ok(result.includes('TST-S01-T01'), 'should include task ID');
  });

  test('includes status badge', () => {
    const result = buildTaskIndex(task, []);
    assert.ok(result.includes('committed'), 'should include status value');
  });

  test('includes estimate', () => {
    const result = buildTaskIndex(task, []);
    assert.ok(result.includes('S'), 'should include estimate');
  });

  test('includes sprint back-link to parent INDEX.md', () => {
    const result = buildTaskIndex(task, []);
    assert.ok(result.includes('../INDEX.md'), 'should link back to sprint INDEX.md');
    assert.ok(result.includes('TST-S01'), 'should reference sprint ID in back-link');
  });

  test('includes task description', () => {
    const result = buildTaskIndex(task, []);
    assert.ok(result.includes('Set up the monorepo scaffold.'), 'should include task description');
  });

  test('only links to docs that are in availableDocs', () => {
    const result = buildTaskIndex(task, ['PLAN.md', 'PROGRESS.md']);
    assert.ok(result.includes('PLAN.md'), 'should include available PLAN.md link');
    assert.ok(result.includes('PROGRESS.md'), 'should include available PROGRESS.md link');
    assert.ok(!result.includes('TASK_PROMPT.md'), 'should not include absent TASK_PROMPT.md');
    assert.ok(!result.includes('CODE_REVIEW.md'), 'should not include absent CODE_REVIEW.md');
  });

  test('renders with no available docs', () => {
    const result = buildTaskIndex(task, []);
    assert.ok(result.includes('TST-S01-T01'), 'should still include task ID with no docs');
  });
});

describe('collate.cjs — buildBugIndex', () => {
  const bug = {
    bugId: 'TST-B01',
    title: 'Widget renders incorrectly',
    description: 'The widget fails to render when the prop is null.',
    severity: 'major',
    status: 'fixed',
    reportedAt: '2026-01-15T10:00:00Z',
    resolvedAt: '2026-01-16T14:00:00Z',
  };

  test('includes GENERATED marker', () => {
    const result = buildBugIndex(bug, []);
    assert.ok(result.includes('GENERATED'), 'should include GENERATED marker');
  });

  test('includes bug title as heading', () => {
    const result = buildBugIndex(bug, []);
    assert.ok(result.includes('Widget renders incorrectly'), 'should include bug title');
  });

  test('includes bug ID', () => {
    const result = buildBugIndex(bug, []);
    assert.ok(result.includes('TST-B01'), 'should include bug ID');
  });

  test('includes severity', () => {
    const result = buildBugIndex(bug, []);
    assert.ok(result.includes('major'), 'should include severity');
  });

  test('includes status badge', () => {
    const result = buildBugIndex(bug, []);
    assert.ok(result.includes('fixed'), 'should include status value');
  });

  test('includes description', () => {
    const result = buildBugIndex(bug, []);
    assert.ok(result.includes('The widget fails to render when the prop is null.'), 'should include description');
  });

  test('includes reportedAt date', () => {
    const result = buildBugIndex(bug, []);
    assert.ok(result.includes('2026-01-15'), 'should include reportedAt date');
  });

  test('includes resolvedAt date when present', () => {
    const result = buildBugIndex(bug, []);
    assert.ok(result.includes('2026-01-16'), 'should include resolvedAt date');
  });

  test('omits resolvedAt when not present', () => {
    const openBug = { ...bug, resolvedAt: undefined, status: 'reported' };
    const result = buildBugIndex(openBug, []);
    assert.ok(!result.includes('Resolved:'), 'should not include Resolved line for open bug');
  });

  test('only links to docs that are in availableDocs', () => {
    const result = buildBugIndex(bug, ['ANALYSIS.md', 'PROGRESS.md']);
    assert.ok(result.includes('ANALYSIS.md'), 'should include available ANALYSIS.md link');
    assert.ok(result.includes('PROGRESS.md'), 'should include available PROGRESS.md link');
    assert.ok(!result.includes('CODE_REVIEW.md'), 'should not include absent CODE_REVIEW.md');
    assert.ok(!result.includes('BUG_FIX_PLAN.md'), 'should not include absent BUG_FIX_PLAN.md');
  });

  test('renders with no available docs', () => {
    const result = buildBugIndex(bug, []);
    assert.ok(result.includes('TST-B01'), 'should still include bug ID with no docs');
  });
});

describe('collate.cjs — resolveTaskDir', () => {
  let tmpDir;

  // Set up a temporary sprint directory with a real task subdirectory
  test.before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-collate-test-'));
    fs.mkdirSync(path.join(tmpDir, 'TST-S01-T01-my-task'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'TST-S01-T02'), { recursive: true });
  });

  test.after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns { ok: true, value } with slug dir when task.path is under engPath', () => {
    const task = { taskId: 'TST-S01-T01', path: 'engineering/sprints/FORGE-S11/TST-S01-T01-my-task' };
    const result = resolveTaskDir(task, tmpDir, 'engineering');
    assert.equal(result.ok, true, `expected ok:true, got ok:${result.ok}`);
    assert.equal(result.value, 'TST-S01-T01-my-task', `expected slug dir name, got "${result.value}"`);
  });

  test('returns { ok: true, value } via filesystem lookup when task.path is a plugin source (not under engPath)', () => {
    // task.path points to a plugin source file — should fall back to filesystem resolution
    const task = { taskId: 'TST-S01-T01', path: 'forge/tools/collate.cjs' };
    const result = resolveTaskDir(task, tmpDir, 'engineering');
    assert.equal(result.ok, true, `expected ok:true, got ok:${result.ok}`);
    assert.equal(result.value, 'TST-S01-T01-my-task', `expected slug dir found by filesystem scan, got "${result.value}"`);
  });

  test('returns { ok: true, value } via filesystem lookup when task.path is absent', () => {
    const task = { taskId: 'TST-S01-T02' };
    const result = resolveTaskDir(task, tmpDir, 'engineering');
    assert.equal(result.ok, true, `expected ok:true, got ok:${result.ok}`);
    assert.equal(result.value, 'TST-S01-T02', `expected exact-match dir, got "${result.value}"`);
  });

  test('returns { ok: false, code: MISSING_DIR } when no matching task directory exists on disk', () => {
    const task = { taskId: 'TST-S01-T99', path: 'forge/tools/something.cjs' };
    const result = resolveTaskDir(task, tmpDir, 'engineering');
    assert.equal(result.ok, false, `expected ok:false, got ok:${result.ok}`);
    assert.equal(result.code, 'MISSING_DIR', `expected code MISSING_DIR, got "${result.code}"`);
    assert.equal(typeof result.message, 'string', 'expected message to be a string');
    assert.ok(result.message.length > 0, 'expected non-empty message');
  });
});

describe('collate.cjs — isBugId', () => {
  test('recognizes simple bug IDs with -B prefix (BUG-001)', () => {
    assert.equal(isBugId('BUG-001'), true, 'BUG-001 should be a bug ID');
  });

  test('recognizes multi-segment bug IDs (FORGE-BUG-007)', () => {
    assert.equal(isBugId('FORGE-BUG-007'), true, 'FORGE-BUG-007 should be a bug ID');
  });

  test('recognizes project-prefixed bug IDs (HELLO-B02)', () => {
    assert.equal(isBugId('HELLO-B02'), true, 'HELLO-B02 should be a bug ID');
  });

  test('recognizes single-digit bug numbers (PROJ-B1)', () => {
    assert.equal(isBugId('PROJ-B1'), true, 'PROJ-B1 should be a bug ID');
  });

  test('recognizes large bug numbers (ORG-BUG-999)', () => {
    assert.equal(isBugId('ORG-BUG-999'), true, 'ORG-BUG-999 should be a bug ID');
  });

  test('rejects sprint IDs (FORGE-S12)', () => {
    assert.equal(isBugId('FORGE-S12'), false, 'FORGE-S12 should not be a bug ID');
  });

  test('rejects task IDs (FORGE-S12-T03)', () => {
    assert.equal(isBugId('FORGE-S12-T03'), false, 'FORGE-S12-T03 should not be a bug ID');
  });

  test('rejects plain strings without -B pattern (HELLO)', () => {
    assert.equal(isBugId('HELLO'), false, 'HELLO should not be a bug ID');
  });

  test('rejects empty string', () => {
    assert.equal(isBugId(''), false, 'empty string should not be a bug ID');
  });

  test('rejects strings where -B is not followed by digits (BUG-ABC)', () => {
    assert.equal(isBugId('BUG-ABC'), false, 'BUG-ABC should not be a bug ID');
  });

  test('rejects lowercase bug patterns (bug-001)', () => {
    assert.equal(isBugId('bug-001'), false, 'bug-001 (lowercase) should not be a bug ID');
  });

  test('rejects feature IDs (FEAT-005)', () => {
    assert.equal(isBugId('FEAT-005'), false, 'FEAT-005 should not be a bug ID');
  });
});