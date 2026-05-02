'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { statusBadge, padTable, fmtTokens, fmtCost, sourceLabel, GENERATED, buildSprintIndex, buildTaskIndex, buildBugIndex, resolveTaskDir, isBugId, mergeSidecarEvents, buildIngestionQuality, buildCostReport } = require('../collate.cjs');

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

describe('collate.cjs — buildBugIndex with cost aggregation', () => {
  const bug = {
    bugId: 'TST-B01',
    title: 'Expensive bug',
    description: 'This bug cost a lot of tokens.',
    severity: 'major',
    status: 'fixed',
    reportedAt: '2026-01-15T10:00:00Z',
    resolvedAt: '2026-01-16T14:00:00Z',
  };

  const costTotals = {
    inputTokens: 10000,
    outputTokens: 5000,
    cacheReadTokens: 2000,
    cacheWriteTokens: 1000,
    estimatedCostUSD: 0.25,
    sourceLabel: '(reported)',
  };

  test('buildBugIndex includes cost section when costTotals provided', () => {
    const result = buildBugIndex(bug, [], costTotals);
    assert.ok(result.includes('Cost'), 'should include Cost section heading');
    assert.ok(result.includes('10,000'), 'should include formatted input tokens');
    assert.ok(result.includes('5,000'), 'should include formatted output tokens');
    assert.ok(result.includes('$0.2500'), 'should include formatted cost');
    assert.ok(result.includes('(reported)'), 'should include source label');
  });

  test('buildBugIndex without costTotals omits cost section', () => {
    const result = buildBugIndex(bug, []);
    assert.ok(!result.includes('Cost'), 'should not include Cost section when no costTotals');
  });

  test('buildBugIndex cost section includes all token fields', () => {
    const result = buildBugIndex(bug, [], costTotals);
    assert.ok(result.includes('Input Tokens'), 'should include Input Tokens column');
    assert.ok(result.includes('Output Tokens'), 'should include Output Tokens column');
    assert.ok(result.includes('Cache Read'), 'should include Cache Read column');
    assert.ok(result.includes('Cache Write'), 'should include Cache Write column');
    assert.ok(result.includes('Est. Cost USD'), 'should include Est. Cost USD column');
    assert.ok(result.includes('Source'), 'should include Source column');
  });
});

// ============================================================
// New tests for FORGE-S13-T12 — sidecar merge, IQ section
// ============================================================

