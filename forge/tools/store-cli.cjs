#!/usr/bin/env node
'use strict';

// Forge tool: store-cli
// Deterministic store custodian CLI — wraps store.cjs facade.
// Enforces schema validation on write and status transition rules.
// Usage: node store-cli.cjs <command> <args>

let _store;
function _getStore() { return _store || (_store = require('./store.cjs')); }

let _schemas;
function _getSchemas() {
  if (_schemas) return _schemas;
  const fs = require('fs');
  const path = require('path');

  const ENTITY_TYPES = ['sprint', 'task', 'bug', 'event', 'feature'];

  const MINIMAL_REQUIRED = {
    sprint:  ['sprintId', 'title', 'status', 'taskIds', 'createdAt'],
    task:    ['taskId', 'sprintId', 'title', 'status', 'path'],
    bug:     ['bugId', 'title', 'severity', 'status', 'path', 'reportedAt'],
    event:   ['eventId', 'taskId', 'sprintId', 'role', 'action', 'phase', 'iteration', 'startTimestamp', 'endTimestamp', 'durationMinutes', 'model'],
    feature: ['id', 'title', 'status', 'created_at']
  };

  const schemas = {};
  const projectDir   = path.join('.forge', 'schemas');
  const inTreeDir    = path.join('forge', 'schemas');
  const pluginDir    = path.join(__dirname, '..', 'schemas');

  const AUX_SCHEMAS = {
    'event-sidecar':    'event-sidecar.schema.json',
    'progress-entry':   'progress-entry.schema.json',
    'collation-state':  'collation-state.schema.json',
  };

  const allTypes = [...ENTITY_TYPES, ...Object.keys(AUX_SCHEMAS)];
  for (const type of allTypes) {
    const schemaFile = AUX_SCHEMAS[type] || `${type}.schema.json`;
    let schema = null;

    // 1. Try project-installed schemas first
    const projectPath = path.join(projectDir, schemaFile);
    try {
      if (fs.existsSync(projectPath)) {
        schema = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
      }
    } catch (_) {}

    // 2. Fall back to in-tree source schemas (development mode)
    if (!schema) {
      const inTreePath = path.join(inTreeDir, schemaFile);
      try {
        if (fs.existsSync(inTreePath)) {
          schema = JSON.parse(fs.readFileSync(inTreePath, 'utf8'));
        }
      } catch (_) {}
    }

    // 3. Fall back to plugin-installed schemas (production mode)
    //    store-cli.cjs lives at $FORGE_ROOT/tools/, so __dirname/../schemas/
    //    resolves to $FORGE_ROOT/schemas/ — always correct for installed plugins.
    if (!schema) {
      const pluginPath = path.join(pluginDir, schemaFile);
      try {
        if (fs.existsSync(pluginPath)) {
          schema = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
        }
      } catch (_) {}
    }

    if (schema) {
      schemas[type] = schema;
    } else {
      console.error(`WARN: schema file ${schemaFile} not found, using minimal fallback`);
      schemas[type] = { type: 'object', required: MINIMAL_REQUIRED[type] || [], properties: {} };
    }
  }

  _schemas = schemas;
  return _schemas;
}

// ---------------------------------------------------------------------------
// Schema loading — same resolution as validate-store.cjs
// ---------------------------------------------------------------------------

const ENTITY_TYPES = ['sprint', 'task', 'bug', 'event', 'feature'];

const MINIMAL_REQUIRED = {
  sprint:  ['sprintId', 'title', 'status', 'taskIds', 'createdAt'],
  task:    ['taskId', 'sprintId', 'title', 'status', 'path'],
  bug:     ['bugId', 'title', 'severity', 'status', 'path', 'reportedAt'],
  event:   ['eventId', 'taskId', 'sprintId', 'role', 'action', 'phase', 'iteration', 'startTimestamp', 'endTimestamp', 'durationMinutes', 'model'],
  feature: ['id', 'title', 'status', 'created_at']
};

// Shared validator + nullable-field set live in ./lib/validate.js so the
// write-boundary hook can reuse the exact same validation logic as tool writes.
const { validateRecord, NULLABLE_FIELDS } = require('./lib/validate.js');

// Valid phase keys for summaries (dot-delimited → underscore in JSON key)
const VALID_SUMMARY_PHASES = new Set(['plan', 'review_plan', 'implementation', 'code_review', 'validation']);

