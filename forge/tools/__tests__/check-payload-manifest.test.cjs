'use strict';

// check-payload-manifest.test.cjs — written test-first (Iron Law 2) for
// FORGE-S32-T02. Pins the source-drift contract of check-payload-manifest.cjs:
//   (a) every manifest entry's `source` resolves on disk (missing-source),
//   (b) kind file/dir matches the on-disk type (kind-mismatch),
//   (c) curated `include` lists are forward-checked (listed name must exist),
//   (d) recursive/full dir entries are orphan-checked (an on-disk file that no
//       entry claims and no exclude covers is drift),
//   (e) curated subtrees are NOT orphan-flagged for unlisted siblings,
//   (f) the CLI sets exit 0 (green) / 1 (findings) and honours --forge-root,
//   (g) the real forge/forge/ tree is green against the authored manifest.

const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { checkManifest } = require('../check-payload-manifest.cjs');

const TOOL = path.join(__dirname, '..', 'check-payload-manifest.cjs');
const REAL_FORGE_ROOT = path.join(__dirname, '..', '..');

// Build a temp forge-root from a { relpath: content|null } spec. A null value
// creates a directory; a string creates a file with that content.
function makeForgeRoot(spec) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'payload-manifest-test-'));
  for (const [rel, content] of Object.entries(spec)) {
    const full = path.join(root, rel);
    if (content === null) {
      fs.mkdirSync(full, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content);
    }
  }
  return root;
}

function writeManifest(root, manifest) {
  fs.writeFileSync(
    path.join(root, 'payload-manifest.json'),
    JSON.stringify(manifest, null, 2),
  );
}

