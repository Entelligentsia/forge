#!/usr/bin/env node
'use strict';

// Forge tool: artifact
// Read, write, or list phase artifacts (PLAN.md, PROGRESS.md, *-SUMMARY.json, etc.)
// for a task, bug, or sprint. Resolves paths from entity store record.
//
// Usage:
//   node artifact.cjs read <entity> <entityId> <artifact>
//   node artifact.cjs write <entity> <entityId> <artifact> <content|@file>
//   node artifact.cjs list <entity> <entityId>
//
// Exit codes: 0 = success, 1 = usage/validation error, 2 = not found

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { findProjectRoot } = require('./lib/project-root.cjs');

// ── Artifact catalog ─────────────────────────────────────────────────────────

const ARTIFACT_CATALOG = {
  'plan':                   { filename: 'PLAN.md',                    type: 'md' },
  'plan-review':            { filename: 'PLAN_REVIEW.md',             type: 'md' },
  'progress':               { filename: 'PROGRESS.md',                type: 'md' },
  'code-review':            { filename: 'CODE_REVIEW.md',             type: 'md' },
  'validation-report':      { filename: 'VALIDATION_REPORT.md',       type: 'md' },
  'architect-approval':     { filename: 'ARCHITECT_APPROVAL.md',      type: 'md' },
  'triage':                 { filename: 'TRIAGE.md',                  type: 'md' },
  'bug-report':             { filename: 'BUG_REPORT.md',              type: 'md' },
  'index':                  { filename: 'INDEX.md',                   type: 'md' },
  'cost-report':            { filename: 'COST_REPORT.md',             type: 'md' },
  'timesheet':              { filename: 'TIMESHEET.md',               type: 'md' },
  'plan-summary':           { filename: 'PLAN-SUMMARY.json',          type: 'json' },
  'review-plan-summary':    { filename: 'REVIEW-PLAN-SUMMARY.json',   type: 'json' },
  'implementation-summary': { filename: 'IMPLEMENTATION-SUMMARY.json', type: 'json' },
  'review-code-summary':    { filename: 'REVIEW-CODE-SUMMARY.json',   type: 'json' },
  'review-impl-summary':    { filename: 'REVIEW-IMPL-SUMMARY.json',   type: 'json' },
  'validation-summary':     { filename: 'VALIDATION-SUMMARY.json',    type: 'json' },
  'approve-summary':        { filename: 'APPROVE-SUMMARY.json',       type: 'json' },
  'commit-summary':         { filename: 'COMMIT-SUMMARY.json',        type: 'json' },
  'triage-summary':         { filename: 'TRIAGE-SUMMARY.json',        type: 'json' },
  'writeback-summary':      { filename: 'WRITEBACK-SUMMARY.json',     type: 'json' },
  'collation-summary':      { filename: 'COLLATION-SUMMARY.json',     type: 'json' },
};

const ARTIFACT_NAMES = Object.keys(ARTIFACT_CATALOG).sort();

// ── Summary JSON validation ──────────────────────────────────────────────────

const SUMMARY_REQUIRED = ['objective', 'key_changes', 'verdict', 'written_at'];

function validateSummaryJson(content) {
  let obj;
  try {
    obj = JSON.parse(content);
  } catch (e) {
    return `Invalid JSON: ${e.message}`;
  }
  const missing = SUMMARY_REQUIRED.filter((f) => !(f in obj));
  if (missing.length > 0) return `Missing required fields: ${missing.join(', ')}`;
  if (typeof obj.objective !== 'string') return `"objective" must be a string`;
  if (!Array.isArray(obj.key_changes)) return `"key_changes" must be an array`;
  if (typeof obj.verdict !== 'string') return `"verdict" must be a string`;
  if (typeof obj.written_at !== 'string') return `"written_at" must be a string`;
  return null;
}

// ── Entity path resolution ───────────────────────────────────────────────────

