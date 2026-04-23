'use strict';
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ── helpers ───────────────────────────────────────────────────────────────────

function makeTempStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-sq-'));
  for (const sub of ['sprints', 'tasks', 'bugs', 'features']) {
    fs.mkdirSync(path.join(dir, sub));
  }
  return dir;
}

function writeJson(dir, file, obj) {
  fs.writeFileSync(path.join(dir, file), JSON.stringify(obj, null, 2));
}

function makeForgeRoot(storeDir, kbDir, prefix = 'WI') {
  // Minimal .forge/config.json layout under a temp project dir
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-proj-'));
  const forgeDir = path.join(proj, '.forge');
  fs.mkdirSync(forgeDir);
  fs.writeFileSync(path.join(forgeDir, 'config.json'), JSON.stringify({
    project: { prefix },
    paths: { store: path.relative(proj, storeDir), engineering: path.relative(proj, kbDir) }
  }));
  return proj;
}

// ── lib/store-facade.cjs ─────────────────────────────────────────────────────

describe('lib/store-facade.cjs — StoreFacade', () => {
  let storeDir;

  beforeEach(() => {
    storeDir = makeTempStore();
  });

  test('listSprints returns all sprints when no filter', () => {
    writeJson(path.join(storeDir, 'sprints'), 'S01.json', { sprintId: 'S01', title: 'Alpha', status: 'active' });
    writeJson(path.join(storeDir, 'sprints'), 'S02.json', { sprintId: 'S02', title: 'Beta', status: 'completed' });
    const { StoreFacade } = require('../lib/store-facade.cjs');
    const store = new StoreFacade(storeDir);
    assert.equal(store.listSprints().length, 2);
  });

  test('listSprints filters by status', () => {
    writeJson(path.join(storeDir, 'sprints'), 'S01.json', { sprintId: 'S01', title: 'Alpha', status: 'active' });
    writeJson(path.join(storeDir, 'sprints'), 'S02.json', { sprintId: 'S02', title: 'Beta', status: 'completed' });
    const { StoreFacade } = require('../lib/store-facade.cjs');
    const store = new StoreFacade(storeDir);
    const result = store.listSprints({ status: 'active' });
    assert.equal(result.length, 1);
    assert.equal(result[0].sprintId, 'S01');
  });

  test('listTasks excludes bug-like IDs', () => {
    writeJson(path.join(storeDir, 'tasks'), 'WI-S01-T01.json', { taskId: 'WI-S01-T01', sprintId: 'S01', title: 'Task', status: 'planned' });
    writeJson(path.join(storeDir, 'tasks'), 'WI-BUG-001.json', { taskId: 'WI-BUG-001', title: 'Not a task', status: 'reported' });
    const { StoreFacade } = require('../lib/store-facade.cjs');
    const store = new StoreFacade(storeDir);
    const tasks = store.listTasks();
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].taskId, 'WI-S01-T01');
  });

  test('getEntity returns entity by id', () => {
    writeJson(path.join(storeDir, 'bugs'), 'WI-BUG-001.json', { bugId: 'WI-BUG-001', title: 'Crash', status: 'reported' });
    const { StoreFacade } = require('../lib/store-facade.cjs');
    const store = new StoreFacade(storeDir);
    const bug = store.getEntity('bugs', 'WI-BUG-001');
    assert.ok(bug);
    assert.equal(bug.bugId, 'WI-BUG-001');
  });

  test('getEntity returns null for missing entity', () => {
    const { StoreFacade } = require('../lib/store-facade.cjs');
    const store = new StoreFacade(storeDir);
    assert.equal(store.getEntity('bugs', 'WI-BUG-999'), null);
  });

  test('followFK resolves scalar FK', () => {
    writeJson(path.join(storeDir, 'sprints'), 'S01.json', { sprintId: 'S01', title: 'Alpha', status: 'active' });
    writeJson(path.join(storeDir, 'tasks'), 'WI-S01-T01.json', { taskId: 'WI-S01-T01', sprintId: 'S01', title: 'Task', status: 'planned' });
    const { StoreFacade } = require('../lib/store-facade.cjs');
    const store = new StoreFacade(storeDir);
    const task = store.getEntity('tasks', 'WI-S01-T01');
    const sprint = store.followFK(task, 'sprintId');
    assert.ok(sprint);
    assert.equal(sprint.sprintId, 'S01');
  });

  test('followFK resolves array FK', () => {
    writeJson(path.join(storeDir, 'bugs'), 'WI-BUG-001.json', { bugId: 'WI-BUG-001', title: 'A', status: 'reported' });
    writeJson(path.join(storeDir, 'bugs'), 'WI-BUG-002.json', { bugId: 'WI-BUG-002', title: 'B', status: 'reported' });
    writeJson(path.join(storeDir, 'tasks'), 'WI-S01-T01.json', { taskId: 'WI-S01-T01', sprintId: 'S01', title: 'Task', status: 'blocked', blockedBy: ['WI-BUG-001', 'WI-BUG-002'] });
    const { StoreFacade } = require('../lib/store-facade.cjs');
    const store = new StoreFacade(storeDir);
    const task = store.getEntity('tasks', 'WI-S01-T01');
    const bugs = store.followFK(task, 'blockedBy');
    assert.equal(bugs.length, 2);
  });

  test('followFK returns null for missing FK value', () => {
    writeJson(path.join(storeDir, 'tasks'), 'WI-S01-T01.json', { taskId: 'WI-S01-T01', sprintId: 'S01', title: 'Task', status: 'planned' });
    const { StoreFacade } = require('../lib/store-facade.cjs');
    const store = new StoreFacade(storeDir);
    const task = store.getEntity('tasks', 'WI-S01-T01');
    assert.equal(store.followFK(task, 'featureId'), null);
  });

  test('listSprints returns empty array when store dir missing', () => {
    const { StoreFacade } = require('../lib/store-facade.cjs');
    const store = new StoreFacade('/nonexistent/path');
    assert.deepEqual(store.listSprints(), []);
  });

  test('_loadDir silently skips corrupt json files', () => {
    fs.writeFileSync(path.join(storeDir, 'sprints', 'bad.json'), '{not json}');
    writeJson(path.join(storeDir, 'sprints'), 'S01.json', { sprintId: 'S01', title: 'Good', status: 'active' });
    const { StoreFacade } = require('../lib/store-facade.cjs');
    const store = new StoreFacade(storeDir);
    assert.equal(store.listSprints().length, 1);
  });
});

