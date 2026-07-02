'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { deriveSlug } = require('../seed-store.cjs');

const SEED_STORE = path.join(__dirname, '..', 'seed-store.cjs');

function makeProject(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seed-store-'));
  fs.mkdirSync(path.join(dir, '.forge'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.forge', 'config.json'),
    JSON.stringify({ project: { prefix }, paths: { engineering: 'engineering' } }),
  );
  return dir;
}

describe('seed-store.cjs — deriveSlug', () => {
  test('converts to lower-kebab-case', () => {
    assert.equal(deriveSlug('Hello World'), 'hello-world');
  });

  test('strips special characters', () => {
    assert.equal(deriveSlug('Task: Fix Bug #42!'), 'task-fix-bug-42');
  });

  test('truncates to 30 characters', () => {
    const long = 'A very long title that exceeds thirty characters limit';
    assert.ok(deriveSlug(long).length <= 30, `slug should be <= 30 chars, got ${deriveSlug(long).length}`);
  });

  test('removes trailing hyphens after truncation', () => {
    const result = deriveSlug('Implement the user authentication feature');
    assert.ok(!result.endsWith('-'), `slug should not end with hyphen: "${result}"`);
  });

  test('handles empty string', () => {
    assert.equal(deriveSlug(''), '');
  });

  test('handles single word', () => {
    assert.equal(deriveSlug('Implement'), 'implement');
  });

  test('handles multiple consecutive spaces', () => {
    assert.equal(deriveSlug('Hello   World'), 'hello-world');
  });

  test('handles leading/trailing whitespace', () => {
    assert.equal(deriveSlug('  Hello World  '), 'hello-world');
  });

  test('handles hyphens in input', () => {
    assert.equal(deriveSlug('User-Auth Flow'), 'user-auth-flow');
  });

  test('handles all special characters', () => {
    assert.equal(deriveSlug('!!!???'), '');
  });

  test('handles numbers', () => {
    assert.equal(deriveSlug('Sprint 42 Planning'), 'sprint-42-planning');
  });

  test('handles underscores', () => {
    assert.equal(deriveSlug('user_auth_module'), 'user-auth-module');
  });
});

describe('seed-store.cjs — store skeleton', () => {
  test('writes COLLATION_STATE.json baseline even with zero entities', () => {
    const dir = makeProject('LLAMA');
    try {
      execFileSync('node', [SEED_STORE], { cwd: dir });

      const statePath = path.join(dir, '.forge', 'store', 'COLLATION_STATE.json');
      assert.ok(fs.existsSync(statePath), 'COLLATION_STATE.json should exist after seeding a fresh project');

      const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      assert.equal(state.sprintCount, 0);
      assert.equal(state.taskCount, 0);
      assert.equal(state.bugCount, 0);
      assert.equal(state.featureCount, 0);
      assert.equal(typeof state.collatedAt, 'string');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('--dry-run does not create the store', () => {
    const dir = makeProject('LLAMA');
    try {
      execFileSync('node', [SEED_STORE, '--dry-run'], { cwd: dir });
      assert.ok(
        !fs.existsSync(path.join(dir, '.forge', 'store')),
        'dry-run must not create .forge/store/',
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('COLLATION_STATE counts reflect seeded entities', () => {
    const dir = makeProject('LLAMA');
    try {
      const sprintDir = path.join(dir, 'engineering', 'sprints', 'LLAMA-S01-first', 'T01-alpha');
      fs.mkdirSync(sprintDir, { recursive: true });
      execFileSync('node', [SEED_STORE], { cwd: dir });

      const state = JSON.parse(
        fs.readFileSync(path.join(dir, '.forge', 'store', 'COLLATION_STATE.json'), 'utf8'),
      );
      assert.equal(state.sprintCount, 1);
      assert.equal(state.taskCount, 1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});