'use strict';

const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  parseFrontmatter,
  buildPack,
  writePack,
  computeSourceHash,
} = require('../build-persona-pack.cjs');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const PERSONA_ENGINEER = `---
id: engineer
role: engineer
summary: >
  Plans and implements tasks.
  Test-first discipline.
responsibilities:
  - Produce PLAN.md
  - Implement the plan
  - Keep PROGRESS.md current
outputs:
  - PLAN.md
  - PROGRESS.md
file_ref: .forge/personas/engineer.md
---

# Meta-Persona: Engineer

prose body
`;

const PERSONA_ARCHITECT = `---
id: architect
role: architect
summary: Sets direction.
responsibilities:
  - Plan sprints
outputs:
  - Sprint manifest
file_ref: .forge/personas/architect.md
---

# Architect
`;

const SKILL_ENGINEER = `---
id: engineer-skills
applies_to: [engineer]
summary: Concrete engineering capabilities.
capabilities:
  - Read and write code
  - Run tests
file_ref: .forge/skills/engineer-skills.md
---

# Engineer Skills
`;

const SKILL_ARCHITECT = `---
id: architect-skills
applies_to: [architect]
summary: High-level architecture capabilities.
capabilities:
  - Review structure
file_ref: .forge/skills/architect-skills.md
---
`;

// ── Helpers ──────────────────────────────────────────────────────────────────

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'persona-pack-'));
}

function setupFixture() {
  const root = tmpdir();
  const personaDir = path.join(root, 'personas');
  const skillDir = path.join(root, 'skills');
  fs.mkdirSync(personaDir, { recursive: true });
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(personaDir, 'meta-engineer.md'), PERSONA_ENGINEER);
  fs.writeFileSync(path.join(personaDir, 'meta-architect.md'), PERSONA_ARCHITECT);
  fs.writeFileSync(path.join(skillDir, 'meta-engineer-skills.md'), SKILL_ENGINEER);
  fs.writeFileSync(path.join(skillDir, 'meta-architect-skills.md'), SKILL_ARCHITECT);
  return { root, personaDir, skillDir };
}

// ── parseFrontmatter ─────────────────────────────────────────────────────────

describe('parseFrontmatter', () => {
  test('parses scalars, folded scalars, and list items', () => {
    const fm = parseFrontmatter(PERSONA_ENGINEER, 'meta-engineer.md');
    assert.equal(fm.id, 'engineer');
    assert.equal(fm.role, 'engineer');
    assert.match(fm.summary, /Plans and implements tasks\./);
    assert.match(fm.summary, /Test-first discipline\./);
    assert.deepEqual(fm.responsibilities, [
      'Produce PLAN.md',
      'Implement the plan',
      'Keep PROGRESS.md current',
    ]);
    assert.deepEqual(fm.outputs, ['PLAN.md', 'PROGRESS.md']);
    assert.equal(fm.file_ref, '.forge/personas/engineer.md');
  });

  test('parses inline flow lists', () => {
    const fm = parseFrontmatter(SKILL_ENGINEER, 'meta-engineer-skills.md');
    assert.deepEqual(fm.applies_to, ['engineer']);
    assert.deepEqual(fm.capabilities, ['Read and write code', 'Run tests']);
  });

  test('throws when no frontmatter block', () => {
    assert.throws(
      () => parseFrontmatter('# Just a heading\nno fm.\n', '/foo/bar.md'),
      /\/foo\/bar\.md.*frontmatter/i,
    );
  });

  test('throws with file path when frontmatter is unterminated', () => {
    assert.throws(
      () => parseFrontmatter('---\nid: x\nno close\n', '/path/bad.md'),
      /\/path\/bad\.md/,
    );
  });
});

// ── buildPack ────────────────────────────────────────────────────────────────

