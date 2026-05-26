'use strict';
// Regression guard for forge#83 — meta-new-sprint.md must give the
// subagent a Project Orientation block so it knows where it is and what is
// in scope. Philosophy: context, not enforcement. Weaker non-Claude models
// improvised paths and ran fs-wide searches when cwd context was implicit.
// The orientation block restores that context up front.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const META = path.resolve(
  __dirname, '..', '..', 'meta', 'workflows', 'meta-new-sprint.md',
);

describe('meta-new-sprint.md :: Project Orientation regression guard (forge#83)', () => {
  const contents = fs.readFileSync(META, 'utf8');

  test('declares the current working directory is the project root', () => {
    assert.match(
      contents,
      /current working directory is the project root/i,
      'new-sprint workflow no longer orients the subagent to cwd',
    );
  });

  test('points at .forge/config.json and forge_config MCP for config', () => {
    assert.match(
      contents,
      /\.forge\/config\.json[\s\S]{0,200}forge_config/i,
      'new-sprint workflow no longer points at .forge/config.json + forge_config MCP',
    );
  });

  test('points at engineering/ for project knowledge', () => {
    assert.match(
      contents,
      /Engineering knowledge lives under `engineering\/`/,
      'new-sprint workflow no longer points at engineering/ as the knowledge root',
    );
  });
});
