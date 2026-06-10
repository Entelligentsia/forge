#!/usr/bin/env node
'use strict';

// check-payload-manifest.cjs — deterministic source-drift check for the Forge
// payload manifest (FORGE-S32-T02). Reads forge/forge/payload-manifest.json and
// verifies it against the on-disk forge payload source tree. This is the
// machine-checkable replacement for the implicit contract previously spread
// across build-payload.cjs / bootstrap.ts / uninstall.ts copy lists that caused
// the FORGE-BUG-030 / FORGE-BUG-036 MODULE_NOT_FOUND class.
//
// Two failure modes (mirrors check-structure.cjs's pure-fn + thin-CLI shape):
//   (a) missing source — an entry's `source` does not resolve, the on-disk type
//       contradicts `kind` (file vs dir), or a curated `include` name is absent.
//   (b) orphan — a file under a non-curated (no `include`) dir entry's walk
//       scope that no manifest entry claims and no `exclude` covers. This is the
//       silent-drift class: a new file dropped into a recursively-copied tree
//       that the bundling filters would skip without anyone declaring it.
//
// Curated subtrees (`select.include` present — e.g. tools/, skills/) are
// forward-checked only: every listed name must exist, but unlisted siblings are
// NOT orphans (a deliberate minimal-payload exclusion, not drift).
//
// Usage: node check-payload-manifest.cjs [--forge-root <path>]
//   --forge-root <path>  Forge payload root (default: __dirname/..). The manifest
//                        is read from <forge-root>/payload-manifest.json.
//
// Exit 0: green. Exit 1: any missing/orphan finding.
// Built-ins only (fs, path). Reads the source tree, writes nothing.

const fs = require('node:fs');
const path = require('node:path');

// ── Pure helpers ─────────────────────────────────────────────────────────────

// Does `name` satisfy an entry's ext/prefix filter (curated include handled by
// the caller)? `exclude` matching is checked separately against path segments.
function matchesFilter(name, select) {
  if (!select) return true;
  if (Array.isArray(select.ext) && select.ext.length > 0) {
    if (!select.ext.some((e) => name.endsWith(e))) return false;
  }
  if (Array.isArray(select.prefix) && select.prefix.length > 0) {
    if (!select.prefix.some((p) => name.startsWith(p))) return false;
  }
  return true;
}

// Is any path segment of `rel` (or the basename) in the exclude list?
function isExcluded(rel, name, select) {
  if (!select || !Array.isArray(select.exclude)) return false;
  const segs = rel.split(path.sep);
  return select.exclude.some((x) => x === name || segs.includes(x));
}

// Does any manifest entry claim the absolute file `abs`?
function isClaimed(abs, entries, forgeRoot) {
  for (const entry of entries) {
    const src = path.join(forgeRoot, entry.source);
    if (entry.kind === 'file') {
      if (path.resolve(abs) === path.resolve(src)) return true;
      continue;
    }
    // dir entry
    const rel = path.relative(src, abs);
    if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) continue;
    const select = entry.select || {};
    // Non-recursive entries only claim top-level files.
    if (select.recursive === false && rel.includes(path.sep)) continue;
    const name = path.basename(abs);
    if (isExcluded(rel, name, select)) continue;
    if (Array.isArray(select.include) && select.include.length > 0) {
      // Curated: claimed iff the top path segment is a listed name.
      const top = rel.split(path.sep)[0];
      if (select.include.includes(top) || select.include.includes(name)) return true;
      continue;
    }
    if (matchesFilter(name, select)) return true;
  }
  return false;
}

// Recursively collect files under `dir` honouring select.recursive and
// skipping excluded path segments. Returns absolute file paths.
function walkFiles(dir, select, baseDir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(baseDir, abs);
    if (isExcluded(rel, entry.name, select)) continue;
    if (entry.isDirectory()) {
      if (select && select.recursive === false) continue;
      out.push(...walkFiles(abs, select, baseDir));
    } else if (entry.isFile()) {
      out.push(abs);
    }
  }
  return out;
}

