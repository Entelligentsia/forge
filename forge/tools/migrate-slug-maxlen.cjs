#!/usr/bin/env node
'use strict';
// migrate-slug-maxlen.cjs — one-shot migration script for FORGE-S25-T07.
//
// Scans the .forge/store/bugs/ directory for bug entities whose titles exceed
// 30 characters and would receive a different (truncated) slug under the new
// lib/slug.cjs maxLen=30 canonical behavior.
//
// DRY-RUN by default: prints a report of affected entities.
// --apply: renames artifact directories and updates the slug field in the
//          store JSON if present.
//
// Usage:
//   node migrate-slug-maxlen.cjs [--store-root <path>] [--eng-root <path>] [--apply]
//
//   --store-root  Path to .forge/store/ (default: .forge/store relative to cwd)
//   --eng-root    Path to engineering/ root (default: engineering/ relative to cwd)
//   --apply       Perform renames; default is dry-run
//
// Exit codes:
//   0  — no affected entities (or all migrations applied cleanly)
//   1  — affected entities found (dry-run) or errors during apply

const fs = require('node:fs');
const path = require('node:path');
const { deriveSlug } = require('./lib/slug.cjs');

function parseArgs(argv) {
  const out = { storeRoot: null, engRoot: null, apply: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--store-root') out.storeRoot = argv[++i];
    else if (argv[i] === '--eng-root') out.engRoot = argv[++i];
    else if (argv[i] === '--apply') out.apply = true;
  }
  return out;
}

function main(argv) {
  const args = parseArgs(argv);
  const cwd = process.cwd();

  const storeRoot = args.storeRoot || path.join(cwd, '.forge', 'store');
  const engRoot = args.engRoot || path.join(cwd, 'engineering');
  const bugsDir = path.join(storeRoot, 'bugs');

  if (!fs.existsSync(bugsDir)) {
    process.stdout.write('migrate-slug-maxlen: no bugs/ directory found — nothing to migrate.\n');
    process.exit(0);
  }

  const bugFiles = fs.readdirSync(bugsDir).filter(f => f.endsWith('.json'));
  const affected = [];

  for (const file of bugFiles) {
    const bugPath = path.join(bugsDir, file);
    let bug;
    try {
      bug = JSON.parse(fs.readFileSync(bugPath, 'utf8'));
    } catch (err) {
      process.stderr.write(`migrate-slug-maxlen: skipping ${file} — parse error: ${err.message}\n`);
      continue;
    }

    if (!bug.title || !bug.bugId) continue;

    const newSlug = deriveSlug(bug.title, { maxLen: 30 });

    // Old slug (no truncation, as store-facade.cjs previously computed it)
    const oldSlug = bug.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+$/, '');

    if (oldSlug === newSlug) continue; // no change

    // Also check old seed-store behavior (was already truncated)
    const oldSeedSlug = bug.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30)
      .replace(/-+$/g, '');

    if (oldSeedSlug === newSlug) continue; // seed-store already had correct slug

    affected.push({
      bugId: bug.bugId,
      title: bug.title,
      oldSlug,
      newSlug,
      storePath: bugPath,
    });
  }

  if (affected.length === 0) {
    process.stdout.write('migrate-slug-maxlen: no affected entities — all bug slugs are within maxLen=30.\n');
    process.exit(0);
  }

  // Report
  process.stdout.write(`migrate-slug-maxlen: ${affected.length} bug(s) affected by maxLen=30 truncation:\n\n`);
  for (const a of affected) {
    process.stdout.write(`  ${a.bugId}: "${a.title}"\n`);
    process.stdout.write(`    old slug: ${a.oldSlug}\n`);
    process.stdout.write(`    new slug: ${a.newSlug}\n\n`);
  }

  if (!args.apply) {
    process.stdout.write(
      'Dry-run complete. Run with --apply to rename KB index directories.\n' +
      'NOTE: Store JSON records are not modified (slug is derived at runtime).\n'
    );
    process.exit(1); // exit 1 to signal affected entities exist
  }

  // Apply: rename KB bug directories that use the old slug
  let errors = 0;
  for (const a of affected) {
    const bugsKbDir = path.join(engRoot, 'bugs');
    if (!fs.existsSync(bugsKbDir)) {
      process.stderr.write(`migrate-slug-maxlen: engineering/bugs/ not found — skipping KB renames\n`);
      break;
    }

    const oldDirName = `${a.bugId}-${a.oldSlug}`;
    const newDirName = `${a.bugId}-${a.newSlug}`;
    const oldDir = path.join(bugsKbDir, oldDirName);
    const newDir = path.join(bugsKbDir, newDirName);

    if (!fs.existsSync(oldDir)) {
      process.stdout.write(`  ${a.bugId}: KB directory "${oldDirName}" not found — skipping\n`);
      continue;
    }
    if (fs.existsSync(newDir)) {
      process.stdout.write(`  ${a.bugId}: target "${newDirName}" already exists — skipping\n`);
      continue;
    }

    try {
      fs.renameSync(oldDir, newDir);
      process.stdout.write(`  ${a.bugId}: renamed "${oldDirName}" → "${newDirName}"\n`);
    } catch (err) {
      process.stderr.write(`  ${a.bugId}: ERROR renaming — ${err.message}\n`);
      errors++;
    }
  }

  if (errors > 0) {
    process.stderr.write(`migrate-slug-maxlen: ${errors} error(s) during apply.\n`);
    process.exit(1);
  }

  process.stdout.write('migrate-slug-maxlen: apply complete.\n');
  process.exit(0);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { main };