describe('buildPack', () => {
  test('builds a pack from a fixture directory — round-trips all fields', () => {
    const { personaDir, skillDir } = setupFixture();
    const pack = buildPack({ personaDir, skillDir });

    assert.equal(pack.version, 1);
    assert.ok(pack.built_at);
    assert.match(pack.source_hash, /^sha256:[0-9a-f]{64}$/);

    assert.ok(pack.personas.engineer);
    assert.equal(pack.personas.engineer.role, 'engineer');
    assert.match(pack.personas.engineer.summary, /Plans and implements/);
    assert.deepEqual(pack.personas.engineer.outputs, ['PLAN.md', 'PROGRESS.md']);
    assert.equal(pack.personas.engineer.file_ref, '.forge/personas/engineer.md');

    assert.ok(pack.personas.architect);
    assert.equal(pack.personas.architect.summary, 'Sets direction.');

    assert.ok(pack.skills['engineer-skills']);
    assert.deepEqual(pack.skills['engineer-skills'].applies_to, ['engineer']);
    assert.deepEqual(pack.skills['engineer-skills'].capabilities, [
      'Read and write code',
      'Run tests',
    ]);
    assert.equal(pack.skills['engineer-skills'].file_ref, '.forge/skills/engineer-skills.md');
  });

  test('throws with path-specific error when a persona file lacks frontmatter', () => {
    const { personaDir, skillDir } = setupFixture();
    const badPath = path.join(personaDir, 'meta-broken.md');
    fs.writeFileSync(badPath, '# No frontmatter here\n');
    assert.throws(
      () => buildPack({ personaDir, skillDir }),
      (err) => err.message.includes('meta-broken.md') && /frontmatter/i.test(err.message),
    );
  });

  test('throws clearly on malformed YAML (not a crash)', () => {
    const { personaDir, skillDir } = setupFixture();
    fs.writeFileSync(
      path.join(personaDir, 'meta-malformed.md'),
      '---\nid: x\nunterminated\n',
    );
    assert.throws(
      () => buildPack({ personaDir, skillDir }),
      (err) => err instanceof Error && /meta-malformed\.md/.test(err.message),
    );
  });
});

// ── source_hash ──────────────────────────────────────────────────────────────

describe('source_hash', () => {
  test('stable across runs on identical inputs', () => {
    const { personaDir, skillDir } = setupFixture();
    const a = computeSourceHash({ personaDir, skillDir });
    const b = computeSourceHash({ personaDir, skillDir });
    assert.equal(a, b);
    assert.match(a, /^sha256:[0-9a-f]{64}$/);
  });

  test('changes when a source file changes', () => {
    const { personaDir, skillDir } = setupFixture();
    const before = computeSourceHash({ personaDir, skillDir });
    // Change content (also changes size)
    fs.appendFileSync(path.join(personaDir, 'meta-engineer.md'), '\n# added\n');
    const after = computeSourceHash({ personaDir, skillDir });
    assert.notEqual(before, after);
  });

  // FR-012: hash must be content-based (not mtime-based).
  // A touch that changes only mtime must produce an identical hash.
  test('hash is identical before and after touch (mtime change) on unchanged content', async () => {
    const { personaDir, skillDir } = setupFixture();
    const before = computeSourceHash({ personaDir, skillDir });

    // Read and re-write the same content to force an mtime change
    const engineerFile = path.join(personaDir, 'meta-engineer.md');
    const content = fs.readFileSync(engineerFile, 'utf8');
    // Wait to ensure filesystem mtime changes (1s resolution on many systems)
    await new Promise(r => setTimeout(r, 1100));
    fs.writeFileSync(engineerFile, content, 'utf8');

    const after = computeSourceHash({ personaDir, skillDir });
    assert.equal(after, before, 'hash must be identical when only mtime changes, not content (FR-012)');
  });
});

// ── writePack (atomic) ───────────────────────────────────────────────────────

describe('writePack', () => {
  test('writes atomically via .tmp + rename', () => {
    const { personaDir, skillDir, root } = setupFixture();
    const pack = buildPack({ personaDir, skillDir });
    const out = path.join(root, 'cache', 'persona-pack.json');
    writePack(pack, out);
    assert.ok(fs.existsSync(out));
    // .tmp should not linger
    assert.ok(!fs.existsSync(out + '.tmp'));
    const read = JSON.parse(fs.readFileSync(out, 'utf8'));
    assert.equal(read.version, 1);
    assert.equal(read.personas.engineer.role, 'engineer');
  });

  test('creates parent directory if missing', () => {
    const root = tmpdir();
    const out = path.join(root, 'nested', 'deep', 'pack.json');
    const pack = { version: 1, personas: {}, skills: {}, built_at: '2026-04-19T00:00:00Z', source_hash: 'sha256:0' };
    writePack(pack, out);
    assert.ok(fs.existsSync(out));
  });
});
