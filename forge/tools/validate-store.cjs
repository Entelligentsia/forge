#!/usr/bin/env node
'use strict';

// Forge tool: validate-store
// Check store integrity: required fields, types, enums, and referential integrity.
// Usage: validate-store [--dry-run] [--fix]

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const FIX_MODE = process.argv.includes('--fix') && !DRY_RUN;
const cwd = process.cwd();

// --- Config ---
function readConfig() {
  const p = path.join(cwd, '.forge', 'config.json');
  if (!fs.existsSync(p)) { console.error('Error: .forge/config.json not found'); process.exit(1); }
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) {
    console.error(`Error: .forge/config.json is not valid JSON: ${e.message}`); process.exit(1);
  }
}

function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; }
}

function loadSchema(schemasDir, name) {
  const p = path.join(schemasDir, `${name}.schema.json`);
  return fs.existsSync(p) ? readJson(p) : null;
}

// Foreign keys that are legitimately null (e.g. standalone bug fix has no sprint)
const NULLABLE_FK = new Set(['sprintId', 'taskId']);

// --- Validation ---
function validateRecord(record, schema, fallbackRequired) {
  const errors = [];
  const required = schema ? (schema.required || []) : fallbackRequired;

  for (const field of required) {
    if (record[field] === undefined || record[field] === '') {
      errors.push(`missing required field: "${field}"`);
    } else if (record[field] === null && !NULLABLE_FK.has(field)) {
      errors.push(`missing required field: "${field}"`);
    }
  }

  if (!schema) return errors;

  // Generic property loop — covers ALL schema-defined fields including optional ones.
  // Token fields (inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens,
  // estimatedCostUSD) are not in `required`, so absent fields skip via `continue`
  // below. When present, the integer/number type checks and minimum:0 guard apply
  // automatically. No special-casing is needed for token fields.
  for (const [field, def] of Object.entries(schema.properties || {})) {
    const val = record[field];
    if (val === undefined) continue;
    if (val === null) continue;

    if (def.type) {
      const ok = def.type === 'integer' ? Number.isInteger(val)
               : def.type === 'number'  ? typeof val === 'number'
               : def.type === 'array'   ? Array.isArray(val)
               : typeof val === def.type;
      if (!ok) errors.push(`field "${field}": expected ${def.type}, got ${Array.isArray(val) ? 'array' : typeof val}`);
    }
    if (def.enum && !def.enum.includes(val)) {
      errors.push(`field "${field}": value "${val}" not in [${def.enum.join(', ')}]`);
    }
    if (def.minimum !== undefined && typeof val === 'number' && val < def.minimum) {
      errors.push(`field "${field}": value ${val} is below minimum ${def.minimum}`);
    }
  }

  return errors;
}

const FALLBACK = {
  sprint: ['sprintId', 'title', 'status'],
  task:   ['taskId', 'sprintId', 'title', 'status', 'path'],
  bug:    ['bugId', 'title', 'severity', 'status', 'path', 'reportedAt'],
  event:  ['eventId', 'sprintId', 'role', 'action', 'startTimestamp', 'endTimestamp', 'durationMinutes'],
};

const config    = readConfig();
const storePath = path.join(cwd, config.paths?.store || '.forge/store');
const schemasPath = path.join(cwd, '.forge', 'schemas');

const schemas = {
  sprint: loadSchema(schemasPath, 'sprint'),
  task:   loadSchema(schemasPath, 'task'),
  bug:    loadSchema(schemasPath, 'bug'),
  event:  loadSchema(schemasPath, 'event'),
};

const missingSchemas = Object.entries(schemas).filter(([,v]) => !v).map(([k]) => k);
if (missingSchemas.length > 0) {
  console.warn(`Warning: schema file(s) missing for: ${missingSchemas.join(', ')}`);
  console.warn('Using fallback required-field lists. Run /forge:update-tools to install schemas.\n');
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(dir, f));
}

let errors = 0;
let fixes = 0;

function err(file, msg) {
  console.error(`ERROR  ${path.relative(cwd, file)}: ${msg}`);
  errors++;
}

// --- Backfill defaults for --fix mode ---
const BACKFILL = {
  sprint: {
    createdAt: (rec) => rec.completedAt || rec.startDate || rec.endDate || new Date().toISOString(),
  },
  bug: {
    reportedAt: (rec) => rec.resolvedAt || new Date().toISOString(),
  },
};

