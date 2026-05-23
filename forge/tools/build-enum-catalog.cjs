#!/usr/bin/env node
'use strict';
// Forge tool: build-enum-catalog
// Emits forge/schemas/enum-catalog.json and forge/schemas/transitions/{task,sprint,bug}.json
// from the T25 canonical state-machine tables (ADR: doc/decisions/state-machine-reconciliation.md).
//
// Usage: node build-enum-catalog.cjs [--forge-root <path>] [--dry-run]
//
// Designed to be invoked by build-manifest.cjs as a post-step (mirrors the integrity.json pattern).
// May also be invoked standalone.
//
// Closes findings: E-1 (catalog generator), E-2 (substitute-placeholders ENUM syntax seam),
//                  E-3 (hook drift elimination — drift detection in test suite).
// Task: FORGE-S25-T26

const fs = require('fs');
const path = require('path');

// ── Canonical transition tables (T25 ADR — binding) ──────────────────────────
//
// Source of truth: doc/decisions/state-machine-reconciliation.md § Canonical State Machines
// These constants are intentionally embedded here (NOT read from store-cli.cjs) to avoid
// a circular dependency (store-cli.cjs will be updated to match these tables in WI-2;
// build-enum-catalog is the authoritative source after T26).
//
// Format: { [fromState]: string[] } — each value is the allowed target states.
// Empty array [] marks a terminal state (no transitions out).

const CANONICAL_TASK_TRANSITIONS = {
  draft:                    ['planned', 'blocked', 'escalated', 'abandoned'],
  planned:                  ['plan-approved', 'plan-revision-required', 'blocked', 'escalated', 'abandoned'],
  'plan-approved':          ['implementing', 'plan-revision-required', 'blocked', 'escalated', 'abandoned'],
  implementing:             ['implemented', 'plan-revision-required', 'code-revision-required', 'blocked', 'escalated', 'abandoned'],
  implemented:              ['review-approved', 'plan-revision-required', 'code-revision-required', 'blocked', 'escalated', 'abandoned'],
  'review-approved':        ['approved', 'plan-revision-required', 'code-revision-required', 'blocked', 'escalated', 'abandoned'],
  approved:                 ['committed', 'plan-revision-required', 'code-revision-required', 'blocked', 'escalated', 'abandoned'],
  'plan-revision-required': ['planned', 'blocked', 'escalated', 'abandoned'],
  'code-revision-required': ['implementing', 'blocked', 'escalated', 'abandoned'],
  committed:                [],
  blocked:                  [],
  escalated:                [],
  abandoned:                [],
};

const CANONICAL_SPRINT_TRANSITIONS = {
  planning:              ['active', 'blocked', 'abandoned'],
  active:                ['completed', 'partially-completed', 'blocked', 'abandoned'],
  completed:             ['retrospective-done'],
  'partially-completed': ['retrospective-done'],
  'retrospective-done':  [],
  blocked:               ['active', 'abandoned'],
  abandoned:             [],
};

const CANONICAL_BUG_TRANSITIONS = {
  reported:      ['triaged', 'abandoned'],
  triaged:       ['in-progress', 'abandoned'],
  'in-progress': ['fixed', 'abandoned'],
  fixed:         [],
  abandoned:     [],
};

// ── Command names ─────────────────────────────────────────────────────────────
//
// All entries use forge:plan colon-namespaced format (NOT filename format like plan.md).
// Two categories:
//   1. Per-project commands (generated per-project via substitute-placeholders)
//   2. Plugin-reserved commands (registered via plugin surface, not per-project)
//
// When adding a new forge command, update BOTH this list AND
// hooks/lib/common.cjs:FORGE_COMMAND_PATTERNS (see drift detection test).

// Per-project commands — derived from build-manifest.cjs COMMAND_NAMES by
// strip(.md) + prepend('forge:')
const PER_PROJECT_COMMANDS = [
  'forge:sprint-intake',
  'forge:plan',
  'forge:review-plan',
  'forge:implement',
  'forge:review-code',
  'forge:fix-bug',
  'forge:sprint-plan',
  'forge:run-task',
  'forge:run-sprint',
  'forge:collate',
  'forge:retrospective',
  'forge:approve',
  'forge:commit',
  'forge:enhance',
  'forge:quiz-agent',
  'forge:validate',
];

// Plugin-reserved commands — registered via plugin surface
const PLUGIN_RESERVED_COMMANDS = [
  'forge:init',
  'forge:health',
  'forge:regenerate',
  'forge:update',
  'forge:add-task',
  'forge:add-pipeline',
  'forge:calibrate',
  'forge:materialize',
  'forge:remove',
  'forge:report-bug',
  'forge:store-query',
  'forge:store-repair',
  'forge:config',
  'forge:ask',
  'forge:store-custodian',
  'forge:refresh-kb-links',
];

const COMMAND_NAMES = [...PER_PROJECT_COMMANDS, ...PLUGIN_RESERVED_COMMANDS];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Load a JSON schema file and extract the enum array from properties.status.enum.
 * Returns the enum array, or null if not found.
 * @param {string} schemaPath
 * @returns {string[]|null}
 */
