'use strict';

// verify-phase.test.cjs — test-first for verify-phase.cjs (FORGE-S26-T17)
//
// Tests are written BEFORE the implementation. All tests below are expected
// to FAIL until verify-phase.cjs is implemented.
//
// Coverage:
//   - Phase 1: valid config (exit 0), missing config (exit 1), malformed JSON (exit 1)
//   - Phase 1: each of 8 missing fields triggers exit 1
//   - Phase 1 --foundation-only: pass/fail on project.name + project.prefix
//   - Phase 2 --kb-path: all 7 arch docs present (exit 0), missing docs (exit 1)
//   - Phase 3: all 4 dirs non-empty (exit 0), empty dirs (exit 1)
//   - Bad args: --phase 5 → exit 2; --phase 2 without --kb-path → exit 2

const assert = require('node:assert/strict');
const { describe, it, before, after } = require('node:test');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TOOL = path.join(__dirname, '..', 'verify-phase.cjs');

/** Run verify-phase.cjs with given args from given cwd. Returns { code, stdout, stderr }. */
function run(args, cwd) {
  const result = cp.spawnSync('node', [TOOL, ...args], { cwd, encoding: 'utf8' });
  return {
    code: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

/** Create a minimal valid .forge/config.json in dir. Optionally omit fields. */
function writeValidConfig(dir, omit = []) {
  const forgeDir = path.join(dir, '.forge');
  fs.mkdirSync(forgeDir, { recursive: true });
  const cfg = {
    version: '1',
    project: { name: 'TestProject', prefix: 'TEST' },
    stack: { primary: ['node'] },
    commands: { test: 'npm test', build: 'npm run build' },
    paths: {
      engineering: 'engineering',
      store: '.forge/store',
      workflows: '.forge/workflows',
    },
  };
  // Apply omissions
  for (const field of omit) {
    const parts = field.split('.');
    if (parts.length === 1) {
      delete cfg[parts[0]];
    } else if (parts.length === 2) {
      if (cfg[parts[0]]) delete cfg[parts[0]][parts[1]];
    }
  }
  fs.writeFileSync(path.join(forgeDir, 'config.json'), JSON.stringify(cfg, null, 2), 'utf8');
}

/** Write 7 arch docs to kbPath/architecture/ */
function writeArchDocs(dir, kbPath = 'engineering') {
  const archDir = path.join(dir, kbPath, 'architecture');
  fs.mkdirSync(archDir, { recursive: true });
  const docs = ['stack', 'processes', 'database', 'routing', 'deployment', 'entity-model', 'stack-checklist'];
  for (const doc of docs) {
    fs.writeFileSync(path.join(archDir, `${doc}.md`), `# ${doc}\n`, 'utf8');
  }
}

/** Write at least one file to each of the 4 .forge subdirectories */
function writePhase3Dirs(dir) {
  const subdirs = ['workflows', 'personas', 'skills', 'templates'];
  for (const sub of subdirs) {
    const subDir = path.join(dir, '.forge', sub);
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(subDir, 'example.md'), `# ${sub}\n`, 'utf8');
  }
}

// ── Wave 1a: Phase 1 ─────────────────────────────────────────────────────────

describe('verify-phase --phase 1', () => {
  let tmpDir;
  before(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-test-')); });
  after(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('exits 0 when config.json is valid and has all required fields', () => {
    writeValidConfig(tmpDir);
    const r = run(['--phase', '1'], tmpDir);
    assert.equal(r.code, 0, `Expected exit 0, got ${r.code}. stderr: ${r.stderr}`);
  });

  it('exits 1 when .forge/config.json does not exist', () => {
    const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-no-cfg-'));
    try {
      const r = run(['--phase', '1'], fresh);
      assert.equal(r.code, 1, `Expected exit 1, got ${r.code}`);
      const out = JSON.parse(r.stdout);
      assert.ok(Array.isArray(out.missing), 'missing should be array');
      assert.ok(out.missing.includes('.forge/config.json'), `missing should include .forge/config.json, got ${JSON.stringify(out.missing)}`);
    } finally {
      fs.rmSync(fresh, { recursive: true, force: true });
    }
  });

  it('exits 1 when config.json is malformed JSON', () => {
    const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-bad-json-'));
    try {
      const forgeDir = path.join(fresh, '.forge');
      fs.mkdirSync(forgeDir, { recursive: true });
      fs.writeFileSync(path.join(forgeDir, 'config.json'), '{ not valid json', 'utf8');
      const r = run(['--phase', '1'], fresh);
      assert.equal(r.code, 1, `Expected exit 1, got ${r.code}`);
      const out = JSON.parse(r.stdout);
      assert.ok(out.reason && /JSON parse/i.test(out.reason), `reason should mention JSON parse, got ${out.reason}`);
    } finally {
      fs.rmSync(fresh, { recursive: true, force: true });
    }
  });

  const requiredFields = [
    'version',
    'project.name',
    'project.prefix',
    'stack',
    'commands',
    'paths.engineering',
    'paths.store',
    'paths.workflows',
  ];

  for (const field of requiredFields) {
    it(`exits 1 when "${field}" is missing from config.json`, () => {
      const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-missing-'));
      try {
        writeValidConfig(fresh, [field]);
        const r = run(['--phase', '1'], fresh);
        assert.equal(r.code, 1, `Expected exit 1 for missing ${field}, got ${r.code}`);
        const out = JSON.parse(r.stdout);
        assert.ok(out.missing.includes(field), `missing should include ${field}, got ${JSON.stringify(out.missing)}`);
      } finally {
        fs.rmSync(fresh, { recursive: true, force: true });
      }
    });
  }

  it('JSON output has phase, ok, missing, checked fields on exit 1', () => {
    const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-shape-'));
    try {
      const r = run(['--phase', '1'], fresh);
      assert.equal(r.code, 1);
      const out = JSON.parse(r.stdout);
      assert.equal(out.phase, 1, 'phase should be 1');
      assert.equal(out.ok, false, 'ok should be false');
      assert.ok(Array.isArray(out.missing), 'missing should be array');
      assert.ok(Array.isArray(out.checked), 'checked should be array');
      assert.ok(out.checked.length > 0, 'checked should be non-empty');
    } finally {
      fs.rmSync(fresh, { recursive: true, force: true });
    }
  });
});

// ── Wave 1b: Phase 1 --foundation-only ───────────────────────────────────────

describe('verify-phase --phase 1 --foundation-only', () => {
  let tmpDir;
  before(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-fo-')); });
  after(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('exits 0 when project.name and project.prefix are present', () => {
    writeValidConfig(tmpDir);
    const r = run(['--phase', '1', '--foundation-only'], tmpDir);
    assert.equal(r.code, 0, `Expected exit 0, got ${r.code}. stderr: ${r.stderr}`);
  });

  it('exits 1 when project.name is missing', () => {
    const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-fo-noname-'));
    try {
      writeValidConfig(fresh, ['project.name']);
      const r = run(['--phase', '1', '--foundation-only'], fresh);
      assert.equal(r.code, 1);
      const out = JSON.parse(r.stdout);
      assert.ok(out.missing.includes('project.name'));
    } finally {
      fs.rmSync(fresh, { recursive: true, force: true });
    }
  });

  it('exits 1 when project.prefix is missing', () => {
    const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-fo-noprefix-'));
    try {
      writeValidConfig(fresh, ['project.prefix']);
      const r = run(['--phase', '1', '--foundation-only'], fresh);
      assert.equal(r.code, 1);
      const out = JSON.parse(r.stdout);
      assert.ok(out.missing.includes('project.prefix'));
    } finally {
      fs.rmSync(fresh, { recursive: true, force: true });
    }
  });

  it('exits 1 when config.json does not exist', () => {
    const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-fo-nocfg-'));
    try {
      const r = run(['--phase', '1', '--foundation-only'], fresh);
      assert.equal(r.code, 1);
    } finally {
      fs.rmSync(fresh, { recursive: true, force: true });
    }
  });
});

// ── Wave 1c: Phase 2 ─────────────────────────────────────────────────────────

describe('verify-phase --phase 2 --kb-path', () => {
  let tmpDir;
  before(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-p2-')); });
  after(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('exits 0 when all 7 arch docs exist', () => {
    writeArchDocs(tmpDir, 'engineering');
    const r = run(['--phase', '2', '--kb-path', 'engineering'], tmpDir);
    assert.equal(r.code, 0, `Expected exit 0, got ${r.code}. stderr: ${r.stderr}`);
  });

  it('exits 1 when an arch doc is missing', () => {
    const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-p2-missing-'));
    try {
      writeArchDocs(fresh, 'engineering');
      // Remove one doc
      fs.rmSync(path.join(fresh, 'engineering', 'architecture', 'database.md'));
      const r = run(['--phase', '2', '--kb-path', 'engineering'], fresh);
      assert.equal(r.code, 1);
      const out = JSON.parse(r.stdout);
      assert.ok(out.missing.some(m => m.includes('database')), `missing should include database, got ${JSON.stringify(out.missing)}`);
    } finally {
      fs.rmSync(fresh, { recursive: true, force: true });
    }
  });

  it('lists all missing docs in the JSON output', () => {
    const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-p2-allm-'));
    try {
      // No arch docs at all
      const r = run(['--phase', '2', '--kb-path', 'engineering'], fresh);
      assert.equal(r.code, 1);
      const out = JSON.parse(r.stdout);
      assert.equal(out.missing.length, 7, `Expected 7 missing, got ${JSON.stringify(out.missing)}`);
    } finally {
      fs.rmSync(fresh, { recursive: true, force: true });
    }
  });
});

// ── Wave 1d: Phase 3 ─────────────────────────────────────────────────────────

describe('verify-phase --phase 3', () => {
  let tmpDir;
  before(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-p3-')); });
  after(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('exits 0 when all 4 .forge subdirectories are non-empty', () => {
    writePhase3Dirs(tmpDir);
    const r = run(['--phase', '3'], tmpDir);
    assert.equal(r.code, 0, `Expected exit 0, got ${r.code}. stderr: ${r.stderr}`);
  });

  it('exits 1 when .forge/workflows is empty', () => {
    const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-p3-empty-'));
    try {
      writePhase3Dirs(fresh);
      // Remove the file from workflows
      fs.readdirSync(path.join(fresh, '.forge', 'workflows')).forEach(f =>
        fs.rmSync(path.join(fresh, '.forge', 'workflows', f))
      );
      const r = run(['--phase', '3'], fresh);
      assert.equal(r.code, 1);
      const out = JSON.parse(r.stdout);
      assert.ok(out.missing.some(m => m.includes('workflows')), `missing should include workflows, got ${JSON.stringify(out.missing)}`);
    } finally {
      fs.rmSync(fresh, { recursive: true, force: true });
    }
  });

  it('exits 1 when all 4 dirs are empty', () => {
    const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-p3-allempty-'));
    try {
      // Create empty .forge subdirs
      const subdirs = ['workflows', 'personas', 'skills', 'templates'];
      for (const sub of subdirs) {
        fs.mkdirSync(path.join(fresh, '.forge', sub), { recursive: true });
      }
      const r = run(['--phase', '3'], fresh);
      assert.equal(r.code, 1);
      const out = JSON.parse(r.stdout);
      assert.equal(out.missing.length, 4, `Expected 4 missing, got ${JSON.stringify(out.missing)}`);
    } finally {
      fs.rmSync(fresh, { recursive: true, force: true });
    }
  });
});

// ── Wave 1e: Bad args ─────────────────────────────────────────────────────────

describe('verify-phase — bad args', () => {
  let tmpDir;
  before(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-badargs-')); });
  after(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('exits 2 when --phase 5 (out of range)', () => {
    const r = run(['--phase', '5'], tmpDir);
    assert.equal(r.code, 2, `Expected exit 2, got ${r.code}. stderr: ${r.stderr}`);
  });

  it('exits 2 when --phase 0 (out of range)', () => {
    const r = run(['--phase', '0'], tmpDir);
    assert.equal(r.code, 2, `Expected exit 2, got ${r.code}`);
  });

  it('exits 2 when --phase is omitted', () => {
    const r = run([], tmpDir);
    assert.equal(r.code, 2, `Expected exit 2, got ${r.code}`);
  });

  it('exits 2 when --phase 2 is given without --kb-path', () => {
    const r = run(['--phase', '2'], tmpDir);
    assert.equal(r.code, 2, `Expected exit 2, got ${r.code}. stderr: ${r.stderr}`);
  });

  it('stderr contains usage info on bad args', () => {
    const r = run(['--phase', '99'], tmpDir);
    assert.equal(r.code, 2);
    assert.ok(r.stderr.length > 0, 'stderr should be non-empty on bad args');
  });
});