describe('collate.cjs — mergeSidecarEvents', () => {
  const primaryA = {
    eventId: 'evt-001',
    taskId: 'TST-S01-T01',
    sprintId: 'TST-S01',
    role: 'engineer',
    phase: 'implement',
    model: 'claude-sonnet-4-6',
  };
  const primaryB = {
    eventId: 'evt-002',
    taskId: 'TST-S01-T02',
    sprintId: 'TST-S01',
    role: 'engineer',
    phase: 'implement',
    model: 'claude-haiku-3-5',
  };
  const sidecarA = {
    eventId: 'evt-001',
    inputTokens: 10000,
    outputTokens: 2000,
    cacheReadTokens: 5000,
    cacheWriteTokens: 1000,
    estimatedCostUSD: 0.05,
  };
  const orphanSidecar = {
    eventId: 'evt-orphan',
    inputTokens: 3000,
    outputTokens: 500,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    estimatedCostUSD: 0.01,
  };

  test('merges sidecar token fields onto matching primary by eventId', () => {
    const result = mergeSidecarEvents([primaryA, primaryB], [sidecarA]);
    assert.ok(result.events, 'result should have events array');
    const merged = result.events.find(e => e.eventId === 'evt-001');
    assert.ok(merged, 'evt-001 should be in events');
    assert.equal(merged.inputTokens, 10000, 'inputTokens should be merged from sidecar');
    assert.equal(merged.outputTokens, 2000, 'outputTokens should be merged from sidecar');
    assert.equal(merged.cacheReadTokens, 5000, 'cacheReadTokens should be merged from sidecar');
    assert.equal(merged.cacheWriteTokens, 1000, 'cacheWriteTokens should be merged from sidecar');
  });

  test('unmatched primary (no sidecar) becomes a husk — listed in huskPrimaries', () => {
    const result = mergeSidecarEvents([primaryA, primaryB], [sidecarA]);
    assert.ok(result.huskPrimaries, 'result should have huskPrimaries array');
    const husk = result.huskPrimaries.find(e => e.eventId === 'evt-002');
    assert.ok(husk, 'evt-002 (no sidecar) should be in huskPrimaries');
  });

  test('orphan sidecar (no matching primary) is listed in orphanSidecars', () => {
    const result = mergeSidecarEvents([primaryA], [sidecarA, orphanSidecar]);
    assert.ok(result.orphanSidecars, 'result should have orphanSidecars array');
    const orphan = result.orphanSidecars.find(e => e.eventId === 'evt-orphan');
    assert.ok(orphan, 'evt-orphan should be in orphanSidecars');
  });

  test('orphan sidecar does NOT appear in events array', () => {
    const result = mergeSidecarEvents([primaryA], [sidecarA, orphanSidecar]);
    const inEvents = result.events.find(e => e.eventId === 'evt-orphan');
    assert.equal(inEvents, undefined, 'orphan sidecar should not be in events');
  });

  test('merged primary retains original non-token fields', () => {
    const result = mergeSidecarEvents([primaryA], [sidecarA]);
    const merged = result.events.find(e => e.eventId === 'evt-001');
    assert.equal(merged.taskId, 'TST-S01-T01', 'taskId should be preserved');
    assert.equal(merged.role, 'engineer', 'role should be preserved');
    assert.equal(merged.model, 'claude-sonnet-4-6', 'model should be preserved');
  });

  test('merged primary is included in events (not in huskPrimaries)', () => {
    const result = mergeSidecarEvents([primaryA], [sidecarA]);
    const inHusk = result.huskPrimaries.find(e => e.eventId === 'evt-001');
    assert.equal(inHusk, undefined, 'merged primary should NOT be in huskPrimaries');
    const inEvents = result.events.find(e => e.eventId === 'evt-001');
    assert.ok(inEvents, 'merged primary should be in events');
  });

  test('no sidecars: all primaries become husks', () => {
    const result = mergeSidecarEvents([primaryA, primaryB], []);
    assert.equal(result.events.length, 2, 'all primaries appear in events');
    assert.equal(result.huskPrimaries.length, 2, 'all primaries are husks with no sidecars');
    assert.equal(result.orphanSidecars.length, 0, 'no orphans with no sidecars');
  });

  test('no primaries: all sidecars become orphans', () => {
    const result = mergeSidecarEvents([], [sidecarA, orphanSidecar]);
    assert.equal(result.events.length, 0, 'no events with no primaries');
    assert.equal(result.orphanSidecars.length, 2, 'all sidecars are orphans with no primaries');
    assert.equal(result.huskPrimaries.length, 0, 'no husks with no primaries');
  });

  test('recomputes estimatedCostUSD when all four counts are present and model is known', () => {
    const primary = {
      eventId: 'evt-recompute',
      taskId: 'TST-S01-T01',
      model: 'claude-sonnet-4-6',
    };
    const sidecar = {
      eventId: 'evt-recompute',
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      estimatedCostUSD: 999.99, // fabricated — should be overwritten
    };
    const result = mergeSidecarEvents([primary], [sidecar]);
    const merged = result.events.find(e => e.eventId === 'evt-recompute');
    assert.ok(merged, 'merged event should exist');
    // sonnet-4-6: input $3/MTok + output $15/MTok = $18 for 1M each
    assert.ok(Math.abs(merged.estimatedCostUSD - 18.0) < 0.01, `cost should be ~18.00, got ${merged.estimatedCostUSD}`);
  });

  test('canonicalizes model name on primary event (fragmented name → canonical)', () => {
    const primary = {
      eventId: 'evt-canon',
      taskId: 'TST-S01-T01',
      model: 'claude-sonnet-4-6-1m', // non-canonical variant
    };
    const sidecar = {
      eventId: 'evt-canon',
      inputTokens: 1000,
      outputTokens: 500,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      estimatedCostUSD: 0.01,
    };
    const result = mergeSidecarEvents([primary], [sidecar]);
    const merged = result.events.find(e => e.eventId === 'evt-canon');
    assert.ok(merged, 'merged event should exist');
    assert.equal(merged.model, 'claude-sonnet-4-6', 'model should be canonicalized');
  });
});

