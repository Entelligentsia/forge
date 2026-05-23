#!/usr/bin/env node
'use strict';
// Forge tool: rewrite-plugin-urls
// Rewrites updateUrl and migrationsUrl in plugin.json to point at the correct
// branch for the given distribution target (main or release).
//
// Usage:
//   node rewrite-plugin-urls.cjs --plugin <path/to/plugin.json> --target <main|release>
//
// Targets:
//   main    — local development branch; users who install via git-repo-direct.
//             URLs point to the `main` branch raw GitHub content.
//   release — skillforge distribution branch; URLs point to the `release` branch.
//
// Designed to be called from forge-releaser/SKILL.md:
//   Step 2 (before pushing release merge): --target release
//   Step 5 (after switching back to main):  --target main
//
// Exits 0 on success, 1 on any error.
// Added: FORGE-S25-T13 — implements S-12 decision from SPRINT_PLAN.
'use strict';

const fs = require('fs');
const path = require('path');

const URLS = {
  main: {
    updateUrl:     'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json',
    migrationsUrl: 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/migrations.json',
  },
  release: {
    updateUrl:     'https://raw.githubusercontent.com/Entelligentsia/forge/release/forge/.claude-plugin/plugin.json',
    migrationsUrl: 'https://raw.githubusercontent.com/Entelligentsia/forge/release/forge/migrations.json',
  },
};

function run(argv) {
  let pluginPath = null;
  let target = null;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--plugin' && argv[i + 1]) {
      pluginPath = path.resolve(argv[++i]);
    } else if (argv[i] === '--target' && argv[i + 1]) {
      target = argv[++i];
    }
  }

  if (!pluginPath) {
    process.stderr.write('rewrite-plugin-urls: --plugin <path> is required\n');
    process.exit(1);
  }
  if (!target) {
    process.stderr.write('rewrite-plugin-urls: --target <main|release> is required\n');
    process.exit(1);
  }
  if (!URLS[target]) {
    process.stderr.write(
      `rewrite-plugin-urls: unknown --target "${target}" — must be one of: ${Object.keys(URLS).join(', ')}\n`
    );
    process.exit(1);
  }
  if (!fs.existsSync(pluginPath)) {
    process.stderr.write(`rewrite-plugin-urls: plugin file not found: ${pluginPath}\n`);
    process.exit(1);
  }

  let plugin;
  try {
    plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
  } catch (e) {
    process.stderr.write(`rewrite-plugin-urls: failed to parse plugin.json: ${e.message}\n`);
    process.exit(1);
  }

  plugin.updateUrl = URLS[target].updateUrl;
  plugin.migrationsUrl = URLS[target].migrationsUrl;

  // Atomic write via tmp file + rename
  const tmp = pluginPath + '.tmp.' + process.pid;
  try {
    fs.writeFileSync(tmp, JSON.stringify(plugin, null, 2) + '\n', 'utf8');
    fs.renameSync(tmp, pluginPath);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    process.stderr.write(`rewrite-plugin-urls: failed to write plugin.json: ${e.message}\n`);
    process.exit(1);
  }

  process.stdout.write(
    `〇 rewrite-plugin-urls: ${path.relative(process.cwd(), pluginPath)} → target=${target}\n` +
    `   updateUrl:     ${plugin.updateUrl}\n` +
    `   migrationsUrl: ${plugin.migrationsUrl}\n`
  );
}

if (require.main === module) {
  run(process.argv.slice(2));
}

module.exports = { run, URLS };
