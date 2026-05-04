'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  extractDoc,
  buildContextPack,
  computeSourceHash,
  writeContextPack,
} = require('../build-context-pack.cjs');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const STACK_MD = `# Technical Stack

This project uses Node.js with a plugin-based architecture.

## Key components

- **Plugin runtime** — loads and executes .cjs tools
- **Store layer** — JSON-backed task and sprint records

## Key constraints

- All scripts must be pure CommonJS (no ESM)
- No network calls from tool scripts
`;

const CONVENTIONS_MD = `# Coding Conventions

We follow a strict set of conventions for consistency.

## Key patterns

- TDD first — write failing test before implementation
- Atomic writes via tmp + rename for all file output

## Summary

Conventions are enforced by the test suite and linter.
`;

const MINIMAL_MD = `# Minimal Doc

A minimal architecture document with only a title and first paragraph.
No Key or Summary sections.
`;

const DRAFT_MD = `# Draft Document

This is a draft and should be skipped.
`;

// ── Helpers ──────────────────────────────────────────────────────────────────

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-pack-'));
}

function setupFixture() {
  const root = tmpdir();
  const archDir = path.join(root, 'architecture');
  fs.mkdirSync(archDir, { recursive: true });
  fs.writeFileSync(path.join(archDir, 'stack.md'), STACK_MD);
  fs.writeFileSync(path.join(archDir, 'conventions.md'), CONVENTIONS_MD);
  fs.writeFileSync(path.join(archDir, 'minimal.md'), MINIMAL_MD);
  fs.writeFileSync(path.join(archDir, 'ignored.draft.md'), DRAFT_MD);
  return { root, archDir };
}

// ── extractDoc ───────────────────────────────────────────────────────────────

describe('extractDoc', () => {
  test('extracts H1, first paragraph, and Key/Summary sections', () => {
    const root = tmpdir();
    const file = path.join(root, 'stack.md');
    fs.writeFileSync(file, STACK_MD);
    const doc = extractDoc(file);

    assert.equal(doc.title, 'Technical Stack');
    assert.match(doc.firstPara, /Node\.js with a plugin-based architecture/);
    assert.ok(doc.sections['Key components']);
    assert.match(doc.sections['Key components'], /Plugin runtime/);
    assert.ok(doc.sections['Key constraints']);
    assert.match(doc.sections['Key constraints'], /pure CommonJS/);
    assert.equal(doc.lineCount, STACK_MD.split('\n').length - 1); // trailing newline
  });

  test('extracts Summary sections', () => {
    const root = tmpdir();
    const file = path.join(root, 'conventions.md');
    fs.writeFileSync(file, CONVENTIONS_MD);
    const doc = extractDoc(file);

    assert.equal(doc.title, 'Coding Conventions');
    assert.ok(doc.sections['Key patterns']);
    assert.ok(doc.sections['Summary']);
    assert.match(doc.sections['Summary'], /Conventions are enforced/);
  });

  test('handles doc with no Key or Summary sections gracefully', () => {
    const root = tmpdir();
    const file = path.join(root, 'minimal.md');
    fs.writeFileSync(file, MINIMAL_MD);
    const doc = extractDoc(file);

    assert.equal(doc.title, 'Minimal Doc');
    assert.match(doc.firstPara, /minimal architecture document/);
    assert.deepEqual(doc.sections, {});
  });

  test('throws descriptive error for non-existent file', () => {
    assert.throws(
      () => extractDoc('/nonexistent/path/foo.md'),
      /ENOENT|no such file/i,
    );
  });
});

// ── buildContextPack ─────────────────────────────────────────────────────────

