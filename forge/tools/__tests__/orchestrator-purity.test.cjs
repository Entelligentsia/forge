'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const META_DIR = path.join(__dirname, '..', '..', 'meta', 'workflows');

const ORCHESTRATOR_FILES = [
  'meta-orchestrate.md',
  'meta-fix-bug.md',
];

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon > 0) {
      const key = line.slice(0, colon).trim();
      const val = line.slice(colon + 1).trim();
      if (val) fm[key] = val;
    }
  }
  return fm;
}

describe('orchestrator-purity — orchestrator files carry audience: orchestrator-only', () => {
  for (const filename of ORCHESTRATOR_FILES) {
    test(`${filename} has audience: orchestrator-only`, () => {
      const filePath = path.join(META_DIR, filename);
      assert.ok(fs.existsSync(filePath), `File not found: ${filePath}`);
      const content = fs.readFileSync(filePath, 'utf8');
      const fm = parseFrontmatter(content);
      assert.ok(fm !== null, `No frontmatter found in ${filename}`);
      assert.equal(
        fm.audience, 'orchestrator-only',
        `Expected audience: orchestrator-only in ${filename}, got: ${fm.audience}`
      );
    });
  }
});

describe('orchestrator-purity — defensive-read phrasing absent from orchestrator files', () => {
  for (const filename of ORCHESTRATOR_FILES) {
    test(`${filename} does not contain "Read these only if"`, () => {
      const filePath = path.join(META_DIR, filename);
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(
        !content.includes('Read these only if'),
        `${filename} still contains defensive-read phrasing "Read these only if"`
      );
    });
  }
});
