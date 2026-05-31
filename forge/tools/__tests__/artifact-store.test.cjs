'use strict';

// Tests for tools/artifact-store.cjs — the ArtifactStore facade + FsArtifactImpl
// (ADR artifact-resolution Phase 3). Mirrors the store.cjs Store/FSImpl shape:
// a backend-agnostic facade delegating to a swappable, synchronous impl.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const mod = require('../artifact-store.cjs');
const { ArtifactStore, FsArtifactImpl, toLocator, fsRefToDir } = mod;

function tmpProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-artstore-'));
  return root;
}

// FsArtifactImpl with an injected resolver so we don't spawn store-cli.
function implFor(root, dirByEntityId) {
  return new FsArtifactImpl({
    projectRoot: root,
    resolveDir: (_entity, entityId) => dirByEntityId[entityId] || null,
  });
}

describe('artifact-store.cjs — facade shape (mirrors store.cjs)', () => {
  test('default export is an ArtifactStore wrapping a swappable impl', () => {
    assert.ok(mod instanceof ArtifactStore, 'default export is an ArtifactStore');
    assert.strictEqual(typeof ArtifactStore, 'function');
    assert.strictEqual(typeof FsArtifactImpl, 'function');
    for (const m of ['read', 'write', 'exists', 'url', 'list', 'delete']) {
      assert.strictEqual(typeof ArtifactStore.prototype[m], 'function', `facade has ${m}`);
    }
  });

  test('facade delegates every verb to the impl', () => {
    const calls = [];
    const fakeImpl = {};
    for (const m of ['read', 'write', 'exists', 'url', 'list', 'delete']) {
      fakeImpl[m] = (...args) => { calls.push([m, ...args]); return m; };
    }
    const store = new ArtifactStore(fakeImpl);
    const h = { entity: 'task', entityId: 'T1', kind: 'plan' };
    assert.strictEqual(store.read(h), 'read');
    assert.strictEqual(store.write(h, 'x'), 'write');
    assert.deepEqual(calls[0], ['read', h]);
    assert.deepEqual(calls[1], ['write', h, 'x']);
  });
});

describe('FsArtifactImpl — synchronous fs operations', () => {
  test('write then read round-trips via the record dir', () => {
    const root = tmpProject();
    try {
      const dir = path.join('eng', 't01');
      const store = new ArtifactStore(implFor(root, { 'HELLO-S1-T01': dir }));
      const h = { entity: 'task', entityId: 'HELLO-S1-T01', kind: 'progress' };
      assert.strictEqual(store.exists(h), false);
      store.write(h, '# progress\n');
      assert.strictEqual(store.exists(h), true);
      assert.strictEqual(store.read(h), '# progress\n');
      // physical file landed at <root>/eng/t01/PROGRESS.md
      assert.ok(fs.existsSync(path.join(root, 'eng', 't01', 'PROGRESS.md')));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('bug-mode plan resolves the BUG_FIX_PLAN.md override', () => {
    const root = tmpProject();
    try {
      const store = new ArtifactStore(implFor(root, { 'B-01': path.join('eng', 'bugs', 'B-01') }));
      const h = { entity: 'bug', entityId: 'B-01', kind: 'plan' };
      store.write(h, 'fix plan');
      assert.ok(fs.existsSync(path.join(root, 'eng', 'bugs', 'B-01', 'BUG_FIX_PLAN.md')));
      assert.strictEqual(store.read(h), 'fix plan');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('url returns a file:// URL for the fs backend', () => {
    const root = tmpProject();
    try {
      const store = new ArtifactStore(implFor(root, { T: path.join('eng', 't') }));
      const u = store.url({ entity: 'task', entityId: 'T', kind: 'plan' });
      assert.match(u, /^file:\/\//);
      assert.match(u, /PLAN\.md$/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('delete removes the file; read of a missing artifact throws ENOENT', () => {
    const root = tmpProject();
    try {
      const store = new ArtifactStore(implFor(root, { T: path.join('eng', 't') }));
      const h = { entity: 'task', entityId: 'T', kind: 'plan' };
      store.write(h, 'x');
      store.delete(h);
      assert.strictEqual(store.exists(h), false);
      assert.throws(() => store.read(h), /ENOENT|not found/i);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('unresolvable dir throws a clear error', () => {
    const root = tmpProject();
    try {
      const store = new ArtifactStore(implFor(root, {}));
      assert.throws(() => store.read({ entity: 'task', entityId: 'NOPE', kind: 'plan' }), /resolve/i);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('locator helpers — {backend, ref}', () => {
  test('toLocator derives an fs locator from record.path (alias)', () => {
    assert.deepEqual(toLocator({ path: 'engineering/sprints/S1/T1' }), { backend: 'fs', ref: 'engineering/sprints/S1/T1' });
  });
  test('toLocator passes through an explicit locator unchanged', () => {
    const loc = { backend: 's3', ref: 's3://bucket/key' };
    assert.deepEqual(toLocator({ path: 'x', locator: loc }), loc);
  });
  test('toLocator returns null when neither is present', () => {
    assert.strictEqual(toLocator({}), null);
  });
  test('fsRefToDir strips a trailing filename', () => {
    assert.strictEqual(fsRefToDir('eng/t/PROGRESS.md'), 'eng/t');
    assert.strictEqual(fsRefToDir('eng/t'), 'eng/t');
  });
});