/** Read a store record via store-cli and return its `path` field, or null on failure. */
function readStorePath(entity, entityId, toolDir, projectRoot) {
  const cliPath = path.join(toolDir, 'store-cli.cjs');
  try {
    const result = execFileSync('node', [cliPath, 'read', entity, entityId, '--json'], {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 10_000,
    });
    const record = JSON.parse(result);
    if (typeof record.path === 'string' && record.path.length > 0) {
      // Defensive: if the path ends with a file extension, the store record
      // was written with a filename (e.g. "…/PROGRESS.md") instead of the
      // directory. Strip the trailing filename to get the entity directory.
      const p = record.path;
      if (/\.(md|json)$/i.test(p)) return path.dirname(p);
      return p;
    }
  } catch (_) {
    // Store unavailable or record not found — fall through.
  }
  return null;
}

/**
 * Resolve entity directory using the store record's `path` field when available,
 * falling back to ID-only construction.
 */
function resolveEntityDir(entity, entityId, engineeringPath, toolDir, projectRoot) {
  switch (entity) {
    case 'bug': {
      const storePath = readStorePath('bug', entityId, toolDir, projectRoot);
      if (storePath) return storePath;
      return path.join(engineeringPath, 'bugs', entityId);
    }
    case 'sprint': {
      const storePath = readStorePath('sprint', entityId, toolDir, projectRoot);
      if (storePath) return storePath;
      return path.join(engineeringPath, 'sprints', entityId);
    }
    case 'task': {
      const storePath = readStorePath('task', entityId, toolDir, projectRoot);
      if (storePath) return storePath;
      // Fallback: derive from sprint prefix + sprint record path.
      const match = entityId.match(/^(.+-S\d+)-T\d+$/);
      if (!match) return null;
      const sprintId = match[1];
      const sprintPath = readStorePath('sprint', sprintId, toolDir, projectRoot);
      if (sprintPath) {
        return path.join(sprintPath, entityId);
      }
      return path.join(engineeringPath, 'sprints', sprintId, entityId);
    }
    default:
      return null;
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

if (require.main === module) {

const argv = process.argv.slice(2);

if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
  process.stderr.write([
    'Usage: node artifact.cjs <subcommand> <entity> <entityId> [artifact] [content|@file]',
    '',
    'Subcommands:',
    '  list <entity> <entityId>                   List existing artifacts',
    '  read <entity> <entityId> <artifact>         Read artifact content',
    '  write <entity> <entityId> <artifact> <content|@file>',
    '                                              Write artifact (content or @/path/to/file)',
    '',
    'Entities: task, bug, sprint',
    `Known artifacts: ${ARTIFACT_NAMES.join(', ')}`,
    '',
    'Exit codes: 0=success, 1=usage/validation error, 2=not found',
  ].join('\n') + '\n');
  process.exit(1);
}

const [subcmd, entity, entityId] = argv;

if (!subcmd || !entity || !entityId) {
  process.stderr.write('Usage: artifact.cjs <list|read|write> <entity> <entityId> [artifact] [content]\n');
  process.exit(1);
}

const VALID_ENTITIES = ['task', 'bug', 'sprint'];
if (!VALID_ENTITIES.includes(entity)) {
  process.stderr.write(`Unknown entity type: ${entity}. Valid: ${VALID_ENTITIES.join(', ')}\n`);
  process.exit(1);
}

const projectRoot = findProjectRoot();
if (!projectRoot) {
  process.stderr.write('Cannot find project root (.forge/config.json not found)\n');
  process.exit(1);
}

// Read engineering path from config
let engineeringPath = 'engineering';
try {
  const cfg = JSON.parse(fs.readFileSync(path.join(projectRoot, '.forge', 'config.json'), 'utf8'));
  if (typeof cfg.paths?.engineering === 'string') engineeringPath = cfg.paths.engineering;
} catch (_) { /* default */ }

const toolDir = __dirname;

const entityDir = resolveEntityDir(entity, entityId, engineeringPath, toolDir, projectRoot);
if (!entityDir) {
  process.stderr.write(
    `Cannot resolve ${entity} directory for "${entityId}". ` +
    `Expected ID pattern: task=PREFIX-SNN-TNN, bug=PREFIX-BNN[-slug], sprint=PREFIX-SNN.\n`
  );
  process.exit(1);
}

const absDir = path.resolve(projectRoot, entityDir);

// ── list ────────────────────────────────────────────────────────────────────

if (subcmd === 'list') {
  if (!fs.existsSync(absDir)) {
    process.stdout.write(`No artifacts found — directory does not exist: ${entityDir}/\n`);
    process.exit(0);
  }
  const files = fs.readdirSync(absDir).filter((f) => f.endsWith('.md') || f.endsWith('.json'));
  const known = [];
  const other = [];
  for (const f of files) {
    const catalogEntry = Object.entries(ARTIFACT_CATALOG).find(([, v]) => v.filename === f);
    if (catalogEntry) {
      known.push(`  ${catalogEntry[0]} → ${f}`);
    } else {
      other.push(`  (unlisted) ${f}`);
    }
  }
  const lines = [`Artifacts in ${entityDir}/:`];
  if (known.length > 0) lines.push(...known);
  if (other.length > 0) lines.push(...other);
  if (known.length === 0 && other.length === 0) lines.push('  (empty)');
  process.stdout.write(lines.join('\n') + '\n');
  process.exit(0);
}

// ── read / write — need artifact name ───────────────────────────────────────

const artifactName = argv[3];
if (!artifactName) {
  process.stderr.write(`"artifact" is required for ${subcmd}. Known: ${ARTIFACT_NAMES.join(', ')}\n`);
  process.exit(1);
}

const catalogEntry = ARTIFACT_CATALOG[artifactName];
if (!catalogEntry) {
  const suggestions = ARTIFACT_NAMES.filter((n) => n.includes(artifactName.toLowerCase()));
  process.stderr.write(
    `Unknown artifact "${artifactName}". Known: ${ARTIFACT_NAMES.join(', ')}.` +
    (suggestions.length > 0 ? ` Did you mean: ${suggestions.join(', ')}?` : '') + '\n'
  );
  process.exit(1);
}

const filePath = path.join(absDir, catalogEntry.filename);

// ── read ─────────────────────────────────────────────────────────────────────

if (subcmd === 'read') {
  if (!fs.existsSync(filePath)) {
    process.stderr.write(`Artifact not found: ${path.join(entityDir, catalogEntry.filename)}\n`);
    process.exit(2);
  }
  process.stdout.write(fs.readFileSync(filePath, 'utf8'));
  process.exit(0);
}

// ── write ─────────────────────────────────────────────────────────────────────

if (subcmd === 'write') {
  let rawContent = argv[4];
  if (!rawContent) {
    process.stderr.write('"content" is required for write. Pass inline or use @/path/to/file for large content.\n');
    process.exit(1);
  }

  // @-prefix convention: read content from file when arg starts with @
  let content;
  if (rawContent.startsWith('@')) {
    const contentFile = rawContent.slice(1);
    if (!fs.existsSync(contentFile)) {
      process.stderr.write(`@-file not found: ${contentFile}\n`);
      process.exit(1);
    }
    content = fs.readFileSync(contentFile, 'utf8');
  } else {
    content = rawContent;
  }

  if (catalogEntry.type === 'json') {
    const validationError = validateSummaryJson(content);
    if (validationError) {
      process.stderr.write(
        `Summary validation failed for ${catalogEntry.filename}: ${validationError}. ` +
        `Required fields: ${SUMMARY_REQUIRED.join(', ')}.\n`
      );
      process.exit(1);
    }
  }

  fs.mkdirSync(absDir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  process.stdout.write(
    `Wrote ${Buffer.byteLength(content, 'utf8')} bytes to ${path.join(entityDir, catalogEntry.filename)}\n`
  );
  process.exit(0);
}

process.stderr.write(`Unknown subcommand: ${subcmd}. Valid: list, read, write\n`);
process.exit(1);

} // end if (require.main === module)

module.exports = { ARTIFACT_CATALOG, ARTIFACT_NAMES, validateSummaryJson, resolveEntityDir };
