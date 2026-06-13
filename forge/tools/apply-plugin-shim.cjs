#!/usr/bin/env node
'use strict';
// Forge tool: apply-plugin-shim
// Release-branch shim-overlay generator for the plugin v1.5.0 sunset release.
//
// Overlays the `release`-branch forge/forge/commands/*.md with shim bodies and
// regenerates integrity.json so /forge:health integrity verification still passes
// on plugin installs. It is a sibling of rewrite-plugin-urls.cjs and runs in the
// SAME forge-releaser release-branch transform seam (Step 2). It must NEVER run on
// main — main's commands/ is the single source of truth that build-payload.cjs
// copies verbatim into the CLI npm bundle (FORGE-S32-T06), so shimming main would
// poison the CLI payload. The CLI build is poured from main; the plugin overlay is
// poured here, on release only.
//
// Two template tiers:
//   FULL     — init / update / rebuild: migration explanation + node/npm preflight
//              + consent-gated `npm i -g @entelligentsia/forgecli && 4ge init claude .`
//              offer (prose only, never auto-executed) + print-only fallback.
//   REDIRECT — every other command: a one-paragraph "retired; run /forge:init to
//              migrate" notice.
//
// Usage:
//   node apply-plugin-shim.cjs --forge-root <path> --target release   # applies
//   node apply-plugin-shim.cjs --forge-root <path> --check            # dry-run preview
//
// --check / --dry-run writes nowhere and prints the planned shim bodies (the AC1
// evidence-capture path). An apply REQUIRES --target release (mirrors the
// rewrite-plugin-urls --target discipline) so a destructive run on main is refused.
//
// Exit codes: 0 = success, 1 = error / refused apply.
// Added: FORGE-S32-T07 — plugin v1.5.0 shim-only sunset release.

const fs = require('fs');
const path = require('path');
const { generateManifest } = require('./gen-integrity.cjs');

const CLI_PACKAGE = '@entelligentsia/forgecli';
const MIGRATE_CMD = '4ge init claude .';
const INSTALL_CMD = `npm i -g ${CLI_PACKAGE}`;

// Commands that receive the full consent-gated migration shim.
const FULL_SHIM_COMMANDS = ['init', 'update', 'rebuild'];

function parseFrontmatter(content) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(content);
  if (!m) return { name: null, description: null };
  const block = m[1];
  const name = (/^name:\s*(.+)$/m.exec(block) || [])[1] || null;
  const description = (/^description:\s*(.+)$/m.exec(block) || [])[1] || null;
  return { name: name && name.trim(), description: description && description.trim() };
}

function fullShimBody(name) {
  return `---
name: ${name}
description: "[SUNSET] The Forge marketplace plugin is retired — /forge:${name} now migrates you to the CLI-first install."
---

# /forge:${name} — Forge has moved to the CLI

**The Forge marketplace plugin is being sunset.** This \`/forge:${name}\` command no
longer runs the plugin workflow — its job now is to migrate you to the CLI-first
distribution, where install, update and rebuild are owned by the \`4ge\` binary.

## What changes

- **\`4ge\`** (npm \`${CLI_PACKAGE}\`) is the Forge command-line interface. It owns
  install / update / rebuild and runs the full SDLC pipeline.
- The **marketplace plugin channel is retired** as a parallel distribution
  mechanism — it is now a one-way migration ramp to the CLI.

## What is preserved

Migrating does **not** touch your project data. These are left byte-for-byte
intact:

- \`.forge/config.json\` — your project configuration
- \`.forge/store/**\` — every sprint, task, bug, feature and event record
- your knowledge-base folder (e.g. \`engineering/\`)

\`4ge init claude .\` is idempotent over an already-initialized project: it
preserves the config, store and KB and re-materializes only the generated
plugin artifacts.

## Step 1 — preflight (check your tooling first)

Before offering to install anything, confirm \`node\` and \`npm\` are present:

\`\`\`sh
command -v node || echo "MISSING: node"
command -v npm  || echo "MISSING: npm"
\`\`\`

If either is missing, **stop** — do not attempt the install. Fall through to the
print-only fallback below and tell the user to install Node.js (which bundles
npm) first.

## Step 2 — the migration offer (consent-gated, never run automatically)

If \`node\` and \`npm\` are both present, **ask the user for explicit consent** to
install the CLI and migrate. Present this exact command and wait for the user to
explicitly agree / confirm before running anything:

\`\`\`sh
${INSTALL_CMD} && ${MIGRATE_CMD}
\`\`\`

**Do not run this command unless the user has explicitly consented.** It performs
a global npm install (\`npm i -g\`) and then re-initializes the project. Only after
the user explicitly agrees may you run it via the Bash tool. If the user declines,
do not run it — fall through to the print-only fallback.

## Step 3 — print-only fallback (decline, or missing tooling)

If the user declines, or \`node\`/\`npm\` are missing, **print** these copy-paste
instructions and do nothing else:

\`\`\`sh
# 1. Install Node.js (bundles npm) if it is missing: https://nodejs.org
# 2. Install the Forge CLI:
${INSTALL_CMD}
# 3. Migrate this project (idempotent — preserves .forge/config.json,
#    .forge/store/** and your KB folder):
${MIGRATE_CMD}
\`\`\`

> Note: the first \`4ge\` run re-establishes hook approvals. Review the hooks
> approval prompt as you would any first-run — this is the weakest trust moment,
> so confirm you recognise the commands before approving.
`;
}

