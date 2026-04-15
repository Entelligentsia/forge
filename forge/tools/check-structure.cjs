#!/usr/bin/env node
'use strict';

// Forge tool: check-structure
// Checks that all files listed in structure-manifest.json are present
// in a project's generated output.
// Usage: node check-structure.cjs [--strict] [--path <project-root>]
//   --path <project-root>  Directory to check against (default: process.cwd())
//   --strict               Also report files present but NOT in the manifest (extra files)
//
// Reads .forge/config.json paths.* for directory overrides.
// Falls back to manifest dir field if config is absent or unparseable.
//
// Exit 0: all expected files present (or only extras found without --strict)
// Exit 1: any missing files detected; also exit 1 if extras found with --strict

try {
  const fs = require('fs');
  const path = require('path');

  // ── Parse arguments ──────────────────────────────────────────────────────────

  const argv = process.argv.slice(2);
  let projectRoot = process.cwd();
  let strict = false;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--path' && argv[i + 1]) {
      projectRoot = path.resolve(argv[++i]);
    } else if (argv[i] === '--strict') {
      strict = true;
    }
  }

  // ── Load structure-manifest.json ─────────────────────────────────────────────

  const manifestPath = path.join(__dirname, '..', 'schemas', 'structure-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    process.stderr.write(`× structure-manifest.json not found at ${manifestPath}\n`);
    process.exit(1);
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    process.stderr.write(`× Failed to parse structure-manifest.json: ${e.message}\n`);
    process.exit(1);
  }

  // ── Load .forge/config.json for path overrides ───────────────────────────────

  let configPaths = {};
  const configFile = path.join(projectRoot, '.forge', 'config.json');
  if (fs.existsSync(configFile)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      configPaths = (cfg && cfg.paths) ? cfg.paths : {};
    } catch {
      process.stdout.write(`△ .forge/config.json not found or unreadable — using manifest default paths\n`);
    }
  } else {
    process.stdout.write(`△ .forge/config.json not found or unreadable — using manifest default paths\n`);
  }

  // ── Check each namespace ──────────────────────────────────────────────────────

  let totalExpected = 0;
  let totalPresent = 0;
  let totalMissing = 0;
  let totalExtra = 0;
  let anyMissing = false;
  let anyExtra = false;
  const lines = [];

  for (const [nsKey, ns] of Object.entries(manifest.namespaces)) {
    const logicalKey = ns.logicalKey || nsKey;
    // Config override: if config.paths[logicalKey] is set, use it
    const resolvedDir = (configPaths[logicalKey] && typeof configPaths[logicalKey] === 'string')
      ? configPaths[logicalKey]
      : ns.dir;
    const absDir = path.join(projectRoot, resolvedDir);

    const expected = ns.files || [];
    totalExpected += expected.length;

    const missing = [];
    const present = [];
    for (const filename of expected) {
      const fullPath = path.join(absDir, filename);
      if (fs.existsSync(fullPath)) {
        present.push(filename);
      } else {
        missing.push(filename);
      }
    }

    totalPresent += present.length;
    totalMissing += missing.length;

    let extra = [];
    if (strict) {
      if (fs.existsSync(absDir)) {
        try {
          const expectedSet = new Set(expected);
          const found = fs.readdirSync(absDir);
          extra = found.filter(f => !expectedSet.has(f));
          totalExtra += extra.length;
        } catch {}
      }
    }

    if (missing.length === 0 && extra.length === 0) {
      lines.push(`〇 ${resolvedDir}/ — ${present.length}/${expected.length} present`);
    } else {
      if (missing.length > 0) {
        anyMissing = true;
        lines.push(`× ${resolvedDir}/ — ${present.length}/${expected.length} present, ${missing.length} missing:`);
        for (const f of missing) {
          lines.push(`    × ${f}`);
        }
      }
      if (extra.length > 0) {
        anyExtra = true;
        if (missing.length === 0) {
          lines.push(`△ ${resolvedDir}/ — ${present.length}/${expected.length} present, ${extra.length} extra:`);
        }
        for (const f of extra) {
          lines.push(`    △ ${f} (not in manifest)`);
        }
      }
    }
  }

  // ── Output ────────────────────────────────────────────────────────────────────

  for (const line of lines) {
    process.stdout.write(line + '\n');
  }

  if (!anyMissing && !anyExtra) {
    process.stdout.write(`〇 Structure check: all ${totalExpected} expected files present.\n`);
    process.exit(0);
  }

  const parts = [`${totalPresent} present`];
  if (totalMissing > 0) parts.push(`${totalMissing} missing`);
  if (strict && totalExtra > 0) parts.push(`${totalExtra} extra`);
  process.stdout.write(`── Structure check: ${parts.join(', ')} (of ${totalExpected} expected)\n`);

  if (anyMissing) {
    process.exit(1);
  }
  // Extra-only without --strict → exit 0 already handled above
  // Extra-only with --strict
  if (strict && anyExtra) {
    process.exit(1);
  }
  process.exit(0);

} catch (err) {
  process.stderr.write(`× check-structure fatal: ${err.message}\n${err.stack}\n`);
  process.exit(1);
}
