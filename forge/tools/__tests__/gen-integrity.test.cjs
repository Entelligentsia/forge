'use strict';
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

let tmpDir;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-integrity-test-'));
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

describe('gen-integrity.cjs', () => {
  test('generates correct SHA256 for known file content', () => {
    const { computeHash } = require('../gen-integrity.cjs');
    const known = 'hello forge\n';
    const expected = sha256(known);
    const filePath = path.join(tmpDir, 'known.txt');
    fs.writeFileSync(filePath, known);
    assert.equal(computeHash(filePath), expected);
  });

  test('includes all declared file categories (commands, agents, hooks, tools/verify)', () => {
    const { buildFileList } = require('../gen-integrity.cjs');
    const forgeRoot = path.join(tmpDir, 'forge-root');
    fs.mkdirSync(path.join(forgeRoot, 'commands'), { recursive: true });
    fs.mkdirSync(path.join(forgeRoot, 'agents'), { recursive: true });
    fs.mkdirSync(path.join(forgeRoot, 'hooks'), { recursive: true });
    fs.mkdirSync(path.join(forgeRoot, 'tools'), { recursive: true });

    fs.writeFileSync(path.join(forgeRoot, 'commands', 'ask.md'), '# ask');
    fs.writeFileSync(path.join(forgeRoot, 'agents', 'tomoshibi.md'), '# tomoshibi');
    fs.writeFileSync(path.join(forgeRoot, 'hooks', 'check-update.js'), '// hook');
    fs.writeFileSync(path.join(forgeRoot, 'tools', 'verify-integrity.cjs'), '// verify');

    const files = buildFileList(forgeRoot);
    const relPaths = Object.keys(files);

    assert.ok(relPaths.some(p => p.startsWith('commands/')), 'should include commands/');
    assert.ok(relPaths.some(p => p.startsWith('agents/')), 'should include agents/');
    assert.ok(relPaths.some(p => p.startsWith('hooks/')), 'should include hooks/');
    assert.ok(relPaths.includes('tools/verify-integrity.cjs'), 'should include verify-integrity.cjs');
  });

  test('writes valid JSON with expected top-level fields', () => {
    const { generateManifest } = require('../gen-integrity.cjs');
    const forgeRoot = path.join(tmpDir, 'forge-root2');
    fs.mkdirSync(path.join(forgeRoot, 'commands'), { recursive: true });
    fs.mkdirSync(path.join(forgeRoot, 'agents'), { recursive: true });
    fs.mkdirSync(path.join(forgeRoot, 'hooks'), { recursive: true });
    fs.mkdirSync(path.join(forgeRoot, 'tools'), { recursive: true });
    fs.writeFileSync(path.join(forgeRoot, 'commands', 'health.md'), '# health');
    fs.writeFileSync(path.join(forgeRoot, 'tools', 'verify-integrity.cjs'), '// v');

    const outPath = path.join(tmpDir, 'integrity.json');
    generateManifest(forgeRoot, outPath, '0.12.6');

    const raw = fs.readFileSync(outPath, 'utf8');
    const obj = JSON.parse(raw);
    assert.ok('version' in obj, 'missing version');
    assert.ok('generated' in obj, 'missing generated');
    assert.ok('note' in obj, 'missing note');
    assert.ok('files' in obj, 'missing files');
    assert.equal(obj.version, '0.12.6');
    assert.ok(typeof obj.files === 'object');
  });

  test('handles missing files gracefully (warns and continues)', () => {
    const { buildFileList } = require('../gen-integrity.cjs');
    const forgeRoot = path.join(tmpDir, 'forge-root3');
    fs.mkdirSync(path.join(forgeRoot, 'commands'), { recursive: true });
    fs.mkdirSync(path.join(forgeRoot, 'agents'), { recursive: true });
    fs.mkdirSync(path.join(forgeRoot, 'hooks'), { recursive: true });
    fs.mkdirSync(path.join(forgeRoot, 'tools'), { recursive: true });

    // No files created — directories are empty
    assert.doesNotThrow(() => buildFileList(forgeRoot));
    const files = buildFileList(forgeRoot);
    assert.ok(typeof files === 'object');
  });
});