// Schema for a single phase summary (used by set-summary / set-bug-summary)
const PHASE_SUMMARY_SCHEMA = {
  type: 'object',
  required: ['objective', 'written_at'],
  properties: {
    objective:   { type: 'string', maxLength: 280 },
    key_changes: { type: 'array', items: { type: 'string', maxLength: 200 }, maxItems: 12 },
    findings:    { type: 'array', items: { type: 'string', maxLength: 200 }, maxItems: 12 },
    verdict:     { type: 'string', enum: ['approved', 'revision', 'n/a'] },
    written_at:  { type: 'string' },
    artifact_ref:{ type: 'string' }
  },
  additionalProperties: false
};

// validateRecord imported from ./lib/validate.js above.

// ---------------------------------------------------------------------------
// Transition tables
// ---------------------------------------------------------------------------

const TASK_TRANSITIONS = {
  draft:                 ['planned', 'plan-revision-required', 'code-revision-required', 'blocked', 'escalated', 'abandoned'],
  planned:               ['plan-approved', 'plan-revision-required', 'code-revision-required', 'blocked', 'escalated', 'abandoned'],
  'plan-approved':       ['implementing', 'plan-revision-required', 'code-revision-required', 'blocked', 'escalated', 'abandoned'],
  implementing:          ['implemented', 'plan-revision-required', 'code-revision-required', 'blocked', 'escalated', 'abandoned'],
  implemented:           ['review-approved', 'plan-revision-required', 'code-revision-required', 'blocked', 'escalated', 'abandoned'],
  'review-approved':     ['approved', 'plan-revision-required', 'code-revision-required', 'blocked', 'escalated', 'abandoned'],
  approved:              ['committed', 'plan-revision-required', 'code-revision-required', 'blocked', 'escalated', 'abandoned'],
  // Terminal: committed, abandoned — no transitions out
};

const SPRINT_TRANSITIONS = {
  planning:    ['active', 'blocked', 'partially-completed', 'abandoned'],
  active:      ['completed', 'blocked', 'partially-completed', 'abandoned'],
  completed:   ['retrospective-done', 'blocked', 'partially-completed', 'abandoned'],
  // Terminal: retrospective-done, abandoned
};

const BUG_TRANSITIONS = {
  reported:     ['triaged'],
  triaged:      ['in-progress'],
  'in-progress': ['fixed'],
  fixed:        ['verified'],
  // Terminal: verified
};

const FEATURE_TRANSITIONS = {
  draft:   ['active'],
  active:  ['shipped', 'retired'],
  // Terminal: shipped, retired
};

const TRANSITION_MAP = {
  task:    TASK_TRANSITIONS,
  sprint:  SPRINT_TRANSITIONS,
  bug:     BUG_TRANSITIONS,
  feature: FEATURE_TRANSITIONS
};

const TERMINAL_STATES = new Set([
  'committed', 'abandoned',          // task
  'retrospective-done',              // sprint
  'verified',                        // bug
  'shipped', 'retired'               // feature
]);

// Failed states that may be entered from any non-terminal state
const FAILED_STATES = new Set([
  'plan-revision-required', 'code-revision-required', 'blocked', 'escalated', 'abandoned',  // task
  'blocked', 'partially-completed'  // sprint
]);

function isLegalTransition(entityType, field, currentValue, newValue) {
  if (currentValue === newValue) return true; // no-op

  const table = TRANSITION_MAP[entityType];
  if (!table) return true; // no transition rules for this entity type

  // Terminal states cannot transition out
  if (TERMINAL_STATES.has(currentValue)) return false;

  // Failed states may be entered from any non-terminal state
  if (FAILED_STATES.has(newValue)) return true;

  // Check the explicit transition table
  const allowed = table[currentValue];
  if (!allowed) return false; // current state not in table (unknown state)

  return allowed.includes(newValue);
}

