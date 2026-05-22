#!/usr/bin/env node
'use strict';

// FORGE-S25-T01 — no-skip / no-only CI gate.
//
// Scans test files under forge/tools/__tests__/ and forge/hooks/__tests__/
// for committed skip/only/xit/xdescribe markers. Exits 1 with a file:line
// list on any hit from the primary regexes. A secondary "re-?enable" /
// "FIXME: skip" check is warn-only — it prints to stderr but does NOT
// change the exit code, so a canonical TODO(<task-id>) comment in CI
// workflow code cannot self-trip this gate.
//
// Runs from the clone root. Globs are clone-root-relative.

const fs = require('fs');
const path = require('path');

const SCAN_ROOTS = [
  path.join('forge', 'tools', '__tests__'),
  path.join('forge', 'hooks', '__tests__'),
];

const TEST_FILE_RX = /\.test\.(cjs|js|mjs)$/;
const FIXTURE_SEGMENT = `${path.sep}fixtures${path.sep}`;

// Self-exclusion: the gate's own paired test file (and this comment block in
// the gate script itself) contains literal skip/only markers as string
// fixtures asserting both the positive (exit 1) and false-positive boundary
// paths. Scanning either would self-trip the gate.
const SELF_EXCLUDED_BASENAMES = new Set([
  'check-no-skipped-tests.test.cjs',
]);

// Primary regex — hard-fails the gate. Matches:
//   it.skip / test.skip / describe.skip
//   it.only / test.only / describe.only
//   xit( / xdescribe(
const PRIMARY_RX = /\b(it|test|describe)\.(skip|only)\b|\b(xit|xdescribe)\s*\(/;

// Secondary regex — warn-only. Catches stale "re-enable" / "FIXME: skip" notes
// without failing the build (so a TODO(<task-id>) reminder in workflow code
// is allowed).
const SECONDARY_RX = /\/\/\s*FIXME\s*:.*\bskip\b|\/\/\s*TODO\s*:.*\bre-?enable\b/i;

function walk(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (_) { return; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'fixtures') continue;
      walk(full, out);
    } else if (entry.isFile() && TEST_FILE_RX.test(entry.name)) {
      if (full.includes(FIXTURE_SEGMENT)) continue;
      if (SELF_EXCLUDED_BASENAMES.has(entry.name)) continue;
      out.push(full);
    }
  }
}

function scanFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  const primary = [];
  const secondary = [];
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (PRIMARY_RX.test(ln)) primary.push({ file, line: i + 1, text: ln.trim() });
    if (SECONDARY_RX.test(ln)) secondary.push({ file, line: i + 1, text: ln.trim() });
  }
  return { primary, secondary };
}

function main() {
  const files = [];
  for (const root of SCAN_ROOTS) walk(root, files);

  let primaryHits = [];
  let secondaryHits = [];
  for (const f of files) {
    const { primary, secondary } = scanFile(f);
    primaryHits = primaryHits.concat(primary);
    secondaryHits = secondaryHits.concat(secondary);
  }

  if (secondaryHits.length > 0) {
    process.stderr.write(
      `check-no-skipped-tests: ${secondaryHits.length} warn-only match(es) ` +
      `(FIXME:skip / TODO:re-enable) — does NOT fail the build:\n`
    );
    for (const h of secondaryHits) {
      process.stderr.write(`  ${h.file}:${h.line}  ${h.text}\n`);
    }
  }

  if (primaryHits.length > 0) {
    process.stderr.write(
      `check-no-skipped-tests: ${primaryHits.length} committed skip/only/xit/xdescribe ` +
      `marker(s) found — failing the build:\n`
    );
    for (const h of primaryHits) {
      process.stderr.write(`  ${h.file}:${h.line}  ${h.text}\n`);
    }
    process.exit(1);
  }

  process.exit(0);
}

main();
