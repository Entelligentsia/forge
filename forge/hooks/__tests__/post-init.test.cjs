'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const HOOK = path.join(__dirname, '..', 'post-init.cjs');
const PLUGIN_ROOT = path.join(__dirname, '..', '..');
const VALIDATE_STORE = path.join(PLUGIN_ROOT, 'tools', 'validate-store.cjs');

function makeProject({ withConfig = true, withStructureVersions = true, structureVersionsAge = 0 } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-post-init-'));
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

  if (withStructureVersions) {
    const svPath = path.join(tmp, '.forge', 'structure-versions.json');
    fs.writeFileSync(svPath, JSON.stringify({ versions: [] }));
    if (structureVersionsAge > 0) {
      const past = Date.now() - structureVersionsAge;
      fs.utimesSync(svPath, past / 1000, past / 1000);
    }
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

const TRIGGER_CMD = 'rm -f .forge/init-progress.json';

describe('post-init hook — pass-through', () => {
  test('non-matching bash command exits 0 with no stdout', () => {
    const tmp = makeProject();
    const r = runHook(tmp, { tool_name: 'Bash', tool_input: { command: 'ls -la' }, tool_response: { exitCode: 0 } });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), '');
  });

  test('non-Bash tool exits 0 with no stdout', () => {
    const tmp = makeProject();
    const r = runHook(tmp, { tool_name: 'Write', tool_input: { file_path: 'foo' } });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), '');
  });

  test('failed exit code on init command exits 0 with no fire', () => {
    const tmp = makeProject();
    const r = runHook(tmp, { tool_name: 'Bash', tool_input: { command: TRIGGER_CMD }, tool_response: { exitCode: 1 } });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), '');
  });
});

describe('post-init hook — happy path', () => {
  test('matching rm + recent structure-versions.json + no sentinel → fires with additionalContext', () => {
    const tmp = makeProject();
    const r = runHook(tmp, { tool_name: 'Bash', tool_input: { command: TRIGGER_CMD }, tool_response: { exitCode: 0 } });
    assert.equal(r.status, 0, r.stderr);
    assert.notEqual(r.stdout.trim(), '');
    const out = JSON.parse(r.stdout);
    assert.equal(out.hookSpecificOutput.hookEventName, 'PostToolUse');
    assert.match(out.hookSpecificOutput.additionalContext, /\/forge:enhance --phase 1 --auto/);
  });

  test('sentinel file is created at .forge/cache/post-init-enhancement-triggered', () => {
    const tmp = makeProject();
    runHook(tmp, { tool_name: 'Bash', tool_input: { command: TRIGGER_CMD }, tool_response: { exitCode: 0 } });
    const sentinel = path.join(tmp, '.forge', 'cache', 'post-init-enhancement-triggered');
    assert.ok(fs.existsSync(sentinel), `sentinel missing at ${sentinel}`);
  });

  test('second invocation with sentinel present is no-op', () => {
    const tmp = makeProject();
    const r1 = runHook(tmp, { tool_name: 'Bash', tool_input: { command: TRIGGER_CMD }, tool_response: { exitCode: 0 } });
    assert.notEqual(r1.stdout.trim(), '');
    const r2 = runHook(tmp, { tool_name: 'Bash', tool_input: { command: TRIGGER_CMD }, tool_response: { exitCode: 0 } });
    assert.equal(r2.status, 0);
    assert.equal(r2.stdout.trim(), '');
  });

  test('event is emitted with action=enhancement-trigger, phase=post-init, eventId carries pid+hrtime', () => {
    const tmp = makeProject();
    runHook(tmp, { tool_name: 'Bash', tool_input: { command: TRIGGER_CMD }, tool_response: { exitCode: 0 } });
    const eventsDir = path.join(tmp, '.forge', 'store', 'events', 'enhancement');
    assert.ok(fs.existsSync(eventsDir), 'enhancement event bucket not created');
    const files = fs.readdirSync(eventsDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
    assert.equal(files.length, 1, `expected 1 event, got ${files.length}`);
    const ev = JSON.parse(fs.readFileSync(path.join(eventsDir, files[0]), 'utf8'));
    assert.equal(ev.action, 'enhancement-trigger');
    assert.equal(ev.phase, 'post-init');
    assert.match(ev.eventId, /_\d+_\d+$/, `eventId missing pid+hrtime suffix: ${ev.eventId}`);
    const notes = JSON.parse(ev.notes);
    assert.equal(notes.triggerSource, 'post-init');
    assert.equal(notes.targetPhase, 1);
  });
});

describe('post-init hook — negative trigger discrimination', () => {
  test('matching rm but structure-versions.json is missing → no fire', () => {
    const tmp = makeProject({ withStructureVersions: false });
    const r = runHook(tmp, { tool_name: 'Bash', tool_input: { command: TRIGGER_CMD }, tool_response: { exitCode: 0 } });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), '');
    assert.ok(!fs.existsSync(path.join(tmp, '.forge', 'cache', 'post-init-enhancement-triggered')));
  });

  test('matching rm but structure-versions.json mtime > 10s old → no fire', () => {
    const tmp = makeProject({ structureVersionsAge: 60_000 });
    const r = runHook(tmp, { tool_name: 'Bash', tool_input: { command: TRIGGER_CMD }, tool_response: { exitCode: 0 } });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), '');
  });

  test('.forge/config.json missing → exit 0, no fire', () => {
    const tmp = makeProject({ withConfig: false });
    const r = runHook(tmp, { tool_name: 'Bash', tool_input: { command: TRIGGER_CMD }, tool_response: { exitCode: 0 } });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), '');
  });
});

describe('post-init hook — fail-open', () => {
  test('malformed envelope JSON exits 0 silently', () => {
    const tmp = makeProject();
    const r = spawnSync('node', [HOOK], {
      cwd: tmp, input: '{not json', encoding: 'utf8', timeout: 5000,
    });
    assert.equal(r.status, 0);
  });
});

describe('post-init hook — validate-store accepts enhancement bucket', () => {
  test('validate-store.cjs --dry-run exits 0 after a hook firing', () => {
    const tmp = makeProject();
    runHook(tmp, { tool_name: 'Bash', tool_input: { command: TRIGGER_CMD }, tool_response: { exitCode: 0 } });
    const r = spawnSync('node', [VALIDATE_STORE, '--dry-run'], { cwd: tmp, encoding: 'utf8', timeout: 15000 });
    assert.equal(r.status, 0, `validate-store failed: ${r.stdout}\n${r.stderr}`);
  });
});
