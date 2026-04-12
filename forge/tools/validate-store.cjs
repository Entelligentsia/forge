#!/usr/bin/env node
'use strict';

// Forge tool: validate-store
// Check store integrity: required fields, types, enums, and referential integrity.
// Usage: validate-store [--dry-run] [--fix]

process.on('uncaughtException', (error) => {
  console.error('Fatal validate-store error:', error);
  process.exit(1);
});

const store = require('./store.cjs');

const DRY_RUN = process.argv.includes('--dry-run');
const FIX_MODE = process.argv.includes('--fix') && !DRY_RUN;

// Embedded JSON schemas — validate-store.cjs is self-contained and does not
// read from .forge/schemas/. These definitions are sourced from
// forge/meta/store-schema/*.md and are the canonical machine-readable specs.
const SCHEMAS = {
  sprint: {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "forge/sprint.schema.json",
    "title": "Sprint",
    "type": "object",
    "required": ["sprintId", "title", "status", "taskIds", "createdAt"],
    "properties": {
      "sprintId":       { "type": "string" },
      "title":          { "type": "string" },
      "description":    { "type": "string" },
      "status": {
        "type": "string",
        "enum": ["planning", "active", "completed", "retrospective-done", "blocked", "partially-completed", "abandoned"]
      },
      "goal":           { "type": "string" },
      "taskIds":        { "type": "array", "items": { "type": "string" } },
      "dependencies":   { "type": "object" },
      "executionMode":  { "type": "string", "enum": ["sequential", "wave-parallel", "full-parallel"] },
      "createdAt":      { "type": "string", "format": "date-time" },
      "completedAt":    { "type": "string", "format": "date-time" },
      "humanEstimates": { "type": "object" },
      "feature_id":     { "type": ["string", "null"] },
      "features":       { "type": "array", "items": { "type": "string" } }
    },
    "additionalProperties": false
  },
  task: {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "forge/task.schema.json",
    "title": "Task",
    "type": "object",
    "required": ["taskId", "sprintId", "title", "status", "path"],
    "properties": {
      "taskId":               { "type": "string" },
      "sprintId":             { "type": "string" },
      "title":                { "type": "string" },
      "description":          { "type": "string" },
      "status": {
        "type": "string",
        "enum": [
          "draft", "planned", "plan-approved", "implementing",
          "implemented", "review-approved", "approved", "committed",
          "plan-revision-required", "code-revision-required", "blocked", "escalated", "abandoned"
        ]
      },
      "path":                 { "type": "string" },
      "estimate":             { "type": "string", "enum": ["S", "M", "L", "XL"] },
      "dependencies":         { "type": "array", "items": { "type": "string" } },
      "knowledgeUpdates":     { "type": "array" },
      "planIterations":       { "type": "integer", "minimum": 0 },
      "codeReviewIterations": { "type": "integer", "minimum": 0 },
      "assignedModel":        { "type": "string" },
      "pipeline":             { "type": "string" },
      "feature_id":           { "type": ["string", "null"] }
    },
    "additionalProperties": false
  },
  bug: {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "forge/bug.schema.json",
    "title": "Bug",
    "type": "object",
    "required": ["bugId", "title", "severity", "status", "path", "reportedAt"],
    "properties": {
      "bugId":                { "type": "string" },
      "title":                { "type": "string" },
      "description":          { "type": "string" },
      "severity":             { "type": "string", "enum": ["critical", "major", "minor"] },
      "status":               { "type": "string", "enum": ["reported", "triaged", "in-progress", "fixed", "verified"] },
      "path":                 { "type": "string" },
      "rootCauseCategory": {
        "type": "string",
        "enum": ["validation", "auth", "business-rule", "data-integrity", "race-condition", "integration", "configuration", "regression"]
      },
      "similarBugs":          { "type": "array", "items": { "type": "string" } },
      "checklistItemAdded":   { "type": "boolean" },
      "businessRuleUpdated":  { "type": "boolean" },
      "reportedAt":           { "type": "string", "format": "date-time" },
      "resolvedAt":           { "type": "string", "format": "date-time" }
    },
    "additionalProperties": false
  },
  event: {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "forge/event.schema.json",
    "title": "Event",
    "type": "object",
    "required": [
      "eventId", "taskId", "sprintId", "role", "action",
      "phase", "iteration", "startTimestamp", "endTimestamp", "durationMinutes", "model"
    ],
    "properties": {
      "eventId":         { "type": "string" },
      "taskId":          { "type": "string" },
      "sprintId":        { "type": "string" },
      "role":            { "type": "string" },
      "action":          { "type": "string" },
      "phase":           { "type": "string" },
      "iteration":       { "type": "integer", "minimum": 1 },
      "startTimestamp":  { "type": "string", "format": "date-time" },
      "endTimestamp":    { "type": "string", "format": "date-time" },
      "durationMinutes": { "type": "number", "minimum": 0 },
      "model":           { "type": "string" },
      "verdict":            { "type": "string" },
      "notes":              { "type": "string" },
      "inputTokens":        { "type": "integer", "minimum": 0 },
      "outputTokens":       { "type": "integer", "minimum": 0 },
      "cacheReadTokens":    { "type": "integer", "minimum": 0 },
      "cacheWriteTokens":   { "type": "integer", "minimum": 0 },
      "estimatedCostUSD":   { "type": "number",  "minimum": 0 },
      "tokenSource":        { "type": "string",  "enum": ["reported", "estimated"] }
    },
    "additionalProperties": false
  },
  feature: {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "forge/feature.schema.json",
    "title": "Feature",
    "type": "object",
    "required": ["id", "title", "status", "created_at"],
    "properties": {
      "id":           { "type": "string" },
      "title":        { "type": "string" },
      "description":  { "type": "string" },
      "status": {
        "type": "string",
        "enum": ["draft", "active", "shipped", "retired"]
      },
      "requirements": { "type": "array", "items": { "type": "string" } },
      "sprints":      { "type": "array", "items": { "type": "string" } },
      "tasks":        { "type": "array", "items": { "type": "string" } },
      "created_at":   { "type": "string", "format": "date-time" },
      "updated_at":   { "type": "string", "format": "date-time" }
    },
    "additionalProperties": false
  }
};