function backfillRecord(file, rec, type) {
  const rules = BACKFILL[type];
  if (!rules) return false;
  let changed = false;
  for (const [field, derive] of Object.entries(rules)) {
    if (rec[field] === undefined || rec[field] === null || rec[field] === '') {
      const val = derive(rec);
      rec[field] = val;
      console.log(`FIXED  ${path.relative(cwd, file)}: backfilled "${field}" = "${val}"`);
      changed = true;
      fixes++;
    }
  }
  if (changed) {
    fs.writeFileSync(file, JSON.stringify(rec, null, 2) + '\n', 'utf8');
  }
  return changed;
}

// Load all records up-front for referential integrity checks
const sprintIds = new Set();
const taskIds   = new Set();
const bugIds    = new Set();

// --- Pass 1: validate structure, collect IDs ---
for (const file of listJsonFiles(path.join(storePath, 'sprints'))) {
  const rec = readJson(file);
  if (!rec) { err(file, 'invalid JSON'); continue; }
  if (FIX_MODE) backfillRecord(file, rec, 'sprint');
  if (rec.sprintId) {
    sprintIds.add(rec.sprintId);
    const prefix = config.project?.prefix;
    if (prefix) sprintIds.add(`${prefix}-${rec.sprintId}`);
  }
  for (const e of validateRecord(rec, schemas.sprint, FALLBACK.sprint)) err(file, e);
}

for (const file of listJsonFiles(path.join(storePath, 'tasks'))) {
  const rec = readJson(file);
  if (!rec) { err(file, 'invalid JSON'); continue; }
  if (rec.taskId) taskIds.add(rec.taskId);
  for (const e of validateRecord(rec, schemas.task, FALLBACK.task)) err(file, e);
}

for (const file of listJsonFiles(path.join(storePath, 'bugs'))) {
  const rec = readJson(file);
  if (!rec) { err(file, 'invalid JSON'); continue; }
  if (FIX_MODE) backfillRecord(file, rec, 'bug');
  if (rec.bugId) bugIds.add(rec.bugId);
  for (const e of validateRecord(rec, schemas.bug, FALLBACK.bug)) err(file, e);
}

// --- Pass 2: referential integrity ---
for (const file of listJsonFiles(path.join(storePath, 'tasks'))) {
  const rec = readJson(file);
  if (!rec) continue;
  if (rec.sprintId && !sprintIds.has(rec.sprintId))
    err(file, `sprintId "${rec.sprintId}" references unknown sprint`);
}

for (const file of listJsonFiles(path.join(storePath, 'bugs'))) {
  const rec = readJson(file);
  if (!rec) continue;
  for (const ref of (rec.similarBugs || [])) {
    if (!bugIds.has(ref)) err(file, `similarBugs references unknown bug "${ref}"`);
  }
}

// --- Events ---
const eventsRoot = path.join(storePath, 'events');
if (fs.existsSync(eventsRoot)) {
  for (const sprintDir of fs.readdirSync(eventsRoot)) {
    const sprintEventsDir = path.join(eventsRoot, sprintDir);
    if (!fs.statSync(sprintEventsDir).isDirectory()) continue;
    for (const file of listJsonFiles(sprintEventsDir)) {
      const rec = readJson(file);
      if (!rec) { err(file, 'invalid JSON'); continue; }
      for (const e of validateRecord(rec, schemas.event, FALLBACK.event)) err(file, e);
      if (rec.taskId && !taskIds.has(rec.taskId) && !bugIds.has(rec.taskId))
        err(file, `taskId "${rec.taskId}" references unknown task or bug`);
      if (rec.sprintId && !sprintIds.has(rec.sprintId) && rec.sprintId !== sprintDir)
        err(file, `sprintId "${rec.sprintId}" references unknown sprint`);
    }
  }
}

// --- Result ---
if (fixes > 0) {
  console.log(`${fixes} field(s) backfilled.`);
}
if (errors === 0) {
  console.log(`Store validation passed (${sprintIds.size} sprint(s), ${taskIds.size} task(s), ${bugIds.size} bug(s)).`);
  process.exit(0);
} else {
  console.error(`\n${errors} error(s) found.`);
  process.exit(1);
}