function redirectShimBody(name) {
  return `---
name: ${name}
description: "[SUNSET] /forge:${name} is retired in the Forge shim release — run /forge:init to migrate to the CLI."
---

# /forge:${name} — retired (Forge has moved to the CLI)

This command is **retired** in the Forge shim release. The Forge marketplace
plugin is being sunset in favour of the CLI-first distribution (\`4ge\`, npm
\`${CLI_PACKAGE}\`).

Run **\`/forge:init\`** to migrate this project to the CLI — the migration is
idempotent and preserves \`.forge/config.json\`, \`.forge/store/**\` and your
knowledge-base folder. After migrating, use the \`4ge\` binary (or the
CLI-installed \`/forge:*\` commands) instead of this plugin command.
`;
}

function buildShimBody(name, tier) {
  return tier === 'full' ? fullShimBody(name) : redirectShimBody(name);
}

function readVersion(forgeRoot) {
  try {
    const pj = JSON.parse(
      fs.readFileSync(path.join(forgeRoot, '.claude-plugin', 'plugin.json'), 'utf8'),
    );
    return pj.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

// Generate (and optionally apply) the shim overlay for a forge root.
// opts.check === true → compute the planned bodies but write nothing.
// Returns { shimmed: [{name, tier, body}], integrityRegenerated: boolean }.
function applyShim(forgeRoot, opts = {}) {
  const check = !!opts.check;
  const commandsDir = path.join(forgeRoot, 'commands');
  if (!fs.existsSync(commandsDir)) {
    throw new Error(`apply-plugin-shim: commands dir not found: ${commandsDir}`);
  }

  const files = fs
    .readdirSync(commandsDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  const shimmed = [];
  for (const file of files) {
    const name = path.basename(file, '.md');
    const tier = FULL_SHIM_COMMANDS.includes(name) ? 'full' : 'redirect';
    const body = buildShimBody(name, tier);
    shimmed.push({ name, tier, body });
    if (!check) {
      const abs = path.join(commandsDir, file);
      const tmp = abs + '.tmp.' + process.pid;
      fs.writeFileSync(tmp, body, 'utf8');
      fs.renameSync(tmp, abs);
    }
  }

  let integrityRegenerated = false;
  if (!check) {
    const version = readVersion(forgeRoot);
    generateManifest(forgeRoot, path.join(forgeRoot, 'integrity.json'), version);
    integrityRegenerated = true;
  }

  return { shimmed, integrityRegenerated };
}

function run(argv) {
  let forgeRoot = null;
  let check = false;
  let target = null;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--forge-root' && argv[i + 1]) {
      forgeRoot = path.resolve(argv[++i]);
    } else if (a === '--check' || a === '--dry-run') {
      check = true;
    } else if (a === '--target' && argv[i + 1]) {
      target = argv[++i];
    }
  }

  if (!forgeRoot) {
    forgeRoot = path.resolve(__dirname, '..');
  }

  // Release-only discipline: refuse to apply unless --target release is given.
  // The shim is a release-branch overlay; main must keep the real command tree
  // so build-payload.cjs ships real commands into the CLI npm bundle.
  if (!check && target !== 'release') {
    process.stderr.write(
      'apply-plugin-shim: refusing to apply without --target release — the shim is a ' +
        'release-branch overlay; main must keep the real command tree (build-payload ' +
        'ships main\'s commands/ verbatim into the CLI bundle). Use --check to preview, ' +
        'or pass --target release to apply on the release branch.\n',
    );
    process.exit(1);
  }

  let result;
  try {
    result = applyShim(forgeRoot, { check });
  } catch (e) {
    process.stderr.write(`apply-plugin-shim: ${e.message}\n`);
    process.exit(1);
  }

  const { shimmed, integrityRegenerated } = result;
  const full = shimmed.filter(s => s.tier === 'full').map(s => s.name);
  const redirect = shimmed.filter(s => s.tier === 'redirect').map(s => s.name);

  if (check) {
    process.stdout.write(
      `〇 apply-plugin-shim --check (no files written) — ${path.relative(process.cwd(), forgeRoot)}\n`,
    );
    process.stdout.write(`   full shim (${full.length}):     ${full.join(', ')}\n`);
    process.stdout.write(`   redirect (${redirect.length}):   ${redirect.join(', ')}\n\n`);
    for (const s of shimmed) {
      process.stdout.write(`──────── commands/${s.name}.md  [${s.tier}] ────────\n`);
      process.stdout.write(s.body);
      process.stdout.write('\n');
    }
  } else {
    process.stdout.write(
      `〇 apply-plugin-shim: overlaid ${shimmed.length} command(s) on ${path.relative(process.cwd(), forgeRoot)} (target=release)\n`,
    );
    process.stdout.write(`   full shim (${full.length}):   ${full.join(', ')}\n`);
    process.stdout.write(`   redirect (${redirect.length}): ${redirect.join(', ')}\n`);
    if (integrityRegenerated) {
      process.stdout.write('   integrity.json regenerated\n');
    }
  }

  process.exit(0);
}

if (require.main === module) {
  run(process.argv.slice(2));
}

module.exports = {
  run,
  applyShim,
  buildShimBody,
  parseFrontmatter,
  FULL_SHIM_COMMANDS,
  CLI_PACKAGE,
  INSTALL_CMD,
  MIGRATE_CMD,
};