describe('lib/store-facade.cjs — extractExcerpt', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-excerpt-'));
  });

  test('returns null for missing file', () => {
    const { extractExcerpt } = require('../lib/store-facade.cjs');
    assert.equal(extractExcerpt(path.join(tmpDir, 'missing.md')), null);
  });

  test('extracts sentences from plain content', () => {
    const md = 'This is the first sentence. This is the second. This is the third. This is the fourth. This is the fifth.';
    fs.writeFileSync(path.join(tmpDir, 'INDEX.md'), md);
    const { extractExcerpt } = require('../lib/store-facade.cjs');
    const excerpt = extractExcerpt(path.join(tmpDir, 'INDEX.md'));
    assert.ok(excerpt);
    // Should have at most 4 sentences
    const sentences = excerpt.match(/[^.!?]+[.!?]+/g) || [];
    assert.ok(sentences.length <= 4);
    assert.ok(excerpt.includes('first sentence'));
  });

  test('strips frontmatter', () => {
    const md = '---\nstatus: active\n---\n# Heading\nReal content here. Second sentence.';
    fs.writeFileSync(path.join(tmpDir, 'INDEX.md'), md);
    const { extractExcerpt } = require('../lib/store-facade.cjs');
    const excerpt = extractExcerpt(path.join(tmpDir, 'INDEX.md'));
    assert.ok(excerpt);
    assert.ok(!excerpt.includes('status: active'));
    assert.ok(excerpt.includes('Real content'));
  });

  test('skips heading lines', () => {
    const md = '# Title\n## Subtitle\nActual prose here. More prose.';
    fs.writeFileSync(path.join(tmpDir, 'INDEX.md'), md);
    const { extractExcerpt } = require('../lib/store-facade.cjs');
    const excerpt = extractExcerpt(path.join(tmpDir, 'INDEX.md'));
    assert.ok(excerpt);
    assert.ok(!excerpt.includes('Title'));
    assert.ok(excerpt.includes('Actual prose'));
  });
});