module.exports = { isLegalTransition, validateRecord, TRANSITION_MAP, TERMINAL_STATES, FAILED_STATES, ENTITY_TYPES, MINIMAL_REQUIRED, NULLABLE_FIELDS, VALID_SUMMARY_PHASES, PHASE_SUMMARY_SCHEMA };

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
if (require.main === module) {

process.on('uncaughtException', (error) => {
  console.error('Fatal store-cli error:', error);
  process.exit(1);
});

try {
const fs = require('fs');
const path = require('path');
const store = _getStore();
const schemas = _getSchemas();

const DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Entity ID field mapping
// ---------------------------------------------------------------------------

const ENTITY_ID_FIELD = {
  sprint:  'sprintId',
  task:    'taskId',
  bug:     'bugId',
  event:   'eventId',
  feature: 'id'
};

// ---------------------------------------------------------------------------
// Store accessor mapping
// ---------------------------------------------------------------------------

function getEntity(entity, id) {
  switch (entity) {
    case 'sprint':  return store.getSprint(id);
    case 'task':    return store.getTask(id);
    case 'bug':     return store.getBug(id);
    case 'event':   return store.getEvent(id, null); // needs sprintId separately
    case 'feature': return store.getFeature(id);
    default:        return null;
  }
}

function writeEntity(entity, data) {
  switch (entity) {
    case 'sprint':  return store.writeSprint(data);
    case 'task':    return store.writeTask(data);
    case 'bug':     return store.writeBug(data);
    case 'event':   return store.writeEvent(data.sprintId, data);
    case 'feature': return store.writeFeature(data);
  }
}

function deleteEntity(entity, id) {
  switch (entity) {
    case 'sprint':  return store.deleteSprint(id);
    case 'task':    return store.deleteTask(id);
    case 'bug':     return store.deleteBug(id);
    case 'feature': return store.deleteFeature(id);
    default:
      console.error(`Unknown entity type: ${entity}`);
      process.exit(1);
  }
}

function listEntities(entity, filter) {
  switch (entity) {
    case 'sprint':  return store.listSprints(filter);
    case 'task':    return store.listTasks(filter);
    case 'bug':     return store.listBugs(filter);
    case 'feature': return store.listFeatures(filter);
    default:
      console.error(`Unknown entity type: ${entity}`);
      process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Sidecar handling
// ---------------------------------------------------------------------------

// Canonical event schema token fields
const CANONICAL_TOKEN_FIELDS = [
  'inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens',
  'estimatedCostUSD', 'model', 'durationMinutes', 'startTimestamp', 'endTimestamp',
  'tokenSource'
];

// Accepted sidecar fields (includes aliases)
const SIDECAR_ACCEPTED_FIELDS = new Set([
  'inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens',
  'estimatedCostUSD', 'model', 'cost', 'durationMinutes',
  'startTimestamp', 'endTimestamp', 'cacheCreationTokens',
  'tokenSource'
]);

// Alias mapping for sidecar → canonical event
const SIDECAR_ALIASES = {
  'cacheCreationTokens': 'cacheWriteTokens',
  'cost': 'estimatedCostUSD'
};

function resolveSidecarDir(sprintId) {
  const storeRoot = store.impl.storeRoot;
  return path.join(storeRoot, 'events', sprintId);
}

function sidecarPath(sprintId, eventId) {
  return path.join(resolveSidecarDir(sprintId), `_${eventId}_usage.json`);
}

function canonicalEventPath(sprintId, eventId) {
  return path.join(resolveSidecarDir(sprintId), `${eventId}.json`);
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`Forge Store Custodian CLI

Usage: node store-cli.cjs <command> <args> [--dry-run]

Commands:
  write <entity> '<json>'                     Write a full entity record
  read <entity> <id> [--json]                 Read an entity record
  list <entity> [key=value ...]               List entities with optional filter
  delete <entity> <id>                        Delete an entity record
  update-status <entity> <id> <field> <value> [--force]
                                              Update status/enum field with transition check
  emit <sprintId> '<json>' [--sidecar]        Write an event (or sidecar)
  merge-sidecar <sprintId> <eventId>          Merge sidecar into canonical event
  purge-events <sprintId>                     Delete all events for a sprint
  progress <sprintOrBugId> <agentName> <bannerKey> <status> [detail]
                                              Append a progress entry to the log
  progress-clear <sprintOrBugId>              Clear (truncate) the progress log
  write-collation-state '<json>'             Write COLLATION_STATE.json
  validate <entity> '<json>'                  Validate against schema without writing
  set-summary <taskId> <phase> <jsonFile>     Set a phase summary on a task record
  set-bug-summary <bugId> <phase> <jsonFile>  Set a phase summary on a bug record

Entities: sprint, task, bug, event, feature
Phases (summaries): plan, review_plan, implementation, code_review, validation

Flags:
  --dry-run    Validate and preview without writing (applies to all write commands)
  --force      Bypass transition check on update-status (emits warning)
  --json       Output raw JSON on read (no pretty-print)
  --sidecar    Write as sidecar file on emit (ephemeral _-prefixed)

Exit codes: 0 on success, 1 on failure`);
  process.exit(0);
}

const command = args[0];

// ---------------------------------------------------------------------------
// Command implementations
// ---------------------------------------------------------------------------

function cmdWrite() {
  const entity = args[1];
  const jsonStr = args[2];

  if (!entity || !jsonStr) {
    console.error('Usage: store-cli.cjs write <entity> \'<json>\'');
    process.exit(1);
  }

  if (!ENTITY_TYPES.includes(entity)) {
    console.error(`Unknown entity type: ${entity}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    console.error(`Invalid JSON: ${e.message}`);
    process.exit(1);
  }

  const errors = validateRecord(data, schemas[entity]);
  if (errors.length > 0) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log(`[dry-run] would write ${entity} ${data[ENTITY_ID_FIELD[entity]]}`);
  } else {
    writeEntity(entity, data);
  }
  console.log(JSON.stringify({ ok: true, entity, id: data[ENTITY_ID_FIELD[entity]], dryRun: DRY_RUN }));
}

function cmdRead() {
  const entity = args[1];
  const id = args[2];
  const asJson = args.includes('--json');

  if (!entity || !id) {
    console.error('Usage: store-cli.cjs read <entity> <id> [--json]');
    process.exit(1);
  }

  if (!ENTITY_TYPES.includes(entity)) {
    console.error(`Unknown entity type: ${entity}`);
    process.exit(1);
  }

  // Events need sprintId for lookup — read by eventId with sprintId resolution
  let record;
  if (entity === 'event') {
    // For events, try to find by scanning sprint directories
    const sprints = store.listSprints();
    record = null;
    for (const sprint of sprints) {
      if (!sprint) continue;
      const found = store.getEvent(id, sprint.sprintId);
      if (found) { record = found; break; }
    }
  } else {
    record = getEntity(entity, id);
  }

  if (!record) {
    console.error(`Entity not found: ${entity} ${id}`);
    process.exit(1);
  }

  if (asJson) {
    console.log(JSON.stringify(record));
  } else {
    console.log(JSON.stringify(record, null, 2));
  }
}

function cmdList() {
  const entity = args[1];

  if (!entity) {
    console.error('Usage: store-cli.cjs list <entity> [key=value ...]');
    process.exit(1);
  }

  if (!ENTITY_TYPES.includes(entity)) {
    console.error(`Unknown entity type: ${entity}`);
    process.exit(1);
  }

  // Parse key=value filter pairs from remaining args
  const filter = {};
  for (let i = 2; i < args.length; i++) {
    const eqIdx = args[i].indexOf('=');
    if (eqIdx > 0) {
      const key = args[i].slice(0, eqIdx);
      const val = args[i].slice(eqIdx + 1);
      // Try to parse numeric values
      const num = Number(val);
      filter[key] = (val !== '' && !isNaN(num) && val === String(num)) ? num : val;
    }
  }

  const records = listEntities(entity, Object.keys(filter).length > 0 ? filter : undefined);
  console.log(JSON.stringify(records, null, 2));
}

function cmdDelete() {
  const entity = args[1];
  const id = args[2];

  if (!entity || !id) {
    console.error('Usage: store-cli.cjs delete <entity> <id>');
    process.exit(1);
  }

  if (!ENTITY_TYPES.includes(entity)) {
    console.error(`Unknown entity type: ${entity}`);
    process.exit(1);
  }

  deleteEntity(entity, id);
  console.log(JSON.stringify({ ok: true, deleted: `${entity}/${id}` }));
}

function cmdUpdateStatus() {
  const entity = args[1];
  const id = args[2];
  const field = args[3];
  const value = args[4];
  const force = args.includes('--force');

  if (!entity || !id || !field || !value) {
    console.error('Usage: store-cli.cjs update-status <entity> <id> <field> <value> [--force]');
    process.exit(1);
  }

  if (!TRANSITION_MAP[entity]) {
    console.error(`No transition rules for entity type: ${entity}`);
    process.exit(1);
  }

  // Read current record
  const record = getEntity(entity, id);
  if (!record) {
    console.error(`Entity not found: ${entity} ${id}`);
    process.exit(1);
  }

  const currentValue = record[field];
  if (currentValue === undefined) {
    console.error(`Field "${field}" not found on ${entity} ${id}`);
    process.exit(1);
  }

  // Check transition legality
  if (!force && !isLegalTransition(entity, field, currentValue, value)) {
    console.error(`Illegal transition: ${entity} ${id} ${field}: ${currentValue} → ${value}`);
    process.exit(1);
  }

  if (force && !isLegalTransition(entity, field, currentValue, value)) {
    console.error(`WARN: --force bypassing illegal transition: ${entity} ${id} ${field}: ${currentValue} → ${value}`);
  }

  // Apply update and write back
  if (DRY_RUN) {
    console.log(`[dry-run] would update ${entity} ${id} ${field}: ${currentValue} → ${value}`);
  } else {
    record[field] = value;
    writeEntity(entity, record);
  }
  console.log(JSON.stringify({ ok: true, entity, id, field, from: currentValue, to: value, force, dryRun: DRY_RUN }));
}

function cmdEmit() {
  const sprintId = args[1];
  const jsonStr = args[2];
  const isSidecar = args.includes('--sidecar');

  if (!sprintId || !jsonStr) {
    console.error('Usage: store-cli.cjs emit <sprintId> \'<json>\' [--sidecar]');
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    console.error(`Invalid JSON: ${e.message}`);
    process.exit(1);
  }

  if (isSidecar) {
    // Write sidecar file — validate against the sidecar schema (eventId +
    // optional token/cost fields). Full event-shape enforcement happens
    // on merge into the canonical event.
    const sidecarErrors = validateRecord(data, schemas['event-sidecar']);
    if (sidecarErrors.length > 0) {
      for (const e of sidecarErrors) console.error(e);
      process.exit(1);
    }

    const sidecarDir = resolveSidecarDir(sprintId);
    const filePath = sidecarPath(sprintId, data.eventId);

    if (DRY_RUN) {
      console.log(`[dry-run] would write sidecar _${data.eventId}_usage.json`);
    } else {
      // Ensure directory exists
      if (!fs.existsSync(sidecarDir)) {
        fs.mkdirSync(sidecarDir, { recursive: true });
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    }
    console.log(JSON.stringify({ ok: true, sidecar: true, eventId: data.eventId, sprintId, dryRun: DRY_RUN }));
  } else {
    // Validate as event entity
    const errors = validateRecord(data, schemas.event);
    if (errors.length > 0) {
      for (const e of errors) console.error(e);
      process.exit(1);
    }

    if (DRY_RUN) {
      console.log(`[dry-run] would emit event ${data.eventId}`);
    } else {
      store.writeEvent(sprintId, data);
    }
    console.log(JSON.stringify({ ok: true, event: true, eventId: data.eventId, sprintId, dryRun: DRY_RUN }));
  }
}

function cmdMergeSidecar() {
  const sprintId = args[1];
  const eventId = args[2];

  if (!sprintId || !eventId) {
    console.error('Usage: store-cli.cjs merge-sidecar <sprintId> <eventId>');
    process.exit(1);
  }

  // Read sidecar
  const scPath = sidecarPath(sprintId, eventId);
  if (!fs.existsSync(scPath)) {
    console.error(`Sidecar not found: ${scPath}`);
    process.exit(1);
  }

  let sidecar;
  try {
    sidecar = JSON.parse(fs.readFileSync(scPath, 'utf8'));
  } catch (e) {
    console.error(`Invalid sidecar JSON: ${e.message}`);
    process.exit(1);
  }

  // Read canonical event
  const canPath = canonicalEventPath(sprintId, eventId);
  if (!fs.existsSync(canPath)) {
    console.error(`Canonical event not found: ${canPath}`);
    process.exit(1);
  }

  let event;
  try {
    event = JSON.parse(fs.readFileSync(canPath, 'utf8'));
  } catch (e) {
    console.error(`Invalid canonical event JSON: ${e.message}`);
    process.exit(1);
  }

  // Merge token fields from sidecar into event
  for (const [key, value] of Object.entries(sidecar)) {
    // Resolve aliases
    const canonicalKey = SIDECAR_ALIASES[key] || key;
    if (CANONICAL_TOKEN_FIELDS.includes(canonicalKey)) {
      event[canonicalKey] = value;
    }
  }

  // Re-validate the merged canonical event against the event schema. Catches
  // the case where a sidecar's token field is present but the canonical event
  // was already malformed — we do not want to silently persist invalid data.
  const mergedErrors = validateRecord(event, schemas.event);
  if (mergedErrors.length > 0) {
    console.error(`Merged event ${eventId} failed schema validation:`);
    for (const e of mergedErrors) console.error(`  ${e}`);
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log(`[dry-run] would merge sidecar into ${eventId} and delete sidecar`);
  } else {
    // Write updated event via facade (handles ghost-file logic)
    store.writeEvent(sprintId, event);

    // Delete sidecar
    fs.unlinkSync(scPath);
  }

  console.log(JSON.stringify({ ok: true, merged: true, eventId, sprintId, dryRun: DRY_RUN }));
}

function cmdPurgeEvents() {
  const sprintId = args[1];

  if (!sprintId) {
    console.error('Usage: store-cli.cjs purge-events <sprintId>');
    process.exit(1);
  }

  const result = store.purgeEvents(sprintId, { dryRun: DRY_RUN });
  if (DRY_RUN && !result.purged) {
    console.log(`[dry-run] would purge ${result.fileCount} event(s) for ${sprintId}`);
  }
  console.log(JSON.stringify(result, null, 2));
}

function cmdWriteCollationState() {
  const jsonStr = args[1];

  if (!jsonStr) {
    console.error('Usage: store-cli.cjs write-collation-state \'<json>\'');
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    console.error(`Invalid JSON: ${e.message}`);
    process.exit(1);
  }

  const csErrors = validateRecord(data, schemas['collation-state']);
  if (csErrors.length > 0) {
    for (const e of csErrors) console.error(e);
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log('[dry-run] would write COLLATION_STATE.json');
  } else {
    store.writeCollationState(data);
  }
  console.log(JSON.stringify({ ok: true, dryRun: DRY_RUN }));
}

function cmdProgress() {
  const sprintOrBugId = args[1];
  const agentName = args[2];
  const bannerKey = args[3];
  const status = args[4];
  const detail = args.slice(5).join(' ');

  if (!sprintOrBugId || !agentName || !bannerKey || !status) {
    console.error('Usage: store-cli.cjs progress <sprintOrBugId> <agentName> <bannerKey> <status> [detail]');
    console.error('  status: start | progress | done | error');
    process.exit(1);
  }

  const timestamp = new Date().toISOString();

  const progressErrors = validateRecord(
    { timestamp, agentName, bannerKey, status, detail: detail || '' },
    schemas['progress-entry']
  );
  if (progressErrors.length > 0) {
    for (const e of progressErrors) console.error(e);
    process.exit(1);
  }

  const line = `${timestamp}|${agentName}|${bannerKey}|${status}|${detail}\n`;

  const dir = path.join('.forge', 'store', 'events', sprintOrBugId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const logPath = path.join(dir, 'progress.log');
  fs.appendFileSync(logPath, line, 'utf8');

  // Emit human-readable summary to stdout
  let banners;
  try { banners = require('./banners.cjs'); } catch { banners = null; }
  let emoji = bannerKey;
  if (banners && typeof banners.mark === 'function') {
    try { emoji = banners.mark(bannerKey); } catch { emoji = bannerKey; }
  }
  const summary = `${emoji}  ${agentName}  [${status}]${detail ? '  ' + detail : ''}`;
  process.stdout.write(summary + '\n');
}

function cmdProgressClear() {
  const sprintOrBugId = args[1];

  if (!sprintOrBugId) {
    console.error('Usage: store-cli.cjs progress-clear <sprintOrBugId>');
    process.exit(1);
  }

  const dir = path.join('.forge', 'store', 'events', sprintOrBugId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const logPath = path.join(dir, 'progress.log');
  fs.writeFileSync(logPath, '', 'utf8');
  console.log(`Cleared ${logPath}`);
}

function cmdValidate() {
  const entity = args[1];
  const jsonStr = args[2];

  if (!entity || !jsonStr) {
    console.error('Usage: store-cli.cjs validate <entity> \'<json>\'');
    process.exit(1);
  }

  if (!ENTITY_TYPES.includes(entity)) {
    console.error(`Unknown entity type: ${entity}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    console.error(`Invalid JSON: ${e.message}`);
    process.exit(1);
  }

  const errors = validateRecord(data, schemas[entity]);
  if (errors.length > 0) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, entity, valid: true }));
}

function _setSummaryOnEntity(entityKind, entityId, phase, summaryFilePath) {
  if (!VALID_SUMMARY_PHASES.has(phase)) {
    console.error(`Unknown phase "${phase}". Valid phases: ${[...VALID_SUMMARY_PHASES].join(', ')}`);
    process.exit(1);
  }

  // Read and validate summary JSON
  if (!fs.existsSync(summaryFilePath)) {
    console.error(`Summary file not found: ${summaryFilePath}`);
    process.exit(1);
  }

  let summary;
  try {
    summary = JSON.parse(fs.readFileSync(summaryFilePath, 'utf8'));
  } catch (e) {
    console.error(`Invalid JSON in summary file: ${e.message}`);
    process.exit(1);
  }

  const errors = validateRecord(summary, PHASE_SUMMARY_SCHEMA);
  if (errors.length > 0) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }

  // Load entity
  const record = entityKind === 'task' ? store.getTask(entityId) : store.getBug(entityId);
  if (!record) {
    console.error(`${entityKind} not found: ${entityId}`);
    process.exit(1);
  }

  // Merge summary
  if (!record.summaries) record.summaries = {};
  record.summaries[phase] = summary;

  // Atomic write: tmp + rename
  const entityDirKey = entityKind === 'task' ? 'tasks' : 'bugs';
  const idField = entityKind === 'task' ? record.taskId : record.bugId;
  const storeRoot = store.impl.storeRoot;
  const filePath = path.join(storeRoot, entityDirKey, `${idField}.json`);
  const tmpPath = filePath + '.tmp';

  if (DRY_RUN) {
    console.log(`[dry-run] would set ${entityKind} ${entityId} summaries.${phase}`);
  } else {
    fs.writeFileSync(tmpPath, JSON.stringify(record, null, 2) + '\n', 'utf8');
    fs.renameSync(tmpPath, filePath);
  }

  console.log(JSON.stringify({ ok: true, entityKind, id: entityId, phase, dryRun: DRY_RUN }));
}