describe('buildContextPack', () => {
  test('builds pack from fixture directory with expected structure', () => {
    const { archDir } = setupFixture();
    const pack = buildContextPack({ archDir });

    assert.equal(pack.version, 1);
    assert.ok(pack.built_at);
    assert.match(pack.source_hash, /^sha256:[0-9a-f]{64}$/);
    assert.ok(Array.isArray(pack.sources));
    assert.equal(pack.sources.length, 3); // stack, conventions, minimal (draft skipped)

    // Verify draft is excluded
    const paths = pack.sources.map((s) => s.path);
    assert.ok(paths.some((p) => p.includes('stack.md')));
    assert.ok(paths.some((p) => p.includes('conventions.md')));
    assert.ok(paths.some((p) => p.includes('minimal.md')));
    assert.ok(!paths.some((p) => p.includes('draft')));
  });

  test('throws descriptive error when arch directory is missing', () => {
    assert.throws(
      () => buildContextPack({ archDir: '/nonexistent/engineering/architecture' }),
      /not found|does not exist|ENOENT/i,
    );
  });

  test('produces pack markdown with section content from docs', () => {
    const { archDir } = setupFixture();
    const pack = buildContextPack({ archDir });

    assert.match(pack.markdown, /# Architecture Context Pack/);
    assert.match(pack.markdown, /## File index/);
    assert.match(pack.markdown, /stack\.md/);
    assert.match(pack.markdown, /conventions\.md/);
    // Key sections from docs should appear
    assert.match(pack.markdown, /Key components/);
    assert.match(pack.markdown, /Key patterns/);
    assert.match(pack.markdown, /Key constraints/);
    assert.match(pack.markdown, /Plugin runtime/);
    assert.match(pack.markdown, /TDD first/);
  });

  test('skips *.draft.md files', () => {
    const { archDir } = setupFixture();
    const pack = buildContextPack({ archDir });

    assert.ok(!pack.markdown.includes('Draft Document'));
    assert.ok(!pack.markdown.includes('ignored.draft'));
  });

  test('respects manual: true frontmatter — skips rebuild', () => {
    const { archDir } = setupFixture();

    // First build to get a pack
    const first = buildContextPack({ archDir });

    // Create an existing pack with manual: true
    const root = path.dirname(archDir);
    const outMd = path.join(root, 'context-pack.md');
    const existingContent = `---\nmanual: true\n---\n\n# Manual override\n\nThis was hand-written.\n`;
    fs.writeFileSync(outMd, existingContent);

    // Build with existing manual pack
    const result = buildContextPack({ archDir, existingPackPath: outMd });
    assert.equal(result.skipped, true, 'should skip when manual: true');
  });
});

// ── computeSourceHash ────────────────────────────────────────────────────────

describe('computeSourceHash', () => {
  test('returns a sha256: prefixed hex string', () => {
    const { archDir } = setupFixture();
    const h = computeSourceHash(archDir);
    assert.match(h, /^sha256:[0-9a-f]{64}$/);
  });

  test('is deterministic across calls on identical inputs', () => {
    const { archDir } = setupFixture();
    const h1 = computeSourceHash(archDir);
    const h2 = computeSourceHash(archDir);
    assert.equal(h1, h2);
  });

  test('changes when a source file is modified', () => {
    const { archDir } = setupFixture();
    const before = computeSourceHash(archDir);

    // Force a mtime change by touching the file with new content
    const stackFile = path.join(archDir, 'stack.md');
    fs.writeFileSync(stackFile, STACK_MD + '\n<!-- modified -->\n');

    const after = computeSourceHash(archDir);
    assert.notEqual(before, after);
  });

  test('excludes *.draft.md from hash computation', () => {
    const { archDir } = setupFixture();
    const before = computeSourceHash(archDir);

    // Modify draft file — hash should not change
    const draftFile = path.join(archDir, 'ignored.draft.md');
    fs.writeFileSync(draftFile, DRAFT_MD + '\n<!-- modified -->\n');

    const after = computeSourceHash(archDir);
    assert.equal(before, after);
  });

  test('throws descriptive error when arch directory is missing', () => {
    assert.throws(
      () => computeSourceHash('/nonexistent/path'),
      /not found|does not exist|ENOENT/i,
    );
  });

  // FR-012: hash must be content-based (not mtime-based).
  // A touch that changes only mtime must produce an identical hash.
  test('hash survives mtime change on identical content (FR-012)', async () => {
    const { archDir } = setupFixture();
    const before = computeSourceHash(archDir);

    // Read and re-write the same content to force an mtime change
    const stackFile = path.join(archDir, 'stack.md');
    const content = fs.readFileSync(stackFile, 'utf8');
    await new Promise(r => setTimeout(r, 1100));
    fs.writeFileSync(stackFile, content, 'utf8');

    const after = computeSourceHash(archDir);
    assert.equal(after, before, 'hash must be identical when only mtime changes, not content (FR-012)');
  });
});

// ── writeContextPack ─────────────────────────────────────────────────────────

describe('writeContextPack', () => {
  test('writes md and json files atomically (no .tmp left behind)', () => {
    const root = tmpdir();
    const outMd = path.join(root, 'context-pack.md');
    const outJson = path.join(root, 'context-pack.json');

    const { archDir } = setupFixture();
    const pack = buildContextPack({ archDir });
    writeContextPack(pack, outMd, outJson);

    assert.ok(fs.existsSync(outMd));
    assert.ok(fs.existsSync(outJson));

    // No .tmp files left over
    const tmpFiles = fs.readdirSync(root).filter((f) => f.endsWith('.tmp'));
    assert.deepEqual(tmpFiles, []);
  });

  test('creates parent directories if they do not exist', () => {
    const root = tmpdir();
    const outMd = path.join(root, 'cache', 'subdir', 'context-pack.md');
    const outJson = path.join(root, 'cache', 'subdir', 'context-pack.json');

    const { archDir } = setupFixture();
    const pack = buildContextPack({ archDir });
    writeContextPack(pack, outMd, outJson);

    assert.ok(fs.existsSync(outMd));
    assert.ok(fs.existsSync(outJson));
  });

  test('json output is valid JSON with required fields', () => {
    const root = tmpdir();
    const outMd = path.join(root, 'context-pack.md');
    const outJson = path.join(root, 'context-pack.json');

    const { archDir } = setupFixture();
    const pack = buildContextPack({ archDir });
    writeContextPack(pack, outMd, outJson);

    const parsed = JSON.parse(fs.readFileSync(outJson, 'utf8'));
    assert.equal(parsed.version, 1);
    assert.ok(parsed.built_at);
    assert.match(parsed.source_hash, /^sha256:[0-9a-f]{64}$/);
    assert.ok(Array.isArray(parsed.sources));
    assert.ok(parsed.sources.every((s) => s.path && s.size !== undefined && s.mtime));
    assert.equal(parsed.summary_path, outMd);
  });

  test('prior pack survives when write is to a different path', () => {
    const root = tmpdir();
    const priorContent = '# Prior context pack\n\nHand-written.\n';
    const priorMd = path.join(root, 'old-context-pack.md');
    fs.writeFileSync(priorMd, priorContent);

    const { archDir } = setupFixture();
    const outMd = path.join(root, 'context-pack.md');
    const outJson = path.join(root, 'context-pack.json');
    const pack = buildContextPack({ archDir });
    writeContextPack(pack, outMd, outJson);

    // Prior file still intact
    assert.equal(fs.readFileSync(priorMd, 'utf8'), priorContent);
  });
});

// ── pack size cap ────────────────────────────────────────────────────────────

describe('pack size cap', () => {
  test('pack exceeding 400 lines is truncated with a marker line', () => {
    const root = tmpdir();
    const archDir = path.join(root, 'architecture');
    fs.mkdirSync(archDir, { recursive: true });

    // Create a doc with enough content to push past 400 lines
    const lines = ['# Large Doc', '', 'First paragraph.', '', '## Key patterns', ''];
    for (let i = 0; i < 500; i++) {
      lines.push(`- Pattern item ${i}: some description that takes up space`);
    }
    fs.writeFileSync(path.join(archDir, 'large.md'), lines.join('\n') + '\n');

    const pack = buildContextPack({ archDir });
    const packLines = pack.markdown.split('\n');
    assert.ok(packLines.length <= 401, `pack has ${packLines.length} lines, expected ≤401`);
    assert.ok(
      pack.markdown.includes('<!-- TRUNCATED'),
      'truncation marker should be present',
    );
  });
});
