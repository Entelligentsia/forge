'use strict';
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

let tmpDir;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-integrity-test-'));
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function makeManifest(forgeRoot, fileEntries) {
  const files = {};
  for (const [rel, content] of Object.entries(fileEntries)) {
    const abs = path.join(forgeRoot, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
    files[rel] = sha256(content);
  }
  const manifest = {
    version: '0.12.6',
    generated: '2026-04-18',
    note: 'Tamper-evident only.',
    files,
  };
  fs.writeFileSync(path.join(forgeRoot, 'integrity.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

describe('verify-integrity.cjs', () => {
  test('returns 0 and clean output when all hashes match', () => {
    const { verifyIntegrity } = require('../verify-integrity.cjs');
    const forgeRoot = path.join(tmpDir, 'clean');
    fs.mkdirSync(forgeRoot, { recursive: true });
    makeManifest(forgeRoot, {
      'commands/ask.md': '# ask',
      'agents/tomoshibi.md': '# oracle',
    });

    const result = verifyIntegrity(forgeRoot);
    assert.equal(result.exitCode, 0);
    assert.ok(result.output.includes('〇'), 'should have 〇');
    assert.ok(result.output.includes('unmodified'), 'should say unmodified');
    assert.equal(result.modified.length, 0);
  });

  test('returns 1 and lists modified files when a hash mismatches', () => {
    const { verifyIntegrity } = require('../verify-integrity.cjs');
    const forgeRoot = path.join(tmpDir, 'modified');
    fs.mkdirSync(forgeRoot, { recursive: true });
    makeManifest(forgeRoot, {
      'commands/health.md': '# health',
      'commands/ask.md': '# ask',
    });

    // Now tamper with one file
    fs.writeFileSync(path.join(forgeRoot, 'commands', 'ask.md'), '# ask TAMPERED');

    const result = verifyIntegrity(forgeRoot);
    assert.equal(result.exitCode, 1);
    assert.ok(result.modified.includes('commands/ask.md'), 'should flag tampered file');
    assert.ok(result.output.includes('△'), 'should have △');
  });

  test('returns 1 if integrity.json is missing', () => {
    const { verifyIntegrity } = require('../verify-integrity.cjs');
    const forgeRoot = path.join(tmpDir, 'no-manifest');
    fs.mkdirSync(forgeRoot, { recursive: true });

    const result = verifyIntegrity(forgeRoot);
    assert.equal(result.exitCode, 1);
    assert.ok(result.output.includes('integrity.json'), 'should mention missing manifest');
  });

  test('handles missing plugin files gracefully (reports as modified/missing)', () => {
    const { verifyIntegrity } = require('../verify-integrity.cjs');
    const forgeRoot = path.join(tmpDir, 'missing-files');
    fs.mkdirSync(path.join(forgeRoot, 'commands'), { recursive: true });

    const manifest = {
      version: '0.12.6',
      generated: '2026-04-18',
      note: 'test',
      files: {
        'commands/ghost.md': sha256('# ghost'),
      },
    };
    fs.writeFileSync(path.join(forgeRoot, 'integrity.json'), JSON.stringify(manifest));

    const result = verifyIntegrity(forgeRoot);
    assert.equal(result.exitCode, 1);
    assert.ok(result.missing.includes('commands/ghost.md'), 'should flag missing file');
  });
});
