#!/usr/bin/env node
'use strict';

// Forge tool: manage-versions
// Manage .forge/structure-versions.json — snapshot lifecycle for structural elements.
//
// Subcommands:
//   init         Write snapshot 0 at first init (idempotent: no-op if file exists)
//   current      Print current snapshot index and metadata
//   list         Print tabular summary of all snapshots
//   add-snapshot STUB — requires enhancement agent context (T08); exits 2
//
// Composition model: Working Artifact = base@pluginVersion + snapshot@currentSnapshot + user_enhancements
// Snapshot-array invariant: snapshots is ordered ascending by index; currentSnapshot always equals
//   snapshots[snapshots.length - 1].index.
//
// Usage:
//   node manage-versions.cjs init [--dry-run]
//   node manage-versions.cjs current
//   node manage-versions.cjs list
//   node manage-versions.cjs add-snapshot
//
// Environment:
//   FORGE_ROOT — path to forge plugin root (used by init to locate plugin.json and schemas)
//   Falls back to auto-detection via ../../ from __dirname when FORGE_ROOT is unset.

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Relative path suffix for structure-versions.json (from project root)
const VERSIONS_SUFFIX = path.join('.forge', 'structure-versions.json');

// Default project root is cwd when used as CLI; exports allow test injection.
const VERSIONS_PATH = path.join(process.cwd(), VERSIONS_SUFFIX);

// ---------------------------------------------------------------------------
// Exported helpers (used by unit tests and callers)
// ---------------------------------------------------------------------------

/**
 * Resolve the path to structure-versions.json for the given project root.
 * @param {string} projectRoot
 * @returns {string}
 */
function versionsPath(projectRoot) {
  return path.join(projectRoot, VERSIONS_SUFFIX);
}

/**
 * Read and parse .forge/structure-versions.json.
 * @param {string} projectRoot
 * @returns {object} parsed document
 * @throws {Error} when file does not exist or cannot be parsed
 */
function readStructureVersions(projectRoot) {
  const filePath = versionsPath(projectRoot);
  if (!fs.existsSync(filePath)) {
    throw new Error(`structure-versions.json not found at ${filePath}. Run \`manage-versions init\` first.`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    throw new Error(`Failed to parse structure-versions.json at ${filePath}: ${e.message}`);
  }
}

/**
 * Write data to .forge/structure-versions.json atomically via .tmp.PID rename.
 * @param {string} projectRoot
 * @param {object} data
 */
function writeStructureVersions(projectRoot, data) {
  const filePath = versionsPath(projectRoot);
  const json = JSON.stringify(data, null, 2) + '\n';
  const tmp = filePath + '.tmp.' + process.pid;
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(tmp, json, 'utf8');
    fs.renameSync(tmp, filePath);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch {}
    throw new Error(`Failed to write structure-versions.json: ${e.message}`);
  }
}

/**
 * Resolve forge root from env or __dirname fallback.
 * @param {string} [envForgeRoot] - value of FORGE_ROOT env var
 * @returns {string}
 */
function resolveForgeRoot(envForgeRoot) {
  if (envForgeRoot) return envForgeRoot;
  // __dirname = forge/forge/tools → forge root is ../../ from here
  return path.join(__dirname, '..', '..');
}

/**
 * Read the plugin version from FORGE_ROOT/.claude-plugin/plugin.json.
 * @param {string} forgeRoot
 * @returns {string}
 */
function readPluginVersion(forgeRoot) {
  const pluginPath = path.join(forgeRoot, '.claude-plugin', 'plugin.json');
  try {
    const pkg = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
    if (!pkg.version) throw new Error('version field missing');
    return pkg.version;
  } catch (e) {
    throw new Error(`Failed to read plugin version from ${pluginPath}: ${e.message}`);
  }
}

/**
 * Read the overlay tool version from FORGE_ROOT/schemas/project-overlay.schema.json.
 * Falls back to "1.0.0" if the schema does not contain a version field.
 * @param {string} forgeRoot
 * @returns {string}
 */
function readOverlayToolVersion(forgeRoot) {
  const schemaPath = path.join(forgeRoot, 'schemas', 'project-overlay.schema.json');
  try {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    if (typeof schema.version === 'string' && schema.version) {
      return schema.version;
    }
  } catch {
    // Schema unreadable — fall back
  }
  return '1.0.0';
}