function cmdSetSummary() {
  const taskId      = args[1];
  const phase       = args[2];
  const summaryFile = args[3];

  if (!taskId || !phase || !summaryFile) {
    console.error('Usage: store-cli.cjs set-summary <taskId> <phase> <jsonFile>');
    process.exit(1);
  }

  _setSummaryOnEntity('task', taskId, phase, summaryFile);
}

function cmdSetBugSummary() {
  const bugId       = args[1];
  const phase       = args[2];
  const summaryFile = args[3];

  if (!bugId || !phase || !summaryFile) {
    console.error('Usage: store-cli.cjs set-bug-summary <bugId> <phase> <jsonFile>');
    process.exit(1);
  }

  _setSummaryOnEntity('bug', bugId, phase, summaryFile);
}

// ---------------------------------------------------------------------------
// Command dispatch
// ---------------------------------------------------------------------------

switch (command) {
  case 'write':                cmdWrite(); break;
  case 'read':                 cmdRead(); break;
  case 'list':                 cmdList(); break;
  case 'delete':               cmdDelete(); break;
  case 'update-status':        cmdUpdateStatus(); break;
  case 'emit':                 cmdEmit(); break;
  case 'merge-sidecar':        cmdMergeSidecar(); break;
  case 'purge-events':         cmdPurgeEvents(); break;
  case 'write-collation-state': cmdWriteCollationState(); break;
  case 'validate':             cmdValidate(); break;
  case 'progress':             cmdProgress(); break;
  case 'progress-clear':       cmdProgressClear(); break;
  case 'set-summary':          cmdSetSummary(); break;
  case 'set-bug-summary':      cmdSetBugSummary(); break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error('Run with --help for usage information.');
    process.exit(1);
}

} catch (err) {
  console.error(err.message);
  process.exit(1);
}

} // end if (require.main === module)