// Fields that are legitimately null:
//   sprintId / taskId  — optional FK (e.g. standalone bug fix has no sprint)
//   endTimestamp / durationMinutes — not recorded on "start" events (phase opened but never closed)
const NULLABLE_FK = new Set(['sprintId', 'taskId', 'endTimestamp', 'durationMinutes']);

// --- Validation ---
function validateRecord(record, schema) {
  const errors = [];
  const required = schema.required || [];

  for (const field of required) {
    if (record[field] === undefined || record[field] === '') {
      errors.push(`missing required field: "${field}"`);
    } else if (record[field] === null && !NULLABLE_FK.has(field)) {
      errors.push(`missing required field: "${field}"`);
    }
  }

  for (const [field, def] of Object.entries(schema.properties || {})) {
    const val = record[field];
    if (val === undefined) continue;
    if (val === null) continue;

    if (def.type) {
      const typeMatches = (expected, actualVal) => {
        return expected === 'integer' ? Number.isInteger(actualVal)
             : expected === 'number'  ? typeof actualVal === 'number'
             : expected === 'array'   ? Array.isArray(actualVal)
             : typeof actualVal === expected;
      };
      const ok = Array.isArray(def.type)
        ? def.type.some(t => typeMatches(t, val))
        : typeMatches(def.type, val);
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

let errorsCount = 0;
let fixesCount = 0;

function err(id, msg) {
  console.error(`ERROR  ${id}: ${msg}`);
  errorsCount++;
}

// --- Backfill defaults for --fix mode ---
const BACKFILL = {
  sprint: {
    createdAt: (rec) => rec.completedAt || rec.startDate || rec.endDate || new Date().toISOString(),
  },
  bug: {
    reportedAt: (rec) => rec.resolvedAt || new Date().toISOString(),
  },
  event: {
    eventId:         (_rec, id) => id,
    role:            (rec)        => rec.agent || 'unknown',
    action:          (rec)        => rec.phase  || 'unknown',
    phase:           (rec)        => rec.action || 'unknown',
    iteration:       ()           => 1,
    startTimestamp:  (rec)        => rec.timestamp || new Date().toISOString(),
    endTimestamp:    (rec)        => rec.timestamp || null,
    durationMinutes: ()           => null,
    model: (rec) => {
      if (rec.actor && typeof rec.actor === 'string' && rec.actor.includes('claude')) return rec.actor;
      return 'unknown';
    },
  },
};

function backfillRecord(id, rec, type) {
  const rules = BACKFILL[type];
  if (!rules) return false;
  let changed = false;
  for (const [field, derive] of Object.entries(rules)) {
    if (rec[field] === undefined || rec[field] === null || rec[field] === '') {
      const val = derive(rec, id);
      rec[field] = val;
      console.log(`FIXED  ${id}: backfilled "${field}" = "${val}"`);
      changed = true;
      fixesCount++;
    }
  }
  if (changed) {
    // Facade write uses the logic in FSImpl to maintain formatting
    if (type === 'sprint') store.writeSprint(rec);
    else if (type === 'task') store.writeTask(rec);
    else if (type === 'bug') store.writeBug(rec);
    else if (type === 'feature') store.writeFeature(rec);
    // Events are slightly different as they need sprintId
    else if (type === 'event') {
      // We'll handle event writing in the loop where sprintId is known
    }
  }
  return changed;
}

// Load all records up-front for referential integrity checks
const sprintIds = new Set();
const taskIds   = new Set();
const bugIds    = new Set();
const featureIds = new Set();

// --- Pass 1: validate structure, collect IDs ---
const sprints = store.listSprints();
for (const rec of sprints) {
  if (!rec) continue;
  if (FIX_MODE) backfillRecord(rec.sprintId, rec, 'sprint');
  if (rec.sprintId) sprintIds.add(rec.sprintId);
  for (const e of validateRecord(rec, SCHEMAS.sprint)) err(rec.sprintId, e);
}

const tasks = store.listTasks();
for (const rec of tasks) {
  if (!rec) continue;
  if (rec.taskId) taskIds.add(rec.taskId);
  for (const e of validateRecord(rec, SCHEMAS.task)) err(rec.taskId, e);
}

const bugs = store.listBugs();
for (const rec of bugs) {
  if (!rec) continue;
  if (FIX_MODE) backfillRecord(rec.bugId, rec, 'bug');
  if (rec.bugId) bugIds.add(rec.bugId);
  for (const e of validateRecord(rec, SCHEMAS.bug)) err(rec.bugId, e);
}

const features = store.listFeatures();
for (const rec of features) {
  if (!rec) continue;
  const featureId = rec.id || 'unknown';
  featureIds.add(featureId);
}

// --- Pass 2: referential integrity ---
for (const rec of sprints) {
  if (!rec) continue;
  if (rec.feature_id && !featureIds.has(rec.feature_id)) {
    if (FIX_MODE) {
      rec.feature_id = null;
      store.writeSprint(rec);
      console.log(`FIXED  ${rec.sprintId}: nullified orphaned feature_id`);
      fixesCount++;
    } else {
      err(rec.sprintId, `feature_id "${rec.feature_id}" references unknown feature`);
    }
  }
}

for (const rec of tasks) {
  if (!rec) continue;
  if (rec.sprintId && !sprintIds.has(rec.sprintId))
    err(rec.taskId, `sprintId "${rec.sprintId}" references unknown sprint`);

  if (rec.feature_id && !featureIds.has(rec.feature_id)) {
    if (FIX_MODE) {
      rec.feature_id = null;
      store.writeTask(rec);
      console.log(`FIXED  ${rec.taskId}: nullified orphaned feature_id`);
      fixesCount++;
    } else {
      err(rec.taskId, `feature_id "${rec.feature_id}" references unknown feature`);
    }
  }
}

for (const rec of bugs) {
  if (!rec) continue;
  for (const ref of (rec.similarBugs || [])) {
    if (!bugIds.has(ref)) err(rec.bugId, `similarBugs references unknown bug "${ref}"`);
  }
}

// --- Events ---
const allSprints = store.listSprints();
for (const sprint of allSprints) {
  if (!sprint) continue;
  const sprintId = sprint.sprintId;
  const events = store.listEvents(sprintId);
  for (const rec of events) {
    if (!rec) continue;

    // Since eventId is the filename, and the facade doesn't expose filename directly in listEvents,
    // we use the eventId property which is required by schema.
    const eventId = rec.eventId;

    if (FIX_MODE) {
      const rules = BACKFILL.event;
      let changed = false;
      for (const [field, derive] of Object.entries(rules)) {
        if (rec[field] === undefined || rec[field] === null || rec[field] === '') {
          const val = derive(rec, eventId);
          rec[field] = val;
          console.log(`FIXED  ${sprintId}/${eventId}: backfilled "${field}" = "${val}"`);
          changed = true;
          fixesCount++;
        }
      }
      if (changed) store.writeEvent(sprintId, rec);
    }

    for (const e of validateRecord(rec, SCHEMAS.event)) err(`${sprintId}/${eventId}`, e);
    if (rec.taskId && !taskIds.has(rec.taskId) && !bugIds.has(rec.taskId))
      err(`${sprintId}/${eventId}`, `taskId "${rec.taskId}" references unknown task or bug`);
    if (rec.sprintId && !sprintIds.has(rec.sprintId) && rec.sprintId !== sprintId)
      err(`${sprintId}/${eventId}`, `sprintId "${rec.sprintId}" references unknown sprint`);
  }
}

// --- Result ---
if (fixesCount > 0) {
  console.log(`${fixesCount} field(s) backfilled.`);
}
if (errorsCount === 0) {
  console.log(`Store validation passed (${sprintIds.size} sprint(s), ${taskIds.size} task(s), ${bugIds.size} bug(s)).`);
  process.exit(0);
} else {
  console.error(`\n${errorsCount} error(s) found.`);
  process.exit(1);
}
