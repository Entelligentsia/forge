'use strict';
// Plan-11 / #23 — friction-emit.cjs (test-first, Iron Law 2).
//
// Contract:
//   - CLI appends ONE judgement-only record to
//     .forge/cache/FRICTION-{workflow}.jsonl under the resolved project root.
//   - Required flags: --workflow --persona --issue
//   - Optional flags: --subkind --evidence (JSON string)
//   - Refuses runtime-attribution flags: --model --provider --timestamps
//     --eventId --inputTokens --outputTokens --tokens (those are stamped on
//     by the orchestrator drain).
//   - Output record is a single line of JSON terminated by \n, containing
//     judgement fields only — no runtime attribution.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TOOL = path.join(__dirname, '..', 'friction-emit.cjs');

function makeTempProject() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-friction-emit-'));
  fs.mkdirSync(path.join(tmp, '.forge'), { recursive: true });
  return tmp;
}

function runTool(cwd, args) {
  return spawnSync(process.execPath, [TOOL, ...args], { cwd, encoding: 'utf8' });
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

describe('friction-emit.cjs — happy path', () => {
  test('writes one judgement-only record with all required fields', () => {
    const cwd = makeTempProject();
    const r = runTool(cwd, [
      '--workflow', 'implement',
      '--persona',  'engineer',
      '--issue',    'skill_unused',
    ]);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);

    const target = path.join(cwd, '.forge', 'cache', 'FRICTION-implement.jsonl');
    const records = readJsonl(target);
    assert.equal(records.length, 1);
    const rec = records[0];
    assert.equal(rec.workflow, 'implement');
    assert.equal(rec.persona,  'engineer');
    assert.equal(rec.issue,    'skill_unused');
  });

  test('appends second record to same file', () => {
    const cwd = makeTempProject();
    runTool(cwd, ['--workflow', 'plan', '--persona', 'planner', '--issue', 'skill_unused']);
    runTool(cwd, ['--workflow', 'plan', '--persona', 'planner', '--issue', 'skill_missing']);
    const records = readJsonl(path.join(cwd, '.forge', 'cache', 'FRICTION-plan.jsonl'));
    assert.equal(records.length, 2);
    assert.equal(records[0].issue, 'skill_unused');
    assert.equal(records[1].issue, 'skill_missing');
  });

  test('optional --subkind and --evidence are included', () => {
    const cwd = makeTempProject();
    const evidence = JSON.stringify({ trajectory_excerpt: 'X failed', tool_errors: ['boom'] });
    const r = runTool(cwd, [
      '--workflow', 'implement',
      '--persona',  'engineer',
      '--issue',    'skill_failed',
      '--subkind',  'skill_failed',
      '--evidence', evidence,
    ]);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    const records = readJsonl(path.join(cwd, '.forge', 'cache', 'FRICTION-implement.jsonl'));
    assert.equal(records[0].subkind, 'skill_failed');
    assert.deepEqual(records[0].evidence, { trajectory_excerpt: 'X failed', tool_errors: ['boom'] });
  });

  test('creates .forge/cache directory when missing', () => {
    const cwd = makeTempProject();
    fs.rmSync(path.join(cwd, '.forge'), { recursive: true, force: true });
    fs.mkdirSync(path.join(cwd, '.forge'), { recursive: true });
    const r = runTool(cwd, ['--workflow', 'implement', '--persona', 'engineer', '--issue', 'skill_unused']);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.ok(fs.existsSync(path.join(cwd, '.forge', 'cache', 'FRICTION-implement.jsonl')));
  });
});

describe('friction-emit.cjs — required-field validation', () => {
  for (const missing of ['workflow', 'persona', 'issue']) {
    test(`rejects when --${missing} absent`, () => {
      const cwd = makeTempProject();
      const args = ['--workflow', 'w', '--persona', 'p', '--issue', 'skill_unused'];
      const idx = args.indexOf(`--${missing}`);
      args.splice(idx, 2);
      const r = runTool(cwd, args);
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, new RegExp(missing));
    });
  }
});

describe('friction-emit.cjs — refuses runtime-attribution fields', () => {
  for (const runtimeFlag of [
    '--model', '--provider', '--eventId',
    '--startTimestamp', '--endTimestamp', '--timestamps',
    '--inputTokens', '--outputTokens', '--tokens', '--tokenSource',
  ]) {
    test(`refuses ${runtimeFlag}`, () => {
      const cwd = makeTempProject();
      const r = runTool(cwd, [
        '--workflow', 'implement',
        '--persona',  'engineer',
        '--issue',    'skill_unused',
        runtimeFlag, 'whatever',
      ]);
      assert.notEqual(r.status, 0,
        `expected refusal for ${runtimeFlag}, got success. stdout=${r.stdout} stderr=${r.stderr}`);
      assert.match(r.stderr, /runtime/i);
    });
  }
});

describe('friction-emit.cjs — record shape', () => {
  test('does NOT include runtime fields even if record is serialized', () => {
    const cwd = makeTempProject();
    runTool(cwd, ['--workflow', 'implement', '--persona', 'engineer', '--issue', 'skill_unused']);
    const rec = readJsonl(path.join(cwd, '.forge', 'cache', 'FRICTION-implement.jsonl'))[0];
    for (const forbidden of ['model', 'provider', 'eventId', 'startTimestamp', 'endTimestamp',
                             'inputTokens', 'outputTokens', 'tokens', 'tokenSource', 'iteration']) {
      assert.equal(rec[forbidden], undefined, `expected no ${forbidden} on record, got ${rec[forbidden]}`);
    }
  });

  test('record carries type:"friction" so orchestrator can drain without guessing', () => {
    const cwd = makeTempProject();
    runTool(cwd, ['--workflow', 'implement', '--persona', 'engineer', '--issue', 'skill_unused']);
    const rec = readJsonl(path.join(cwd, '.forge', 'cache', 'FRICTION-implement.jsonl'))[0];
    assert.equal(rec.type, 'friction');
  });

  test('--evidence with malformed JSON is rejected', () => {
    const cwd = makeTempProject();
    const r = runTool(cwd, [
      '--workflow', 'implement', '--persona', 'engineer', '--issue', 'skill_unused',
      '--evidence', '{not-json',
    ]);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /evidence/i);
  });
});
