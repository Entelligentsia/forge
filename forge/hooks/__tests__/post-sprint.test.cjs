'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const HOOK = path.join(__dirname, '..', 'post-sprint.cjs');
const PLUGIN_ROOT = path.join(__dirname, '..', '..');
const VALIDATE_STORE = path.join(PLUGIN_ROOT, 'tools', 'validate-store.cjs');

function makeProject({ withConfig = true } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-post-sprint-'));
  fs.mkdirSync(path.join(tmp, '.forge', 'store', 'events'), { recursive: true });
  fs.mkdirSync(path.join(tmp, '.forge', 'store', 'sprints'), { recursive: true });
  fs.mkdirSync(path.join(tmp, '.forge', 'store', 'tasks'), { recursive: true });
  fs.mkdirSync(path.join(tmp, '.forge', 'cache'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'engineering'), { recursive: true });

  if (withConfig) {
    const cfg = {
      version: '1.0',
      project: { prefix: 'TEST', name: 'Test', description: 'Test project' },
      paths: {
        engineering: 'engineering',
        store: '.forge/store',
        forgeRoot: PLUGIN_ROOT,
      },
    };
    fs.writeFileSync(path.join(tmp, '.forge', 'config.json'), JSON.stringify(cfg, null, 2));
  }

  return tmp;
}

function runHook(tmp, envelope) {
  return spawnSync('node', [HOOK], {
    cwd: tmp,
    input: JSON.stringify(envelope),
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: PLUGIN_ROOT },
    encoding: 'utf8',
    timeout: 15000,
  });
}

describe('post-sprint hook — pass-through', () => {
  test('non-matching bash command exits 0 with no stdout', () => {
    const tmp = makeProject();
    const r = runHook(tmp, { tool_name: 'Bash', tool_input: { command: 'ls -la' }, tool_response: { exitCode: 0 } });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), '');
  });

  test('non-Bash tool exits 0 silently', () => {
    const tmp = makeProject();
    const r = runHook(tmp, { tool_name: 'Write', tool_input: {} });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), '');
  });
});

