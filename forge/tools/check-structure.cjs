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

const fs = require('fs');
const path = require('path');

// ── Per-namespace verification logic ──────────────────────────────────────────
//
// Returns { present, missing, extra, total } without calling process.exit.
// - present: number of expected files found
// - missing: array of { nsKey, dir, filename }
// - extra:   array of { nsKey, dir, filename } (populated only when strict=true)
// - total:   total number of expected files across all namespaces

function checkNamespaces(manifest, projectRoot, options = {}) {
  const { strict = false, configPaths = null } = options;

  // Resolve config path overrides
  let resolvedConfigPaths;
  let projectPrefix = '';
  if (configPaths !== null) {
    resolvedConfigPaths = configPaths;
  } else {
    resolvedConfigPaths = {};
    const configFile = path.join(projectRoot, '.forge', 'config.json');
    if (fs.existsSync(configFile)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        resolvedConfigPaths = (cfg && cfg.paths) ? cfg.paths : {};
        projectPrefix = (cfg && cfg.project && cfg.project.prefix)
          ? cfg.project.prefix.toLowerCase()
          : '';
      } catch {
        // unparseable — use defaults
      }
    }
  }

  let totalPresent = 0;
  let totalExpected = 0;
  const allMissing = [];
  const allExtra = [];

  for (const [nsKey, ns] of Object.entries(manifest.namespaces)) {
    const logicalKey = ns.logicalKey || nsKey;
    let resolvedDir = (resolvedConfigPaths[logicalKey] && typeof resolvedConfigPaths[logicalKey] === 'string')
      ? resolvedConfigPaths[logicalKey]
      : ns.dir;
    if (ns.prefixed && projectPrefix) {
      resolvedDir = resolvedDir + '/' + projectPrefix;
    }
    const absDir = path.join(projectRoot, resolvedDir);

    const expected = ns.files || [];
    totalExpected += expected.length;

    const present = [];
    const missing = [];
    for (const filename of expected) {
      const fullPath = path.join(absDir, filename);
      if (fs.existsSync(fullPath)) {
        present.push(filename);
      } else {
        missing.push({ nsKey, dir: resolvedDir, filename });
      }
    }

    totalPresent += present.length;
    allMissing.push(...missing);

    if (strict) {
      if (fs.existsSync(absDir)) {
        try {
          const expectedSet = new Set(expected);
          const found = fs.readdirSync(absDir);
          for (const f of found) {
            if (!expectedSet.has(f)) {
              allExtra.push({ nsKey, dir: resolvedDir, filename: f });
            }
          }
        } catch {}
      }
    }
  }

  return {
    present: totalPresent,
    missing: allMissing,
    extra: allExtra,
    total: totalExpected,
  };
}

// ── Exports ────────────────────────────────────────────────────────────────────

module.exports = { checkNamespaces };

// ── CLI ────────────────────────────────────────────────────────────────────────

if (require.main === module) {
try {
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

  // ── Check namespaces ─────────────────────────────────────────────────────────

  const result = checkNamespaces(manifest, projectRoot, { strict });

  // ── Format output ────────────────────────────────────────────────────────────

  // Group results by namespace for display
  const byNs = {};
  for (const m of result.missing) {
    if (!byNs[m.nsKey]) byNs[m.nsKey] = { present: 0, missing: [], extra: [] };
    byNs[m.nsKey].missing.push(m.filename);
  }
  for (const e of result.extra) {
    if (!byNs[e.nsKey]) byNs[e.nsKey] = { present: 0, missing: [], extra: [] };
    byNs[e.nsKey].extra.push(e.filename);
  }

  // Count present per namespace
  for (const [nsKey, ns] of Object.entries(manifest.namespaces)) {
    if (!byNs[nsKey]) byNs[nsKey] = { present: 0, missing: [], extra: [] };
    const total = (ns.files || []).length;
    const missingCount = byNs[nsKey].missing.length;
    byNs[nsKey].present = total - missingCount;
  }

  const lines = [];
  let anyMissing = result.missing.length > 0;
  let anyExtra = result.extra.length > 0;

  for (const [nsKey, ns] of Object.entries(manifest.namespaces)) {
    const logicalKey = ns.logicalKey || nsKey;
    const info = byNs[nsKey] || { present: 0, missing: [], extra: [] };
    const total = (ns.files || []).length;
    const dir = ns.dir;

    if (info.missing.length === 0 && info.extra.length === 0) {
      lines.push(`〇 ${dir}/ — ${info.present}/${total} present`);
    } else {
      if (info.missing.length > 0) {
        lines.push(`× ${dir}/ — ${info.present}/${total} present, ${info.missing.length} missing:`);
        for (const f of info.missing) {
          lines.push(`    × ${f}`);
        }
      }
      if (info.extra.length > 0) {
        if (info.missing.length === 0) {
          lines.push(`△ ${dir}/ — ${info.present}/${total} present, ${info.extra.length} extra:`);
        }
        for (const f of info.extra) {
          lines.push(`    △ ${f} (not in manifest)`);
        }
      }
    }
  }

  for (const line of lines) {
    process.stdout.write(line + '\n');
  }

  if (!anyMissing && !anyExtra) {
    process.stdout.write(`〇 Structure check: all ${result.total} expected files present.\n`);
    process.exit(0);
  }

  const parts = [`${result.present} present`];
  if (result.missing.length > 0) parts.push(`${result.missing.length} missing`);
  if (strict && result.extra.length > 0) parts.push(`${result.extra.length} extra`);
  process.stdout.write(`── Structure check: ${parts.join(', ')} (of ${result.total} expected)\n`);

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
} // end if (require.main === module)