/**
 * Initialise structure-versions.json with snapshot 0 (base-pack).
 * Idempotent: if the file already exists, exits cleanly without overwriting.
 *
 * @param {string} projectRoot - path to the project root (where .forge/ lives)
 * @param {string} forgeRoot   - path to the forge plugin root
 * @param {boolean} [dryRun]   - when true, log intent but perform no I/O
 */
function initStructureVersions(projectRoot, forgeRoot, dryRun) {
  const filePath = versionsPath(projectRoot);

  // Idempotency: if the file already exists, do nothing.
  if (fs.existsSync(filePath)) {
    console.log(`〇 structure-versions.json already exists — skipping (idempotent).`);
    return;
  }

  const basePackVersion = readPluginVersion(forgeRoot);
  const overlayToolVersion = readOverlayToolVersion(forgeRoot);

  const doc = {
    basePackVersion,
    overlayToolVersion,
    currentSnapshot: 0,
    snapshots: [
      {
        index: 0,
        createdAt: new Date().toISOString(),
        source: 'base-pack',
        enhancedElements: [],
        archivePath: null
      }
    ]
  };

  if (dryRun) {
    console.log('[dry-run] Would write structure-versions.json:');
    console.log(JSON.stringify(doc, null, 2));
    return;
  }

  writeStructureVersions(projectRoot, doc);
  console.log(`ノ structure-versions.json written (snapshot 0, source: base-pack, plugin: v${basePackVersion})`);
}

// ---------------------------------------------------------------------------
// Exports (for unit tests)
// ---------------------------------------------------------------------------

module.exports = {
  initStructureVersions,
  readStructureVersions,
  writeStructureVersions,
  VERSIONS_PATH,
  versionsPath,
  readPluginVersion,
  readOverlayToolVersion,
};

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if (require.main === module) {

  process.on('uncaughtException', (error) => {
    console.error('Fatal manage-versions error:', error.message);
    process.exit(1);
  });

  const args = process.argv.slice(2);
  const DRY_RUN = args.includes('--dry-run');
  const subcommand = args.find(a => !a.startsWith('--'));

  const forgeRoot = resolveForgeRoot(process.env.FORGE_ROOT);
  const projectRoot = process.cwd();

  try {
    switch (subcommand) {
      case 'init': {
        initStructureVersions(projectRoot, forgeRoot, DRY_RUN);
        break;
      }

      case 'current': {
        const doc = readStructureVersions(projectRoot);
        const snap = doc.snapshots.find(s => s.index === doc.currentSnapshot);
        console.log(`Current snapshot: ${doc.currentSnapshot}`);
        if (snap) {
          console.log(`  source:    ${snap.source}`);
          console.log(`  createdAt: ${snap.createdAt}`);
          console.log(`  plugin:    v${doc.basePackVersion}`);
        }
        break;
      }

      case 'list': {
        const doc = readStructureVersions(projectRoot);
        console.log(`Snapshots (current: ${doc.currentSnapshot}):`);
        console.log(`${'#'.padEnd(4)} ${'source'.padEnd(20)} ${'createdAt'.padEnd(28)} elements`);
        console.log('-'.repeat(70));
        for (const snap of doc.snapshots) {
          const current = snap.index === doc.currentSnapshot ? '*' : ' ';
          const elems = snap.enhancedElements ? snap.enhancedElements.length : 0;
          console.log(`${current}${String(snap.index).padEnd(3)} ${snap.source.padEnd(20)} ${snap.createdAt.padEnd(28)} ${elems}`);
        }
        break;
      }

      case 'add-snapshot': {
        // STUB — full implementation deferred to T08 (enhancement agent).
        // Exits 2 (input error) to surface accidental invocations as hard failures.
        console.error('× add-snapshot requires enhancement agent context (T08) — not implemented in T05.');
        console.error('  This subcommand will be fully implemented when the enhancement agent is available.');
        process.exit(2);
        break;
      }

      default: {
        console.error(`× Unknown subcommand: ${subcommand || '(none)'}`);
        console.error('  Usage: manage-versions.cjs <init|current|list|add-snapshot> [--dry-run]');
        process.exit(1);
      }
    }
  } catch (err) {
    console.error(`× manage-versions error: ${err.message}`);
    process.exit(1);
  }
}