describe('post-sprint hook — happy path', () => {
  test('matching collate.cjs FORGE-S13 --purge-events fires with /forge:enhance --phase 2', () => {
    const tmp = makeProject();
    const r = runHook(tmp, {
      tool_name: 'Bash',
      tool_input: { command: 'node tools/collate.cjs FORGE-S13 --purge-events' },
      tool_response: { exitCode: 0 },
    });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.match(out.hookSpecificOutput.additionalContext, /\/forge:enhance --phase 2/);
    assert.doesNotMatch(out.hookSpecificOutput.additionalContext, /--auto/);
  });

  test('sprint-specific sentinel is written', () => {
    const tmp = makeProject();
    runHook(tmp, {
      tool_name: 'Bash',
      tool_input: { command: 'collate.cjs FORGE-S13 --purge-events' },
      tool_response: { exitCode: 0 },
    });
    const sentinel = path.join(tmp, '.forge', 'cache', 'post-sprint-FORGE-S13-enhancement-triggered');
    assert.ok(fs.existsSync(sentinel), `sentinel missing at ${sentinel}`);
  });

  test('same sprint command twice → second is no-op', () => {
    const tmp = makeProject();
    const cmd = 'collate.cjs FORGE-S13 --purge-events';
    const r1 = runHook(tmp, { tool_name: 'Bash', tool_input: { command: cmd }, tool_response: { exitCode: 0 } });
    assert.notEqual(r1.stdout.trim(), '');
    const r2 = runHook(tmp, { tool_name: 'Bash', tool_input: { command: cmd }, tool_response: { exitCode: 0 } });
    assert.equal(r2.stdout.trim(), '');
  });

  test('different sprint command fires fresh', () => {
    const tmp = makeProject();
    runHook(tmp, { tool_name: 'Bash', tool_input: { command: 'collate.cjs FORGE-S13 --purge-events' }, tool_response: { exitCode: 0 } });
    const r2 = runHook(tmp, { tool_name: 'Bash', tool_input: { command: 'collate.cjs FORGE-S14 --purge-events' }, tool_response: { exitCode: 0 } });
    assert.notEqual(r2.stdout.trim(), '');
    assert.ok(fs.existsSync(path.join(tmp, '.forge', 'cache', 'post-sprint-FORGE-S14-enhancement-triggered')));
  });

  test('event has action=enhancement-trigger, phase=post-sprint, detectedSprintId, pid+hrtime suffix', () => {
    const tmp = makeProject();
    runHook(tmp, { tool_name: 'Bash', tool_input: { command: 'collate.cjs FORGE-S13 --purge-events' }, tool_response: { exitCode: 0 } });
    const eventsDir = path.join(tmp, '.forge', 'store', 'events', 'enhancement');
    const files = fs.readdirSync(eventsDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
    assert.equal(files.length, 1);
    const ev = JSON.parse(fs.readFileSync(path.join(eventsDir, files[0]), 'utf8'));
    assert.equal(ev.action, 'enhancement-trigger');
    assert.equal(ev.phase, 'post-sprint');
    assert.match(ev.eventId, /_\d+_\d+$/);
    const notes = JSON.parse(ev.notes);
    assert.equal(notes.triggerSource, 'post-sprint');
    assert.equal(notes.targetPhase, 2);
    assert.equal(notes.detectedSprintId, 'FORGE-S13');
  });
});

describe('post-sprint hook — negative trigger discrimination', () => {
  test('bug-fix collate.cjs FORGE-B07 --purge-events does NOT fire', () => {
    const tmp = makeProject();
    const r = runHook(tmp, {
      tool_name: 'Bash',
      tool_input: { command: 'collate.cjs FORGE-B07 --purge-events' },
      tool_response: { exitCode: 0 },
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), '');
    assert.ok(!fs.existsSync(path.join(tmp, '.forge', 'cache', 'post-sprint-FORGE-B07-enhancement-triggered')));
    const eventsDir = path.join(tmp, '.forge', 'store', 'events', 'enhancement');
    assert.ok(!fs.existsSync(eventsDir));
  });

  test('free-form collate.cjs --purge-events (no ID) does NOT fire', () => {
    const tmp = makeProject();
    const r = runHook(tmp, {
      tool_name: 'Bash',
      tool_input: { command: 'collate.cjs --purge-events' },
      tool_response: { exitCode: 0 },
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), '');
  });

  test('.forge/config.json missing → exit 0, no fire', () => {
    const tmp = makeProject({ withConfig: false });
    const r = runHook(tmp, {
      tool_name: 'Bash',
      tool_input: { command: 'collate.cjs FORGE-S13 --purge-events' },
      tool_response: { exitCode: 0 },
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), '');
  });
});

describe('post-sprint hook — fail-open', () => {
  test('malformed envelope JSON exits 0 silently', () => {
    const tmp = makeProject();
    const r = spawnSync('node', [HOOK], {
      cwd: tmp, input: '{not json', encoding: 'utf8', timeout: 5000,
    });
    assert.equal(r.status, 0);
  });
});

describe('post-sprint hook — validate-store accepts enhancement bucket', () => {
  test('validate-store.cjs --dry-run exits 0 after a hook firing', () => {
    const tmp = makeProject();
    runHook(tmp, {
      tool_name: 'Bash',
      tool_input: { command: 'collate.cjs FORGE-S13 --purge-events' },
      tool_response: { exitCode: 0 },
    });
    const r = spawnSync('node', [VALIDATE_STORE, '--dry-run'], { cwd: tmp, encoding: 'utf8', timeout: 15000 });
    assert.equal(r.status, 0, `validate-store failed: ${r.stdout}\n${r.stderr}`);
  });
});