describe('lib/store-facade.cjs — loadForgeConfig', () => {
  test('returns defaults when config missing', () => {
    const { loadForgeConfig } = require('../lib/store-facade.cjs');
    // Call from a temp dir with no .forge/config.json
    const orig = process.cwd();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-cfg-'));
    process.chdir(tmp);
    try {
      // Reset module cache to get fresh loadForgeConfig
      delete require.cache[require.resolve('../lib/store-facade.cjs')];
      const { loadForgeConfig: freshLoad } = require('../lib/store-facade.cjs');
      const cfg = freshLoad();
      assert.equal(cfg.prefix, 'WI');
      assert.equal(cfg.storePathRel, '.forge/store');
    } finally {
      process.chdir(orig);
      delete require.cache[require.resolve('../lib/store-facade.cjs')];
    }
  });
});

// ── lib/store-nlp.cjs ────────────────────────────────────────────────────────

describe('lib/store-nlp.cjs — parseIntentNLP', () => {
  function parse(intent) {
    delete require.cache[require.resolve('../lib/store-nlp.cjs')];
    const { parseIntentNLP } = require('../lib/store-nlp.cjs');
    return parseIntentNLP(intent);
  }

  test('parses entity type: bugs', () => {
    const plan = parse('open bugs');
    assert.equal(plan.traverse.primary, 'bugs');
  });

  test('parses entity type: sprints', () => {
    const plan = parse('active sprints');
    assert.equal(plan.traverse.primary, 'sprints');
  });

  test('parses entity type: features', () => {
    const plan = parse('shipped features');
    assert.equal(plan.traverse.primary, 'features');
  });

  test('defaults to tasks when no entity word', () => {
    const plan = parse('panohost');
    assert.equal(plan.traverse.primary, 'tasks');
  });

  test('strips forge-store passphrase', () => {
    const plan = parse('forge-store open bugs');
    assert.equal(plan.traverse.primary, 'bugs');
    assert.ok(!plan.traverse.keywordMatch.terms.includes('forge'));
    assert.ok(!plan.traverse.keywordMatch.terms.includes('store'));
  });

  test('extracts keyword from residual terms', () => {
    const plan = parse('dashboard sprints');
    assert.equal(plan.traverse.primary, 'sprints');
    assert.ok(plan.traverse.keywordMatch.terms.includes('dashboard'));
  });

  test('maps open status for bugs', () => {
    const plan = parse('open bugs');
    assert.ok(plan.traverse.filter.status);
  });

  test('maps critical severity for bugs', () => {
    const plan = parse('critical bugs');
    assert.ok(plan.traverse.filter.severity === 'critical' || plan.traverse.filter.status);
  });

  test('extracts sprint ID S12', () => {
    const plan = parse('bugs in S12');
    assert.equal(plan.traverse.filter.sprintId, 'S12');
    assert.equal(plan.traverse.primary, 'bugs');
  });

  test('extracts sprint from "sprint 12" phrase', () => {
    const plan = parse('sprint 12 tasks');
    assert.equal(plan.traverse.filter.sprintId, 'S12');
  });

  test('sets sort=desc and limit=1 for "latest"', () => {
    const plan = parse('latest sprint');
    assert.equal(plan.traverse.sort, 'desc');
    assert.equal(plan.traverse.limit, 1);
  });

  test('sets sort=asc and limit=1 for "oldest"', () => {
    const plan = parse('oldest bug');
    assert.equal(plan.traverse.sort, 'asc');
    assert.equal(plan.traverse.limit, 1);
  });

  test('sets count=true for "how many"', () => {
    const plan = parse('how many open bugs');
    assert.equal(plan.traverse.count, true);
  });

  test('follows blockedBy for bug blocking query', () => {
    const plan = parse('bugs blocking tasks');
    assert.ok(plan.traverse.follow.includes('blockedBy') || plan.traverse.follow.includes('blocksTask'));
  });

  test('follows sprintId for "with sprint"', () => {
    const plan = parse('tasks with sprint');
    assert.ok(plan.traverse.follow.includes('sprintId'));
  });

  test('multiple keywords extracted', () => {
    const plan = parse('panohost admin tasks');
    assert.ok(plan.traverse.keywordMatch.terms.includes('panohost'));
    assert.ok(plan.traverse.keywordMatch.terms.includes('admin'));
  });
});