function extractStatusEnum(schemaPath) {
  if (!fs.existsSync(schemaPath)) return null;
  let schema;
  try { schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8')); } catch (_) { return null; }
  return schema?.properties?.status?.enum ?? null;
}

/**
 * Convert a transition map (object) to an array of { from, to } records.
 * @param {Record<string, string[]>} table
 * @returns {{ from: string, to: string[] }[]}
 */
function tableToArray(table) {
  return Object.entries(table).map(([from, to]) => ({ from, to }));
}

/**
 * Build the full catalog object from forgeRoot.
 * @param {string} forgeRoot - absolute path to the forge plugin root directory
 * @returns {{ version: string, generated: string, note: string, enums: object, commandNames: string[] }}
 */
function buildCatalog(forgeRoot) {
  const schemasDir = path.join(forgeRoot, 'schemas');

  const taskEnum   = extractStatusEnum(path.join(schemasDir, 'task.schema.json'));
  const sprintEnum = extractStatusEnum(path.join(schemasDir, 'sprint.schema.json'));
  const bugEnum    = extractStatusEnum(path.join(schemasDir, 'bug.schema.json'));

  let version = 'unknown';
  try {
    const pluginJson = JSON.parse(fs.readFileSync(path.join(forgeRoot, '.claude-plugin', 'plugin.json'), 'utf8'));
    version = pluginJson.version || 'unknown';
  } catch (_) {}

  const today = new Date().toISOString().slice(0, 10);

  return {
    version,
    generated: today,
    note: 'Authoritative enum catalog. Source: build-enum-catalog.cjs. Regenerate via node forge/tools/build-manifest.cjs.',
    enums: {
      'task.status':   taskEnum   || [],
      'sprint.status': sprintEnum || [],
      'bug.status':    bugEnum    || [],
    },
    commandNames: COMMAND_NAMES,
  };
}

/**
 * Write enum-catalog.json and transitions/*.json to forgeRoot/schemas/.
 * Creates directories as needed. Fail-open: logs errors but does not throw.
 * @param {string} forgeRoot
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{ catalogPath: string, transitionPaths: string[] }} written paths
 */
function writeCatalog(forgeRoot, opts = {}) {
  const dryRun = opts.dryRun || false;
  const schemasDir = path.join(forgeRoot, 'schemas');
  const transitionsDir = path.join(schemasDir, 'transitions');

  const catalog = buildCatalog(forgeRoot);
  const catalogPath = path.join(schemasDir, 'enum-catalog.json');

  const transitions = {
    task:   tableToArray(CANONICAL_TASK_TRANSITIONS),
    sprint: tableToArray(CANONICAL_SPRINT_TRANSITIONS),
    bug:    tableToArray(CANONICAL_BUG_TRANSITIONS),
  };

  if (!dryRun) {
    fs.mkdirSync(transitionsDir, { recursive: true });
    fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
  }

  const transitionPaths = [];
  for (const [entity, table] of Object.entries(transitions)) {
    const outPath = path.join(transitionsDir, `${entity}.json`);
    if (!dryRun) {
      fs.writeFileSync(outPath, JSON.stringify(table, null, 2) + '\n', 'utf8');
    }
    transitionPaths.push(outPath);
  }

  return { catalogPath, transitionPaths };
}

module.exports = {
  buildCatalog,
  writeCatalog,
  extractStatusEnum,
  tableToArray,
  CANONICAL_TASK_TRANSITIONS,
  CANONICAL_SPRINT_TRANSITIONS,
  CANONICAL_BUG_TRANSITIONS,
  COMMAND_NAMES,
  PER_PROJECT_COMMANDS,
  PLUGIN_RESERVED_COMMANDS,
};

// ── CLI entry point ───────────────────────────────────────────────────────────

if (require.main === module) {
  const argv = process.argv.slice(2);

  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write([
      'build-enum-catalog.cjs — Enum catalog + transition table generator.',
      '',
      'Usage:',
      '  node build-enum-catalog.cjs [--forge-root <path>] [--dry-run]',
      '',
      'Options:',
      '  --forge-root <path>  Forge plugin root dir (default: process.cwd())',
      '  --dry-run            Preview output without writing files',
      '  --help, -h           Show this message and exit',
    ].join('\n') + '\n');
    process.exit(0);
  }

  const forgeRootIdx = argv.indexOf('--forge-root');
  const forgeRoot = forgeRootIdx !== -1
    ? path.resolve(argv[forgeRootIdx + 1])
    : process.cwd();

  const dryRun = argv.includes('--dry-run');

  try {
    const { catalogPath, transitionPaths } = writeCatalog(forgeRoot, { dryRun });
    const prefix = dryRun ? '[dry-run] would write' : 'wrote';
    process.stdout.write(`〇 ${prefix}: ${catalogPath}\n`);
    for (const p of transitionPaths) {
      process.stdout.write(`〇 ${prefix}: ${p}\n`);
    }
  } catch (err) {
    process.stderr.write(`build-enum-catalog: ${err.message}\n`);
    process.exit(1);
  }
}