describe('collate.cjs — buildIngestionQuality', () => {
  const orphans = [
    { eventId: 'orphan-1', inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0 },
  ];
  const husks = [
    { eventId: 'husk-1', taskId: 'TST-S01-T01' },
    { eventId: 'husk-2', taskId: 'TST-S01-T02' },
  ];
  const noTaskEvents = [
    { eventId: 'notask-1' },
  ];
  const unmappedModels = ['some-mystery-model-7-8'];

  test('renders Ingestion Quality section heading', () => {
    const result = buildIngestionQuality(orphans, husks, noTaskEvents, unmappedModels);
    assert.ok(result.includes('Ingestion Quality'), 'should include Ingestion Quality heading');
  });

  test('shows orphan sidecar count', () => {
    const result = buildIngestionQuality(orphans, husks, noTaskEvents, unmappedModels);
    assert.ok(result.includes('1'), 'should show orphan count');
    assert.ok(result.includes('orphan') || result.includes('Orphan'), 'should mention orphan(s)');
  });

  test('shows husk primary count', () => {
    const result = buildIngestionQuality(orphans, husks, noTaskEvents, unmappedModels);
    assert.ok(result.includes('2'), 'should show husk count');
    assert.ok(result.includes('husk') || result.includes('Husk') || result.includes('no token'), 'should mention husks or no-token primaries');
  });

  test('shows no-task event count', () => {
    const result = buildIngestionQuality(orphans, husks, noTaskEvents, unmappedModels);
    assert.ok(result.includes('no-task') || result.includes('no task') || result.includes('No task'), 'should mention no-task events');
  });

  test('shows unmapped model names', () => {
    const result = buildIngestionQuality(orphans, husks, noTaskEvents, unmappedModels);
    assert.ok(result.includes('some-mystery-model-7-8'), 'should show the raw unmapped model string');
  });

  test('renders cleanly with all-zero counts', () => {
    const result = buildIngestionQuality([], [], [], []);
    assert.ok(result.includes('Ingestion Quality'), 'should still render section heading with no issues');
  });

  test('renders total events count and token-with-data detail', () => {
    // 5 total events, 2 husks → 3 with token data
    const husks2 = [{ eventId: 'husk-1' }, { eventId: 'husk-2' }];
    const tsc = { reported: 2, estimated: 1, missing: 2 };
    const result = buildIngestionQuality([], husks2, [], [], 5, tsc);
    assert.ok(result.includes('Total events'), 'should include Total events row label');
    assert.ok(result.includes('5'), 'should show total event count of 5');
    assert.ok(result.includes('3 with token data'), 'should show derived token-data count (total - husks)');
  });

  test('renders tokenSource breakdown with all three sources', () => {
    const tsc = { reported: 10, estimated: 3, missing: 2 };
    const result = buildIngestionQuality([], [], [], [], 15, tsc);
    assert.ok(result.includes('Token source breakdown'), 'should include Token source breakdown row label');
    assert.ok(result.includes('reported: 10'), 'should show reported count');
    assert.ok(result.includes('estimated: 3'), 'should show estimated count');
    assert.ok(result.includes('missing: 2'), 'should show missing count');
  });

  test('renders total events and tokenSource rows even when no other issues (no-task scenario)', () => {
    // Simulate a clean run with total/tsc provided but no orphans/husks/unmapped
    const tsc = { reported: 7, estimated: 0, missing: 1 };
    const result = buildIngestionQuality([], [], [], [], 8, tsc);
    assert.ok(result.includes('Total events'), 'should include Total events row');
    assert.ok(result.includes('Token source breakdown'), 'should include Token source breakdown row');
    // The "all clean" short-circuit must NOT fire when totalEvents/tsc are provided
    assert.ok(!result.includes('All events attributed cleanly'), 'should not show clean short-circuit message when metrics are present');
  });
});

