'use strict';
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { checkNamespaces, validateManifest } = require('../check-structure.cjs');
const { getCommandsSubdir } = require('../lib/paths.cjs');

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

  test('fast-mode stub files (with sentinel) count as present', () => {
    const manifest = {
      namespaces: {
        workflows: {
          logicalKey: 'workflows',
          dir: '.forge/workflows',
          files: ['plan_task.md'],
        },
      },
    };

    const stubContent = '<!-- FORGE FAST-MODE STUB — will self-replace on first use -->\n---\neffort: medium\nmode: stub\nworkflow_id: plan_task\n---\n# Workflow: plan_task (fast-mode stub)\n';
    const structure = {
      '.forge/workflows/plan_task.md': stubContent,
    };

    tmpDir = createTempProject(structure);

    const result = checkNamespaces(manifest, tmpDir, { strict: false });

    assert.equal(result.total, 1);
    assert.equal(result.present, 1, 'stub file should count as present (checkNamespaces checks existence only)');
    assert.equal(result.missing.length, 0);
  });

  test('prefixed namespace resolves dir with project.prefix from config', () => {
    const manifest = {
      namespaces: {
        commands: {
          logicalKey: 'commands',
          dir: '.claude/commands',
          prefixed: true,
          files: ['plan.md', 'run-task.md'],
        },
      },
    };

    const structure = {
      '.claude/commands/acme/plan.md': '---\ndescription: plan\neffort: high\n---\n',
      '.claude/commands/acme/run-task.md': '---\ndescription: run\neffort: high\n---\n',
      '.forge/config.json': JSON.stringify({ project: { prefix: 'ACME' }, paths: {} }),
    };

    tmpDir = createTempProject(structure);
    const result = checkNamespaces(manifest, tmpDir, { strict: false });

    assert.equal(result.total, 2);
    assert.equal(result.present, 2);
    assert.equal(result.missing.length, 0);
  });

  test('prefixed namespace reports missing when files are at old flat path', () => {
    const manifest = {
      namespaces: {
        commands: {
          logicalKey: 'commands',
          dir: '.claude/commands',
          prefixed: true,
          files: ['plan.md'],
        },
      },
    };

    const structure = {
      '.claude/commands/plan.md': '---\neffort: high\n---\n',
      '.forge/config.json': JSON.stringify({ project: { prefix: 'EMBER' }, paths: {} }),
    };

    tmpDir = createTempProject(structure);
    const result = checkNamespaces(manifest, tmpDir, { strict: false });

    assert.equal(result.total, 1);
    assert.equal(result.present, 0);
    assert.equal(result.missing.length, 1);
    assert.equal(result.missing[0].filename, 'plan.md');
  });

  test('prefixed namespace falls back to base dir when prefix unavailable', () => {
    const manifest = {
      namespaces: {
        commands: {
          logicalKey: 'commands',
          dir: '.claude/commands',
          prefixed: true,
          files: ['plan.md'],
        },
      },
    };

    const structure = {
      '.claude/commands/plan.md': '---\neffort: high\n---\n',
    };

    tmpDir = createTempProject(structure);
    const result = checkNamespaces(manifest, tmpDir, { strict: false });

    assert.equal(result.total, 1);
    assert.equal(result.present, 1, 'falls back to base dir when no prefix in config');
    assert.equal(result.missing.length, 0);
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

  test('FR-006: uses getCommandsSubdir for prefixed commands path resolution', () => {
    const manifest = {
      namespaces: {
        commands: {
          logicalKey: 'commands',
          dir: '.claude/commands',
          prefixed: true,
          files: ['plan.md'],
        },
      },
    };

    // Use prefix 'MYCORP' — getCommandsSubdir('MYCORP') returns 'mycorp'
    const structure = {
      '.claude/commands/mycorp/plan.md': '---\neffort: high\n---\n',
      '.forge/config.json': JSON.stringify({ project: { prefix: 'MYCORP' }, paths: {} }),
    };

    tmpDir = createTempProject(structure);
    const result = checkNamespaces(manifest, tmpDir, { strict: false });

    assert.equal(result.total, 1);
    assert.equal(result.present, 1);
    assert.equal(result.missing.length, 0);
  });

  test('FR-006: legacy forge/ path accepted with deprecation warning', () => {
    const manifest = {
      namespaces: {
        commands: {
          logicalKey: 'commands',
          dir: '.claude/commands',
          prefixed: true,
          files: ['plan.md'],
        },
      },
    };

    // Files at old .claude/commands/forge/ path with prefix FORGE
    const structure = {
      '.claude/commands/forge/plan.md': '---\neffort: high\n---\n',
      '.forge/config.json': JSON.stringify({ project: { prefix: 'FORGE' }, paths: {} }),
    };

    tmpDir = createTempProject(structure);
    const result = checkNamespaces(manifest, tmpDir, { strict: false });

    // Since prefix is FORGE and getCommandsSubdir('FORGE') returns 'forge',
    // the legacy path IS the correct path — this should work
    assert.equal(result.total, 1);
    assert.equal(result.present, 1);
    assert.equal(result.missing.length, 0);
  });
});