function rm(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

describe('checkManifest', () => {
  let root;
  afterEach(() => {
    if (root) {
      rm(root);
      root = null;
    }
  });

  test('green tree → ok:true, empty missing/orphans', () => {
    root = makeForgeRoot({
      'tools/store-cli.cjs': '// tool',
      'tools/banners.cjs': '// tool',
      'tools/extra-not-listed.cjs': '// curated exclusion',
      'hooks/check-update.cjs': '// hook',
      'hooks/README.md': '# readme',
      'schemas/task.schema.json': '{}',
      'schemas/_defs/locator.schema.json': '{}',
      'schemas/enum-catalog.json': '{}',
      'integrity.json': '{}',
    });
    writeManifest(root, {
      entries: [
        { source: 'tools', kind: 'dir', bundle: 'tools/', install: '.forge/tools/', owner: 'forge-scaffold',
          select: { recursive: false, ext: ['.cjs'], include: ['store-cli.cjs', 'banners.cjs'] } },
        { source: 'hooks', kind: 'dir', bundle: 'hooks/', install: '.forge/tools/hooks/', owner: 'forge-scaffold',
          select: { recursive: false, ext: ['.cjs'], exclude: ['README.md'] } },
        { source: 'schemas', kind: 'dir', bundle: '.schemas/', install: '.forge/schemas/', owner: 'forge-scaffold',
          select: { recursive: true, ext: ['.schema.json'], exclude: ['__tests__'] } },
        { source: 'schemas/enum-catalog.json', kind: 'file', bundle: '.schemas/enum-catalog.json', install: '.forge/schemas/', owner: 'forge-scaffold' },
        { source: 'integrity.json', kind: 'file', bundle: 'integrity.json', install: '.forge/', owner: 'forge-scaffold' },
      ],
    });
    const res = checkManifest(root);
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.deepEqual(res.missing, []);
    assert.deepEqual(res.orphans, []);
  });

  test('missing source → reported, ok:false', () => {
    root = makeForgeRoot({ 'tools/store-cli.cjs': '// tool' });
    writeManifest(root, {
      entries: [
        { source: 'tools/store-cli.cjs', kind: 'file', bundle: 'tools/store-cli.cjs', install: '.forge/tools/', owner: 'forge-scaffold' },
        { source: 'tools/does-not-exist.cjs', kind: 'file', bundle: 'tools/does-not-exist.cjs', install: '.forge/tools/', owner: 'forge-scaffold' },
      ],
    });
    const res = checkManifest(root);
    assert.equal(res.ok, false);
    assert.equal(res.missing.length, 1);
    assert.match(res.missing[0].source, /does-not-exist/);
  });

  test('curated include missing a listed name → reported', () => {
    root = makeForgeRoot({ 'tools/store-cli.cjs': '// tool' });
    writeManifest(root, {
      entries: [
        { source: 'tools', kind: 'dir', bundle: 'tools/', install: '.forge/tools/', owner: 'forge-scaffold',
          select: { recursive: false, ext: ['.cjs'], include: ['store-cli.cjs', 'ghost.cjs'] } },
      ],
    });
    const res = checkManifest(root);
    assert.equal(res.ok, false);
    assert.ok(res.missing.some((m) => /ghost\.cjs/.test(m.source)));
  });

  test('orphan: file under recursive dir entry matching no filter and no exclude → reported', () => {
    root = makeForgeRoot({
      'schemas/task.schema.json': '{}',
      'schemas/drifted.txt': 'surprise',
    });
    writeManifest(root, {
      entries: [
        { source: 'schemas', kind: 'dir', bundle: '.schemas/', install: '.forge/schemas/', owner: 'forge-scaffold',
          select: { recursive: true, ext: ['.schema.json'] } },
      ],
    });
    const res = checkManifest(root);
    assert.equal(res.ok, false);
    assert.equal(res.orphans.length, 1);
    assert.match(res.orphans[0].file, /drifted\.txt/);
  });

  test('curated subtree: unlisted sibling is NOT an orphan', () => {
    root = makeForgeRoot({
      'tools/store-cli.cjs': '// tool',
      'tools/deliberately-excluded.cjs': '// minimal-payload exclusion',
    });
    writeManifest(root, {
      entries: [
        { source: 'tools', kind: 'dir', bundle: 'tools/', install: '.forge/tools/', owner: 'forge-scaffold',
          select: { recursive: false, ext: ['.cjs'], include: ['store-cli.cjs'] } },
      ],
    });
    const res = checkManifest(root);
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.deepEqual(res.orphans, []);
  });

  test('kind mismatch: entry kind:file resolving to a directory → reported', () => {
    root = makeForgeRoot({ 'schemas': null });
    writeManifest(root, {
      entries: [
        { source: 'schemas', kind: 'file', bundle: 'schemas', install: '.forge/schemas/', owner: 'forge-scaffold' },
      ],
    });
    const res = checkManifest(root);
    assert.equal(res.ok, false);
    assert.ok(res.missing.some((m) => /schemas/.test(m.source) && /kind/i.test(m.reason)));
  });

  test('synthesized entry skips missing-source check', () => {
    root = makeForgeRoot({ 'tools/store-cli.cjs': '// tool' });
    writeManifest(root, {
      entries: [
        { source: 'tools/package.json', kind: 'file', bundle: 'tools/package.json', install: '.forge/tools/', owner: 'forge-scaffold', synthesized: true },
      ],
    });
    const res = checkManifest(root);
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.deepEqual(res.missing, []);
  });
});

describe('bundle-only invariant (FORGE-BUG-044)', () => {
  let root;
  afterEach(() => {
    if (root) {
      rm(root);
      root = null;
    }
  });

  test('bundleOnly:true entry with no install → ok:true, no inconsistencies', () => {
    root = makeForgeRoot({ 'migrations.json': '{}' });
    writeManifest(root, {
      entries: [
        { source: 'migrations.json', kind: 'file', bundle: '.schemas/migrations.json', owner: 'forge-scaffold', bundleOnly: true },
      ],
    });
    const res = checkManifest(root);
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.deepEqual(res.inconsistencies, []);
  });

  test('bundleOnly:true entry that ALSO declares install → reported, ok:false', () => {
    root = makeForgeRoot({ 'migrations.json': '{}' });
    writeManifest(root, {
      entries: [
        { source: 'migrations.json', kind: 'file', bundle: '.schemas/migrations.json', install: '.forge/schemas/', owner: 'forge-scaffold', bundleOnly: true },
      ],
    });
    const res = checkManifest(root);
    assert.equal(res.ok, false, JSON.stringify(res));
    assert.equal(res.inconsistencies.length, 1);
    assert.match(res.inconsistencies[0].source, /migrations\.json/);
    assert.match(res.inconsistencies[0].reason, /bundleOnly/i);
  });

  test('non-bundleOnly entry missing install → reported, ok:false', () => {
    root = makeForgeRoot({ 'tools/store-cli.cjs': '// tool' });
    writeManifest(root, {
      entries: [
        { source: 'tools/store-cli.cjs', kind: 'file', bundle: 'tools/store-cli.cjs', owner: 'forge-scaffold' },
      ],
    });
    const res = checkManifest(root);
    assert.equal(res.ok, false, JSON.stringify(res));
    assert.equal(res.inconsistencies.length, 1);
    assert.match(res.inconsistencies[0].source, /store-cli\.cjs/);
    assert.match(res.inconsistencies[0].reason, /install/i);
  });

  test('non-bundleOnly entry with non-empty install → ok:true', () => {
    root = makeForgeRoot({ 'tools/store-cli.cjs': '// tool' });
    writeManifest(root, {
      entries: [
        { source: 'tools/store-cli.cjs', kind: 'file', bundle: 'tools/store-cli.cjs', install: '.forge/tools/', owner: 'forge-scaffold' },
      ],
    });
    const res = checkManifest(root);
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.deepEqual(res.inconsistencies, []);
  });
});

describe('check-payload-manifest CLI', () => {
  let root;
  afterEach(() => {
    if (root) {
      rm(root);
      root = null;
    }
  });

  test('exit 0 on green tree with --forge-root', () => {
    root = makeForgeRoot({ 'tools/store-cli.cjs': '// tool' });
    writeManifest(root, {
      entries: [
        { source: 'tools/store-cli.cjs', kind: 'file', bundle: 'tools/store-cli.cjs', install: '.forge/tools/', owner: 'forge-scaffold' },
      ],
    });
    const r = spawnSync('node', [TOOL, '--forge-root', root], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });

  test('exit 1 on findings with --forge-root', () => {
    root = makeForgeRoot({ 'tools/store-cli.cjs': '// tool' });
    writeManifest(root, {
      entries: [
        { source: 'tools/ghost.cjs', kind: 'file', bundle: 'tools/ghost.cjs', install: '.forge/tools/', owner: 'forge-scaffold' },
      ],
    });
    const r = spawnSync('node', [TOOL, '--forge-root', root], { encoding: 'utf8' });
    assert.equal(r.status, 1, r.stdout + r.stderr);
  });
});

describe('real forge/forge tree', () => {
  test('authored payload-manifest.json is green against HEAD', () => {
    const res = checkManifest(REAL_FORGE_ROOT);
    assert.equal(res.ok, true, `missing=${JSON.stringify(res.missing)}\norphans=${JSON.stringify(res.orphans)}`);
  });
});
