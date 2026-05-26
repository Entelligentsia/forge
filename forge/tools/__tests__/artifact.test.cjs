'use strict';
// artifact.test.cjs — tests for artifact.cjs
// Test-first per Iron Law 2: these tests are written before artifact.cjs exists.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const ARTIFACT_CJS = path.join(__dirname, '..', 'artifact.cjs');

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTempProject() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-artifact-test-'));
  const storeDir = path.join(tmpDir, '.forge', 'store', 'tasks');
  const bugsDir  = path.join(tmpDir, '.forge', 'store', 'bugs');
  fs.mkdirSync(storeDir, { recursive: true });
  fs.mkdirSync(bugsDir,  { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, '.forge', 'config.json'),
    JSON.stringify({ paths: { store: '.forge/store', engineering: 'engineering' } }, null, 2)
  );
  return tmpDir;
}

function writeTaskRecord(tmpDir, taskId, data) {
  fs.writeFileSync(
    path.join(tmpDir, '.forge', 'store', 'tasks', `${taskId}.json`),
    JSON.stringify(data, null, 2)
  );
}

function writeBugRecord(tmpDir, bugId, data) {
  fs.writeFileSync(
    path.join(tmpDir, '.forge', 'store', 'bugs', `${bugId}.json`),
    JSON.stringify(data, null, 2)
  );
}

function runArtifact(args, cwd) {
  return spawnSync('node', [ARTIFACT_CJS, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 10_000,
  });
}