// ── lib/store-query-exec.cjs ─────────────────────────────────────────────────

describe('lib/store-query-exec.cjs — executeQuery', () => {
  let storeDir;

  beforeEach(() => {
    storeDir = makeTempStore();
    // Reset module cache to avoid cross-test contamination
    delete require.cache[require.resolve('../lib/store-facade.cjs')];
    delete require.cache[require.resolve('../lib/store-query-exec.cjs')];
  });

  function makeStore() {
    const { StoreFacade } = require('../lib/store-facade.cjs');
    return new StoreFacade(storeDir);
  }

  test('exact sprint filter returns matching tasks', () => {
    writeJson(path.join(storeDir, 'sprints'), 'S01.json', { sprintId: 'S01', title: 'Alpha', status: 'active' });
    writeJson(path.join(storeDir, 'tasks'), 'WI-S01-T01.json', { taskId: 'WI-S01-T01', sprintId: 'S01', title: 'Task one', status: 'planned' });
    writeJson(path.join(storeDir, 'tasks'), 'WI-S02-T01.json', { taskId: 'WI-S02-T01', sprintId: 'S02', title: 'Task two', status: 'planned' });
    const { executeQuery } = require('../lib/store-query-exec.cjs');
    const plan = { traverse: { primary: 'tasks', filter: { sprintId: 'S01' }, follow: [], keywordMatch: { field: 'title', terms: [] } } };
    const result = executeQuery(plan, makeStore(), {});
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].id, 'WI-S01-T01');
  });

  test('keyword match filters by title', () => {
    writeJson(path.join(storeDir, 'tasks'), 'WI-S01-T01.json', { taskId: 'WI-S01-T01', sprintId: 'S01', title: 'Panohost deletion fix', status: 'planned' });
    writeJson(path.join(storeDir, 'tasks'), 'WI-S01-T02.json', { taskId: 'WI-S01-T02', sprintId: 'S01', title: 'Auth middleware', status: 'planned' });
    const { executeQuery } = require('../lib/store-query-exec.cjs');
    const plan = { traverse: { primary: 'tasks', filter: {}, follow: [], keywordMatch: { field: 'title', terms: ['panohost'] } } };
    const result = executeQuery(plan, makeStore(), {});
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].id, 'WI-S01-T01');
  });

  test('keyword match uses word boundary (no false partial matches)', () => {
    writeJson(path.join(storeDir, 'tasks'), 'WI-S01-T01.json', { taskId: 'WI-S01-T01', sprintId: 'S01', title: 'Restore deleted items', status: 'planned' });
    const { executeQuery } = require('../lib/store-query-exec.cjs');
    const plan = { traverse: { primary: 'tasks', filter: {}, follow: [], keywordMatch: { field: 'title', terms: ['store'] } } };
    const result = executeQuery(plan, makeStore(), {});
    assert.equal(result.results.length, 0, '"store" should not match "Restore"');
  });

  test('count mode returns count not results', () => {
    writeJson(path.join(storeDir, 'bugs'), 'WI-BUG-001.json', { bugId: 'WI-BUG-001', title: 'A', status: 'reported' });
    writeJson(path.join(storeDir, 'bugs'), 'WI-BUG-002.json', { bugId: 'WI-BUG-002', title: 'B', status: 'reported' });
    const { executeQuery } = require('../lib/store-query-exec.cjs');
    const plan = { traverse: { primary: 'bugs', filter: {}, follow: [], keywordMatch: { field: 'title', terms: [] }, count: true } };
    const result = executeQuery(plan, makeStore(), {});
    assert.equal(result.count, 2);
    assert.equal(result.results.length, 0);
  });

  test('empty results with no matches', () => {
    const { executeQuery } = require('../lib/store-query-exec.cjs');
    const plan = { traverse: { primary: 'bugs', filter: { status: 'verified' }, follow: [], keywordMatch: { field: 'title', terms: [] } } };
    const result = executeQuery(plan, makeStore(), {});
    assert.equal(result.results.length, 0);
  });

  test('sort desc orders by ID descending', () => {
    writeJson(path.join(storeDir, 'sprints'), 'S01.json', { sprintId: 'S01', title: 'First', status: 'completed' });
    writeJson(path.join(storeDir, 'sprints'), 'S02.json', { sprintId: 'S02', title: 'Second', status: 'completed' });
    writeJson(path.join(storeDir, 'sprints'), 'S03.json', { sprintId: 'S03', title: 'Third', status: 'active' });
    const { executeQuery } = require('../lib/store-query-exec.cjs');
    const plan = { traverse: { primary: 'sprints', filter: {}, follow: [], keywordMatch: { field: 'title', terms: [] }, sort: 'desc', limit: 1 } };
    const result = executeQuery(plan, makeStore(), {});
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].id, 'S03');
  });

  test('result includes traversalTrace', () => {
    const { executeQuery } = require('../lib/store-query-exec.cjs');
    const plan = { traverse: { primary: 'sprints', filter: {}, follow: [], keywordMatch: { field: 'title', terms: [] } } };
    const result = executeQuery(plan, makeStore(), {});
    assert.ok(Array.isArray(result.traversalTrace));
    assert.ok(result.traversalTrace.length > 0);
  });

  test('result includes confidence signal in trace', () => {
    const { executeQuery } = require('../lib/store-query-exec.cjs');
    const plan = { traverse: { primary: 'sprints', filter: {}, follow: [], keywordMatch: { field: 'title', terms: [] } } };
    const result = executeQuery(plan, makeStore(), {});
    const hasConfidence = result.traversalTrace.some(t => t.includes('confidence'));
    assert.ok(hasConfidence);
  });

  test('buildResult includes type, id, title, status, relationships', () => {
    writeJson(path.join(storeDir, 'tasks'), 'WI-S01-T01.json', { taskId: 'WI-S01-T01', sprintId: 'S01', title: 'Task one', status: 'planned' });
    const { executeQuery } = require('../lib/store-query-exec.cjs');
    const plan = { traverse: { primary: 'tasks', filter: {}, follow: [], keywordMatch: { field: 'title', terms: [] } } };
    const result = executeQuery(plan, makeStore(), {});
    const r = result.results[0];
    assert.equal(r.type, 'task');
    assert.equal(r.id, 'WI-S01-T01');
    assert.equal(r.title, 'Task one');
    assert.equal(r.status, 'planned');
    assert.ok(r.relationships);
    assert.equal(r.relationships.sprintId, 'S01');
  });
});