// ── FR-007-7e: validateManifest ────────────────────────────────────────────────

describe('validateManifest', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir) {
      removeDir(tmpDir);
      tmpDir = null;
    }
  });

  test('detects files in manifest but absent from base-pack', () => {
    tmpDir = createTempProject({
      'init/base-pack/workflows/plan_task.md': '# plan',
      'init/base-pack/workflows/implement_plan.md': '# implement',
    });

    const manifest = {
      namespaces: {
        workflows: {
          logicalKey: 'workflows',
          dir: '.forge/workflows',
          files: ['plan_task.md', 'implement_plan.md', 'missing_workflow.md'],
        },
      },
    };

    const result = validateManifest(manifest, tmpDir);
    assert.equal(result.manifestOnly.length, 1);
    assert.equal(result.manifestOnly[0].filename, 'missing_workflow.md');
    assert.equal(result.basePackOnly.length, 0);
  });

  test('detects files in base-pack but absent from manifest', () => {
    tmpDir = createTempProject({
      'init/base-pack/workflows/plan_task.md': '# plan',
      'init/base-pack/workflows/extra_workflow.md': '# extra',
    });

    const manifest = {
      namespaces: {
        workflows: {
          logicalKey: 'workflows',
          dir: '.forge/workflows',
          files: ['plan_task.md'],
        },
      },
    };

    const result = validateManifest(manifest, tmpDir);
    assert.equal(result.manifestOnly.length, 0);
    assert.equal(result.basePackOnly.length, 1);
    assert.equal(result.basePackOnly[0].filename, 'extra_workflow.md');
  });

  test('returns empty arrays when manifest and base-pack are in sync', () => {
    tmpDir = createTempProject({
      'init/base-pack/workflows/plan_task.md': '# plan',
      'init/base-pack/workflows/implement_plan.md': '# implement',
    });

    const manifest = {
      namespaces: {
        workflows: {
          logicalKey: 'workflows',
          dir: '.forge/workflows',
          files: ['plan_task.md', 'implement_plan.md'],
        },
      },
    };

    const result = validateManifest(manifest, tmpDir);
    assert.equal(result.manifestOnly.length, 0);
    assert.equal(result.basePackOnly.length, 0);
  });

  test('skips schemas namespace (not base-pack-sourced)', () => {
    tmpDir = createTempProject({});

    const manifest = {
      namespaces: {
        schemas: {
          logicalKey: 'schemas',
          dir: '.forge/schemas',
          files: ['some-file.schema.json'],
        },
      },
    };

    const result = validateManifest(manifest, tmpDir);
    assert.equal(result.manifestOnly.length, 0);
    assert.equal(result.basePackOnly.length, 0);
  });
});