const VALID_SUMMARY = JSON.stringify({
  objective: 'Implement artifact tool',
  key_changes: ['Added artifact.cjs'],
  verdict: 'n/a',
  written_at: '2026-05-26T00:00:00.000Z',
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('artifact.cjs — list subcommand', () => {
  test('list returns artifacts when directory exists', () => {
    const tmpDir = makeTempProject();
    try {
      const taskId = 'FORGE-S26-T16';
      const taskPath = `engineering/sprints/FORGE-S26/FORGE-S26-T16`;
      writeTaskRecord(tmpDir, taskId, {
        taskId, sprintId: 'FORGE-S26', title: 'Test', status: 'implementing', path: taskPath
      });
      const artDir = path.join(tmpDir, taskPath);
      fs.mkdirSync(artDir, { recursive: true });
      fs.writeFileSync(path.join(artDir, 'PLAN.md'), '# Plan', 'utf8');
      fs.writeFileSync(path.join(artDir, 'PROGRESS.md'), '# Progress', 'utf8');

      const r = runArtifact(['list', 'task', taskId], tmpDir);
      assert.equal(r.status, 0, `expected exit 0, got ${r.status}\n${r.stderr}`);
      assert.ok(r.stdout.includes('PLAN.md'), `expected PLAN.md in output: ${r.stdout}`);
      assert.ok(r.stdout.includes('PROGRESS.md'), `expected PROGRESS.md in output: ${r.stdout}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('list reports directory does not exist when missing', () => {
    const tmpDir = makeTempProject();
    try {
      const taskId = 'FORGE-S26-T99';
      writeTaskRecord(tmpDir, taskId, {
        taskId, sprintId: 'FORGE-S26', title: 'Test', status: 'planned',
        path: 'engineering/sprints/FORGE-S26/FORGE-S26-T99'
      });
      // Do NOT create the directory

      const r = runArtifact(['list', 'task', taskId], tmpDir);
      assert.equal(r.status, 0, `expected exit 0, got ${r.status}\n${r.stderr}`);
      assert.ok(r.stdout.includes('does not exist') || r.stdout.includes('No artifacts found'),
        `expected "does not exist" in output: ${r.stdout}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('artifact.cjs — read subcommand', () => {
  test('read returns file content when artifact exists', () => {
    const tmpDir = makeTempProject();
    try {
      const taskId = 'FORGE-S26-T16';
      const taskPath = `engineering/sprints/FORGE-S26/FORGE-S26-T16`;
      writeTaskRecord(tmpDir, taskId, {
        taskId, sprintId: 'FORGE-S26', title: 'Test', status: 'implementing', path: taskPath
      });
      const artDir = path.join(tmpDir, taskPath);
      fs.mkdirSync(artDir, { recursive: true });
      fs.writeFileSync(path.join(artDir, 'PLAN.md'), '# My Plan', 'utf8');

      const r = runArtifact(['read', 'task', taskId, 'plan'], tmpDir);
      assert.equal(r.status, 0, `expected exit 0, got ${r.status}\n${r.stderr}`);
      assert.ok(r.stdout.includes('# My Plan'), `expected plan content: ${r.stdout}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('read exits 2 when artifact file is missing', () => {
    const tmpDir = makeTempProject();
    try {
      const taskId = 'FORGE-S26-T16';
      const taskPath = `engineering/sprints/FORGE-S26/FORGE-S26-T16`;
      writeTaskRecord(tmpDir, taskId, {
        taskId, sprintId: 'FORGE-S26', title: 'Test', status: 'implementing', path: taskPath
      });
      const artDir = path.join(tmpDir, taskPath);
      fs.mkdirSync(artDir, { recursive: true });
      // No PLAN.md

      const r = runArtifact(['read', 'task', taskId, 'plan'], tmpDir);
      assert.equal(r.status, 2, `expected exit 2 (not found), got ${r.status}\n${r.stdout}\n${r.stderr}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('read exits 1 for unknown artifact name', () => {
    const tmpDir = makeTempProject();
    try {
      const taskId = 'FORGE-S26-T16';
      writeTaskRecord(tmpDir, taskId, {
        taskId, sprintId: 'FORGE-S26', title: 'Test', status: 'implementing',
        path: 'engineering/sprints/FORGE-S26/FORGE-S26-T16'
      });

      const r = runArtifact(['read', 'task', taskId, 'nonexistent-artifact'], tmpDir);
      assert.equal(r.status, 1, `expected exit 1 (usage error), got ${r.status}`);
      assert.ok(r.stderr.includes('Unknown artifact') || r.stdout.includes('Unknown artifact'),
        `expected "Unknown artifact" in output`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('artifact.cjs — write subcommand', () => {
  test('write creates a markdown artifact file', () => {
    const tmpDir = makeTempProject();
    try {
      const taskId = 'FORGE-S26-T16';
      const taskPath = `engineering/sprints/FORGE-S26/FORGE-S26-T16`;
      writeTaskRecord(tmpDir, taskId, {
        taskId, sprintId: 'FORGE-S26', title: 'Test', status: 'implementing', path: taskPath
      });
      const artDir = path.join(tmpDir, taskPath);
      fs.mkdirSync(artDir, { recursive: true });

      const r = runArtifact(['write', 'task', taskId, 'progress', '# My Progress'], tmpDir);
      assert.equal(r.status, 0, `expected exit 0, got ${r.status}\n${r.stderr}`);
      const written = fs.readFileSync(path.join(artDir, 'PROGRESS.md'), 'utf8');
      assert.equal(written, '# My Progress');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('write validates JSON summary artifacts and rejects invalid content', () => {
    const tmpDir = makeTempProject();
    try {
      const taskId = 'FORGE-S26-T16';
      writeTaskRecord(tmpDir, taskId, {
        taskId, sprintId: 'FORGE-S26', title: 'Test', status: 'implementing',
        path: 'engineering/sprints/FORGE-S26/FORGE-S26-T16'
      });

      // Invalid summary — missing required fields
      const r = runArtifact(['write', 'task', taskId, 'plan-summary', '{"objective":"only this"}'], tmpDir);
      assert.equal(r.status, 1, `expected exit 1 for validation failure, got ${r.status}`);
      assert.ok(r.stderr.includes('Missing required fields') || r.stdout.includes('Missing required fields'),
        `expected validation error: stdout=${r.stdout} stderr=${r.stderr}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('write accepts a valid JSON summary artifact', () => {
    const tmpDir = makeTempProject();
    try {
      const taskId = 'FORGE-S26-T16';
      const taskPath = `engineering/sprints/FORGE-S26/FORGE-S26-T16`;
      writeTaskRecord(tmpDir, taskId, {
        taskId, sprintId: 'FORGE-S26', title: 'Test', status: 'implementing', path: taskPath
      });
      const artDir = path.join(tmpDir, taskPath);
      fs.mkdirSync(artDir, { recursive: true });

      const r = runArtifact(['write', 'task', taskId, 'plan-summary', VALID_SUMMARY], tmpDir);
      assert.equal(r.status, 0, `expected exit 0, got ${r.status}\n${r.stderr}`);
      const written = JSON.parse(fs.readFileSync(path.join(artDir, 'PLAN-SUMMARY.json'), 'utf8'));
      assert.equal(written.objective, 'Implement artifact tool');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('write exits 1 for unknown artifact name', () => {
    const tmpDir = makeTempProject();
    try {
      const taskId = 'FORGE-S26-T16';
      writeTaskRecord(tmpDir, taskId, {
        taskId, sprintId: 'FORGE-S26', title: 'Test', status: 'implementing',
        path: 'engineering/sprints/FORGE-S26/FORGE-S26-T16'
      });

      const r = runArtifact(['write', 'task', taskId, 'bogus-artifact', '# content'], tmpDir);
      assert.equal(r.status, 1, `expected exit 1 for unknown artifact`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('write large content via @-file prefix', () => {
    const tmpDir = makeTempProject();
    const tmpFile = path.join(os.tmpdir(), `artifact-content-${Date.now()}.md`);
    try {
      const taskId = 'FORGE-S26-T16';
      const taskPath = `engineering/sprints/FORGE-S26/FORGE-S26-T16`;
      writeTaskRecord(tmpDir, taskId, {
        taskId, sprintId: 'FORGE-S26', title: 'Test', status: 'implementing', path: taskPath
      });
      const artDir = path.join(tmpDir, taskPath);
      fs.mkdirSync(artDir, { recursive: true });

      const bigContent = '# Large content\n' + 'x'.repeat(1000);
      fs.writeFileSync(tmpFile, bigContent, 'utf8');

      const r = runArtifact(['write', 'task', taskId, 'progress', `@${tmpFile}`], tmpDir);
      assert.equal(r.status, 0, `expected exit 0, got ${r.status}\n${r.stderr}`);
      const written = fs.readFileSync(path.join(artDir, 'PROGRESS.md'), 'utf8');
      assert.equal(written, bigContent);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });
});

describe('artifact.cjs — path resolution', () => {
  test('resolves path from store record field (slug-suffixed directory)', () => {
    const tmpDir = makeTempProject();
    try {
      const taskId = 'FORGE-S26-T16';
      const slugPath = `engineering/sprints/FORGE-S26-v1.0-devx/FORGE-S26-T16`;
      writeTaskRecord(tmpDir, taskId, {
        taskId, sprintId: 'FORGE-S26', title: 'Test', status: 'implementing', path: slugPath
      });
      const artDir = path.join(tmpDir, slugPath);
      fs.mkdirSync(artDir, { recursive: true });
      fs.writeFileSync(path.join(artDir, 'PLAN.md'), '# Plan in slug dir', 'utf8');

      const r = runArtifact(['list', 'task', taskId], tmpDir);
      assert.equal(r.status, 0, `expected exit 0, got ${r.status}\n${r.stderr}`);
      assert.ok(r.stdout.includes('PLAN.md'), `expected PLAN.md: ${r.stdout}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('fallback when store read fails (entity does not exist in store)', () => {
    const tmpDir = makeTempProject();
    try {
      // No task record in store — artifact.cjs must fall back to ID-only path
      const taskId = 'FORGE-S01-T01';
      const fallbackPath = path.join(tmpDir, 'engineering', 'sprints', 'FORGE-S01', 'FORGE-S01-T01');
      fs.mkdirSync(fallbackPath, { recursive: true });
      fs.writeFileSync(path.join(fallbackPath, 'INDEX.md'), '# Fallback', 'utf8');

      const r = runArtifact(['list', 'task', taskId], tmpDir);
      assert.equal(r.status, 0, `expected exit 0, got ${r.status}\n${r.stderr}`);
      assert.ok(r.stdout.includes('INDEX.md'), `expected INDEX.md in fallback: ${r.stdout}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('artifact.cjs — usage errors', () => {
  test('exits 1 when no arguments provided', () => {
    const tmpDir = makeTempProject();
    try {
      const r = runArtifact([], tmpDir);
      assert.notEqual(r.status, 0, 'expected non-zero exit with no args');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('exits 1 for unknown subcommand', () => {
    const tmpDir = makeTempProject();
    try {
      const r = runArtifact(['bogus', 'task', 'FORGE-S26-T16'], tmpDir);
      assert.notEqual(r.status, 0, 'expected non-zero exit for unknown subcommand');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
