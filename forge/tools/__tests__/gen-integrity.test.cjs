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

  // New test for forge#71-bug6 Part A: version field must match plugin.json version
  test('integrity.json version field matches the version passed to generateManifest', () => {
    const { generateManifest } = require('../gen-integrity.cjs');
    const forgeRoot = path.join(tmpDir, 'forge-root4');
    fs.mkdirSync(path.join(forgeRoot, 'commands'), { recursive: true });
    fs.mkdirSync(path.join(forgeRoot, 'agents'), { recursive: true });
    fs.mkdirSync(path.join(forgeRoot, 'hooks'), { recursive: true });
    fs.mkdirSync(path.join(forgeRoot, 'tools'), { recursive: true });
    fs.writeFileSync(path.join(forgeRoot, 'commands', 'health.md'), '# health');
    fs.writeFileSync(path.join(forgeRoot, 'tools', 'verify-integrity.cjs'), '// verify');

    const outPath = path.join(tmpDir, 'integrity-version-check.json');
    const pluginVersion = '0.32.0';
    generateManifest(forgeRoot, outPath, pluginVersion);

    const obj = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    assert.equal(obj.version, pluginVersion,
      `integrity.json version (${obj.version}) must match plugin version passed in (${pluginVersion})`);
  });

  // New test for forge#71-bug6 Part A: hashes in integrity.json match on-disk files
  test('integrity.json hashes match on-disk file contents', () => {
    const { generateManifest, computeHash } = require('../gen-integrity.cjs');
    const forgeRoot = path.join(tmpDir, 'forge-root5');
    fs.mkdirSync(path.join(forgeRoot, 'commands'), { recursive: true });
    fs.mkdirSync(path.join(forgeRoot, 'agents'), { recursive: true });
    fs.mkdirSync(path.join(forgeRoot, 'hooks'), { recursive: true });
    fs.mkdirSync(path.join(forgeRoot, 'tools'), { recursive: true });

    const knownContent = 'known content for hash verification\n';
    const cmdPath = path.join(forgeRoot, 'commands', 'test-cmd.md');
    const hookPath = path.join(forgeRoot, 'hooks', 'test-hook.js');
    const verifyPath = path.join(forgeRoot, 'tools', 'verify-integrity.cjs');

    fs.writeFileSync(cmdPath, knownContent);
    fs.writeFileSync(hookPath, '// hook content\n');
    fs.writeFileSync(verifyPath, '// verify content\n');

    const outPath = path.join(tmpDir, 'integrity-hash-check.json');
    generateManifest(forgeRoot, outPath, '0.32.0');

    const obj = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    const fileEntries = Object.entries(obj.files);
    assert.ok(fileEntries.length > 0, 'integrity.json must contain at least one file entry');

    for (const [relPath, storedHash] of fileEntries) {
      const absPath = path.join(forgeRoot, relPath);
      if (!fs.existsSync(absPath)) continue; // skip verify-integrity.cjs if not present
      const actualHash = computeHash(absPath);
      assert.equal(storedHash, actualHash,
        `Hash mismatch for ${relPath}: stored=${storedHash}, actual=${actualHash}`);
    }
  });

  // New test for forge#71-bug6 Part B: build-manifest.cjs regenerates integrity.json
  test('build-manifest.cjs generates integrity.json when run as CLI', () => {
    const { spawnSync } = require('node:child_process');
    const buildManifest = path.resolve(__dirname, '..', 'build-manifest.cjs');

    const forgeRoot = path.join(tmpDir, 'forge-root-bm');
    // Minimal forge structure needed by build-manifest
    const dirs = ['meta/personas', 'meta/skills', 'meta/workflows', 'meta/workflows/_fragments',
                  'meta/templates', 'schemas', '.claude-plugin',
                  'commands', 'agents', 'hooks', 'tools'];
    for (const d of dirs) fs.mkdirSync(path.join(forgeRoot, d), { recursive: true });

    fs.writeFileSync(
      path.join(forgeRoot, '.claude-plugin', 'plugin.json'),
      JSON.stringify({ version: '0.99.0' }),
    );
    // Add a hook file so integrity.json has something to hash
    fs.writeFileSync(path.join(forgeRoot, 'hooks', 'check-update.js'), '// hook\n');
    fs.writeFileSync(path.join(forgeRoot, 'tools', 'verify-integrity.cjs'), '// verify\n');

    const r = spawnSync(
      process.execPath,
      [buildManifest, '--forge-root', forgeRoot],
      { encoding: 'utf8' },
    );

    assert.equal(r.status, 0, `build-manifest.cjs failed: ${r.stderr}`);

    const integrityPath = path.join(forgeRoot, 'integrity.json');
    assert.ok(fs.existsSync(integrityPath),
      'build-manifest.cjs must generate integrity.json alongside structure-manifest.json');

    const obj = JSON.parse(fs.readFileSync(integrityPath, 'utf8'));
    assert.equal(obj.version, '0.99.0',
      'integrity.json version must match plugin.json version');
    assert.ok(typeof obj.files === 'object' && Object.keys(obj.files).length > 0,
      'integrity.json must contain file hash entries');
  });
});
