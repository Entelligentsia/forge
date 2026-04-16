'use strict';
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { checkNamespaces } = require('../check-structure.cjs');

// Helper: create a temp directory structure, return cleanup function
function createTempProject(structure) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-structure-test-'));

  for (const [relPath, content] of Object.entries(structure)) {
    const fullPath = path.join(tmpDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  return tmpDir;
}

function removeDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('checkNamespaces', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir) {
      removeDir(tmpDir);
      tmpDir = null;
    }
  });

  test('all files present → no missing', () => {
    const manifest = {
      namespaces: {
        personas: {
          logicalKey: 'personas',
          dir: '.forge/personas',
          files: ['architect.md', 'engineer.md'],
        },
        workflows: {
          logicalKey: 'workflows',
          dir: '.forge/workflows',
          files: ['plan_task.md'],
        },
      },
    };

    const structure = {
      '.forge/personas/architect.md': '# architect',
      '.forge/personas/engineer.md': '# engineer',
      '.forge/workflows/plan_task.md': '# plan',
    };

    tmpDir = createTempProject(structure);

    const result = checkNamespaces(manifest, tmpDir, { strict: false });

    assert.equal(result.total, 3);
    assert.equal(result.present, 3);
    assert.equal(result.missing.length, 0);
    assert.equal(result.extra.length, 0);
  });

  test('some files missing → correct missing list', () => {
    const manifest = {
      namespaces: {
        personas: {
          logicalKey: 'personas',
          dir: '.forge/personas',
          files: ['architect.md', 'engineer.md', 'missing.md'],
        },
      },
    };

    const structure = {
      '.forge/personas/architect.md': '# architect',
    };

    tmpDir = createTempProject(structure);

    const result = checkNamespaces(manifest, tmpDir, { strict: false });

    assert.equal(result.total, 3);
    assert.equal(result.present, 1);
    assert.equal(result.missing.length, 2);

    const missingFilenames = result.missing.map(m => m.filename).sort();
    assert.deepEqual(missingFilenames, ['engineer.md', 'missing.md']);
  });

  test('strict mode detects extra files', () => {
    const manifest = {
      namespaces: {
        personas: {
          logicalKey: 'personas',
          dir: '.forge/personas',
          files: ['architect.md'],
        },
      },
    };

    const structure = {
      '.forge/personas/architect.md': '# architect',
      '.forge/personas/rogue.md': '# rogue',
    };

    tmpDir = createTempProject(structure);

    const result = checkNamespaces(manifest, tmpDir, { strict: true });

    assert.equal(result.total, 1);
    assert.equal(result.present, 1);
    assert.equal(result.missing.length, 0);
    assert.equal(result.extra.length, 1);
    assert.equal(result.extra[0].filename, 'rogue.md');
    assert.equal(result.extra[0].nsKey, 'personas');
  });

  test('strict mode with no extra files → empty extra list', () => {
    const manifest = {
      namespaces: {
        personas: {
          logicalKey: 'personas',
          dir: '.forge/personas',
          files: ['architect.md'],
        },
      },
    };

    const structure = {
      '.forge/personas/architect.md': '# architect',
    };

    tmpDir = createTempProject(structure);

    const result = checkNamespaces(manifest, tmpDir, { strict: true });

    assert.equal(result.total, 1);
    assert.equal(result.present, 1);
    assert.equal(result.missing.length, 0);
    assert.equal(result.extra.length, 0);
  });

  test('configPaths overrides directory paths', () => {
    const manifest = {
      namespaces: {
        personas: {
          logicalKey: 'personas',
          dir: '.forge/personas',
          files: ['architect.md'],
        },
      },
    };

    const structure = {
      'custom/personas/architect.md': '# architect',
    };

    tmpDir = createTempProject(structure);

    const result = checkNamespaces(manifest, tmpDir, {
      strict: false,
      configPaths: { personas: 'custom/personas' },
    });

    assert.equal(result.total, 1);
    assert.equal(result.present, 1);
    assert.equal(result.missing.length, 0);
  });

  test('missing directory counts all files as missing', () => {
    const manifest = {
      namespaces: {
        workflows: {
          logicalKey: 'workflows',
          dir: '.forge/workflows',
          files: ['a.md', 'b.md'],
        },
      },
    };

    // No .forge directory at all
    tmpDir = createTempProject({ 'placeholder.txt': 'test' });

    const result = checkNamespaces(manifest, tmpDir, { strict: false });

    assert.equal(result.total, 2);
    assert.equal(result.present, 0);
    assert.equal(result.missing.length, 2);
  });

  test('reads configPaths from .forge/config.json when not provided in options', () => {
    const manifest = {
      namespaces: {
        personas: {
          logicalKey: 'personas',
          dir: '.forge/personas',
          files: ['architect.md'],
        },
      },
    };

    const structure = {
      'alt/personas/architect.md': '# architect',
      '.forge/config.json': JSON.stringify({ paths: { personas: 'alt/personas' } }),
    };

    tmpDir = createTempProject(structure);

    // Not passing configPaths — should read from .forge/config.json
    const result = checkNamespaces(manifest, tmpDir, { strict: false });

    assert.equal(result.total, 1);
    assert.equal(result.present, 1);
    assert.equal(result.missing.length, 0);
  });
});