// Core check. Returns { missing[], orphans[], ok }. No process.exit (mirrors
// check-structure.cjs — exits live only in the CLI block below).
function checkManifest(forgeRoot) {
  const manifestPath = path.join(forgeRoot, 'payload-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entries = Array.isArray(manifest.entries) ? manifest.entries : [];

  const missing = [];
  const orphans = [];

  // ── Pass 1: missing-source + kind + curated include ──────────────────────
  for (const entry of entries) {
    if (entry.synthesized) continue; // build-payload writes it; no source on disk
    const abs = path.join(forgeRoot, entry.source);
    if (!fs.existsSync(abs)) {
      missing.push({ source: entry.source, reason: 'source not found' });
      continue;
    }
    const stat = fs.statSync(abs);
    if (entry.kind === 'file' && !stat.isFile()) {
      missing.push({ source: entry.source, reason: 'kind:file but resolved to a directory' });
      continue;
    }
    if (entry.kind === 'dir' && !stat.isDirectory()) {
      missing.push({ source: entry.source, reason: 'kind:dir but resolved to a file' });
      continue;
    }
    // Curated include — every listed name must exist under the dir.
    const select = entry.select || {};
    if (entry.kind === 'dir' && Array.isArray(select.include)) {
      for (const name of select.include) {
        if (!fs.existsSync(path.join(abs, name))) {
          missing.push({ source: `${entry.source}/${name}`, reason: 'curated include name not found' });
        }
      }
    }
  }

  // ── Pass 2: orphan detection on non-curated dir entries ───────────────────
  for (const entry of entries) {
    if (entry.synthesized || entry.kind !== 'dir') continue;
    const select = entry.select || {};
    if (Array.isArray(select.include) && select.include.length > 0) continue; // curated
    const abs = path.join(forgeRoot, entry.source);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) continue;
    for (const file of walkFiles(abs, select, abs)) {
      if (!isClaimed(file, entries, forgeRoot)) {
        orphans.push({ file: path.relative(forgeRoot, file), entry: entry.source });
      }
    }
  }

  return { missing, orphans, ok: missing.length === 0 && orphans.length === 0 };
}

module.exports = { checkManifest, matchesFilter, isClaimed, walkFiles };

// ── CLI ──────────────────────────────────────────────────────────────────────

if (require.main === module) {
  try {
    const argv = process.argv.slice(2);
    let forgeRoot = path.join(__dirname, '..');
    for (let i = 0; i < argv.length; i++) {
      if ((argv[i] === '--forge-root' || argv[i] === '--forge-root=') && argv[i + 1]) {
        forgeRoot = path.resolve(argv[++i]);
      } else if (argv[i].startsWith('--forge-root=')) {
        forgeRoot = path.resolve(argv[i].slice('--forge-root='.length));
      } else if (argv[i] === '--help' || argv[i] === '-h') {
        process.stdout.write(
          'check-payload-manifest.cjs — verify payload-manifest.json against the source tree.\n' +
          'Usage: node check-payload-manifest.cjs [--forge-root <path>]\n',
        );
        process.exit(0);
      }
    }

    const { missing, orphans, ok } = checkManifest(forgeRoot);

    if (missing.length > 0) {
      process.stdout.write('× Missing / mistyped sources:\n');
      for (const m of missing) {
        process.stdout.write(`    × ${m.source} — ${m.reason}\n`);
      }
    }
    if (orphans.length > 0) {
      process.stdout.write('× Orphan sources (on disk, no covering manifest entry):\n');
      for (const o of orphans) {
        process.stdout.write(`    × ${o.file} (under ${o.entry})\n`);
      }
    }

    if (ok) {
      process.stdout.write('〇 Payload manifest check: source tree matches the manifest.\n');
      process.exit(0);
    }
    process.stdout.write(
      `── Payload manifest drift: ${missing.length} missing, ${orphans.length} orphan(s).\n`,
    );
    process.exit(1);
  } catch (err) {
    process.stderr.write(`× check-payload-manifest fatal: ${err.message}\n${err.stack}\n`);
    process.exit(1);
  }
}