// ── store-query.cjs CLI ───────────────────────────────────────────────────────

describe('store-query.cjs CLI — subprocess', () => {
  const { execFileSync, spawnSync } = require('child_process');
  const cliPath = path.join(__dirname, '..', 'store-query.cjs');

  let storeDir, projDir;

  beforeEach(() => {
    storeDir = makeTempStore();
    projDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-proj-'));
    const forgeDir = path.join(projDir, '.forge');
    fs.mkdirSync(forgeDir);
    const kbDir = path.join(projDir, 'engineering');
    fs.mkdirSync(kbDir);
    fs.writeFileSync(path.join(forgeDir, 'config.json'), JSON.stringify({
      project: { prefix: 'WI' },
      paths: { store: path.relative(projDir, storeDir), engineering: 'engineering' }
    }));
    writeJson(path.join(storeDir, 'sprints'), 'S01.json', { sprintId: 'S01', title: 'Alpha sprint', status: 'active' });
    writeJson(path.join(storeDir, 'tasks'), 'WI-S01-T01.json', { taskId: 'WI-S01-T01', sprintId: 'S01', title: 'Implement login', status: 'planned' });
    writeJson(path.join(storeDir, 'bugs'), 'WI-BUG-001.json', { bugId: 'WI-BUG-001', title: 'Auth crash', status: 'reported', severity: 'critical' });
  });

  function run(args, cwd = projDir) {
    const r = spawnSync(process.execPath, [cliPath, ...args], { cwd, encoding: 'utf8' });
    return r;
  }

  test('query --sprint S01 returns sprint and tasks (exact path)', () => {
    const r = run(['query', '--sprint', 'S01']);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.path, 'exact');
    const ids = out.results.map(x => x.id);
    assert.ok(ids.includes('S01') || ids.includes('WI-S01-T01'));
  });

  test('query --bug WI-BUG-001 returns the bug (exact path)', () => {
    const r = run(['query', '--bug', 'WI-BUG-001']);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.path, 'exact');
    assert.ok(out.results.some(x => x.id === 'WI-BUG-001'));
  });

  test('nlp "active sprints" returns sprint (nlp path)', () => {
    const r = run(['nlp', 'active sprints']);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.path, 'intent-nlp');
    assert.ok(out.results.some(x => x.type === 'sprint'));
  });

  test('query --keyword login returns matching task', () => {
    const r = run(['query', '--keyword', 'login']);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.ok(out.results.some(x => x.id === 'WI-S01-T01'));
  });

  test('schema returns entity metadata', () => {
    const r = run(['schema']);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.ok(out.entities);
    assert.ok(out.entities.sprints);
    assert.ok(out.entities.tasks);
    assert.ok(out.entities.bugs);
  });

  test('response includes meta block with timing', () => {
    const r = run(['query', '--sprint', 'S01']);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.ok(out.meta);
    assert.ok(typeof out.meta.totalTimeMs === 'number');
    assert.ok(typeof out.meta.mode === 'string');
  });

  test('--mode strict rejects intent string', () => {
    const r = run(['query', '--mode', 'strict', 'open bugs']);
    assert.notEqual(r.status, 0);
  });

  test('query with no args exits non-zero', () => {
    const r = run(['query']);
    assert.notEqual(r.status, 0);
  });

  test('--help exits 0', () => {
    const r = run(['--help']);
    assert.equal(r.status, 0);
  });

  test('count mode returns count field', () => {
    const r = run(['nlp', 'how many bugs']);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.ok(typeof out.count === 'number');
  });

  test('empty results returns results array not error', () => {
    const r = run(['query', '--bug', 'WI-BUG-999']);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.deepEqual(out.results, []);
  });

  test('traversalTrace present in all responses', () => {
    const r = run(['query', '--sprint', 'S01']);
    const out = JSON.parse(r.stdout);
    assert.ok(Array.isArray(out.traversalTrace));
  });
});