describe('collate.cjs — buildCostReport', () => {
  const sprint = { sprintId: 'TST-S01', title: 'Test Sprint' };

  // Two events with token data (merged primaries)
  const eventT1 = {
    eventId: 'evt-t1',
    taskId: 'TST-S01-T01',
    role: 'engineer',
    phase: 'implement',
    model: 'claude-sonnet-4-6',
    inputTokens: 100_000,
    outputTokens: 20_000,
    cacheReadTokens: 50_000,
    cacheWriteTokens: 5_000,
    estimatedCostUSD: 0.50,
    tokenSource: 'reported',
  };
  const eventT2 = {
    eventId: 'evt-t2',
    taskId: 'TST-S01-T02',
    role: 'reviewer',
    phase: 'review-code',
    model: 'claude-haiku-3-5',
    inputTokens: 30_000,
    outputTokens: 5_000,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    estimatedCostUSD: 0.05,
    tokenSource: 'reported',
  };

  // Event missing taskId
  const eventNoTask = {
    eventId: 'evt-notask',
    role: 'engineer',
    phase: 'implement',
    model: 'claude-haiku-3-5',
    inputTokens: 5_000,
    outputTokens: 1_000,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    estimatedCostUSD: 0.01,
  };

  const orphans = [];
  const husks = [{ eventId: 'evt-husk', taskId: 'TST-S01-T03' }];

  test('includes GENERATED marker', () => {
    const result = buildCostReport(sprint, [eventT1, eventT2], orphans, husks);
    assert.ok(result.includes('GENERATED'), 'should include GENERATED marker');
  });

  test('includes Per-Task Totals section', () => {
    const result = buildCostReport(sprint, [eventT1, eventT2], orphans, husks);
    assert.ok(result.includes('Per-Task Totals'), 'should include Per-Task Totals section');
    assert.ok(result.includes('TST-S01-T01'), 'should include first task ID');
    assert.ok(result.includes('TST-S01-T02'), 'should include second task ID');
  });

  test('does NOT contain (unknown) task identifier row when all events have taskId', () => {
    const result = buildCostReport(sprint, [eventT1, eventT2], orphans, husks);
    // Check no row has (unknown) as first column (task identifier)
    const lines = result.split('\n');
    const taskRows = lines.filter(l => l.startsWith('| ') && !l.startsWith('| Task') && !l.startsWith('| ---')
      && !l.startsWith('| Role') && !l.startsWith('| Model') && !l.startsWith('| Metric'));
    const hasUnknownTask = taskRows.some(l => {
      const firstCol = l.split('|')[1];
      return firstCol && firstCol.trim() === '(unknown)';
    });
    assert.ok(!hasUnknownTask, 'should NOT have (unknown) as a task identifier');
  });

  test('contains no-task row when events with missing taskId are present', () => {
    const result = buildCostReport(sprint, [eventT1, eventNoTask], orphans, husks);
    assert.ok(result.includes('no-task'), 'should contain no-task row for events without taskId');
    // (unknown) should NOT appear as a task identifier (first column).
    // It may still appear in the Source column as a sourceLabel value, which is acceptable.
    const lines = result.split('\n');
    const taskRows = lines.filter(l => l.startsWith('| ') && !l.startsWith('| Task') && !l.startsWith('| ---'));
    const hasUnknownTask = taskRows.some(l => {
      // Extract the first column (Task column)
      const firstCol = l.split('|')[1];
      return firstCol && firstCol.trim() === '(unknown)';
    });
    assert.ok(!hasUnknownTask, 'should NOT have (unknown) as a task identifier — events without taskId should use no-task');
  });

  test('includes Per-Role Breakdown section', () => {
    const result = buildCostReport(sprint, [eventT1, eventT2], orphans, husks);
    assert.ok(result.includes('Per-Role Breakdown'), 'should include Per-Role Breakdown section');
    assert.ok(result.includes('engineer'), 'should include engineer role');
    assert.ok(result.includes('reviewer'), 'should include reviewer role');
  });

  test('includes Model Split section with canonical model names', () => {
    const result = buildCostReport(sprint, [eventT1, eventT2], orphans, husks);
    assert.ok(result.includes('Model Split'), 'should include Model Split section');
    assert.ok(result.includes('claude-sonnet-4-6'), 'should include canonical sonnet name');
    assert.ok(result.includes('claude-haiku-3-5'), 'should include canonical haiku name');
  });

  test('includes Ingestion Quality section', () => {
    const result = buildCostReport(sprint, [eventT1, eventT2], orphans, husks);
    assert.ok(result.includes('Ingestion Quality'), 'should include Ingestion Quality section');
  });

  test('is idempotent: running twice on same input produces identical output (body)', () => {
    const result1 = buildCostReport(sprint, [eventT1, eventT2], orphans, husks);
    const result2 = buildCostReport(sprint, [eventT1, eventT2], orphans, husks);
    // Strip the Generated: date line to avoid timestamp false-positives
    const stripGenerated = s => s.replace(/^> Generated: .+$/m, '> Generated: <date>');
    assert.equal(stripGenerated(result1), stripGenerated(result2), 'report should be idempotent');
  });

  test('handles no token events gracefully', () => {
    const result = buildCostReport(sprint, [], [], []);
    assert.ok(result.includes('No token data'), 'should handle no token events');
  });
});