// ── store-cli.cjs dispatch integration ───────────────────────────────────────

describe('store-cli.cjs — query/nlp/schema dispatch', () => {
  const { spawnSync } = require('child_process');
  const cliPath = path.join(__dirname, '..', 'store-cli.cjs');

  let storeDir, projDir;

  beforeEach(() => {
    storeDir = makeTempStore();
    projDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-dispatch-'));
    const forgeDir = path.join(projDir, '.forge');
    fs.mkdirSync(forgeDir);
    const kbDir = path.join(projDir, 'engineering');
    fs.mkdirSync(kbDir);
    fs.writeFileSync(path.join(forgeDir, 'config.json'), JSON.stringify({
      project: { prefix: 'WI' },
      paths: { store: path.relative(projDir, storeDir), engineering: 'engineering' }
    }));
    writeJson(path.join(storeDir, 'sprints'), 'S01.json', { sprintId: 'S01', title: 'Alpha', status: 'active' });
  });

  function run(args, cwd = projDir) {
    return spawnSync(process.execPath, [cliPath, ...args], { cwd, encoding: 'utf8' });
  }

  test('store-cli.cjs query --sprint S01 delegates to store-query.cjs', () => {
    const r = run(['query', '--sprint', 'S01']);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.ok(out.results !== undefined);
    assert.ok(out.traversalTrace !== undefined);
  });

  test('store-cli.cjs nlp "active sprints" delegates to store-query.cjs', () => {
    const r = run(['nlp', 'active sprints']);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.path, 'intent-nlp');
  });

  test('store-cli.cjs schema delegates to store-query.cjs', () => {
    const r = run(['schema']);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.ok(out.entities);
  });
});
