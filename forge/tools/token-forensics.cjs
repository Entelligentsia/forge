'use strict';

// token-forensics.cjs — reusable through-model token accounting for model
// session transcripts, deduplicated by `message.id`.
//
// Why this exists (FORGE-S27-T06): orchestrator-cost claims are only correct
// when through-model tokens are deduplicated by `message.id`. Naive per-log-line
// sums double-count, because the same assistant message is re-emitted across
// streaming / replay / cache events. Summing every line inflates the figure.
// The fix is to key token accounting on the stable message id and count each
// distinct message exactly once. This module makes that correct by construction.
//
// "Through-model" is defined cache-tier-agnostically: the tokens the model
// actually processed = input + output + cache_read + cache_write for each
// deduped message. The per-tier breakdown is also reported so callers can
// compute alternative definitions.
//
// Input contract: a JSON-lines transcript. One JSON object per line. A line is
// an assistant turn iff it carries a stable message id (`message.id` or
// top-level `id`) AND a usage block. Usage fields are accepted in both
// snake_case (Anthropic API) and camelCase (Forge sidecar) spellings. Lines
// without a recognizable id+usage pair are ignored, so non-assistant log lines
// pass through harmlessly.
//
// Node.js built-ins only. No third-party dependencies.

const fs = require('node:fs');

/**
 * Normalize a usage block from either snake_case (Anthropic API) or camelCase
 * (Forge sidecar) into a canonical { input, output, cacheRead, cacheWrite, through }.
 * Returns null when no usage is present.
 */
function normalizeUsage(usage) {
  if (!usage || typeof usage !== 'object') return null;
  const pick = (...keys) => {
    for (const k of keys) {
      const v = usage[k];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
    }
    return undefined;
  };
  const input = pick('input_tokens', 'inputTokens');
  const output = pick('output_tokens', 'outputTokens');
  const cacheRead = pick('cache_read_input_tokens', 'cacheReadTokens', 'cache_read_tokens');
  const cacheWrite = pick('cache_creation_input_tokens', 'cacheWriteTokens', 'cache_creation_tokens');
  // No recognizable token field at all → treat as "no usage".
  if (input === undefined && output === undefined && cacheRead === undefined && cacheWrite === undefined) {
    return null;
  }
  const i = input || 0;
  const o = output || 0;
  const cr = cacheRead || 0;
  const cw = cacheWrite || 0;
  return { input: i, output: o, cacheRead: cr, cacheWrite: cw, through: i + o + cr + cw };
}

/**
 * Extract the stable message id from a transcript line object.
 * Supports `{ message: { id } }` (Anthropic) and top-level `{ id }` (sidecar).
 */
function extractId(obj) {
  if (obj && obj.message && typeof obj.message.id === 'string') return obj.message.id;
  if (obj && typeof obj.id === 'string') return obj.id;
  return null;
}

/** Extract the usage block from either `{ message: { usage } }` or `{ usage }`. */
function extractUsage(obj) {
  if (obj && obj.message && obj.message.usage) return obj.message.usage;
  if (obj && obj.usage) return obj.usage;
  return null;
}

/**
 * Extract the actor/agent attribution from a transcript line.
 * Returns { kind: 'orchestrator'|'subagent'|'unattributed', agent: string|null }.
 *
 * A subagent is identified by an agent marker (the Forge agent-naming
 * convention `{taskId}:{persona}:{role}:{iter}`) carried in `agent` /
 * `subagentName` / `subagent`. An explicit `actor: "orchestrator"` (or
 * `role: "orchestrator"`) marks the orchestrator loop. Anything else with no
 * marker is unattributed.
 */
function extractActor(obj) {
  const agent = obj && (obj.agent || obj.subagentName || obj.subagent);
  if (typeof agent === 'string' && agent.length > 0) {
    return { kind: 'subagent', agent };
  }
  const actor = obj && (obj.actor || obj.role);
  if (actor === 'orchestrator' || actor === 'orchestrate') {
    return { kind: 'orchestrator', agent: null };
  }
  return { kind: 'unattributed', agent: null };
}

/**
 * Parse a JSON-lines transcript string into normalized assistant records.
 * Each record: { id, usage (normalized), actor: {kind, agent} }.
 * Lines that are not assistant turns (no id+usage) or are malformed are dropped.
 */
function parseTranscript(text) {
  const records = [];
  if (typeof text !== 'string') return records;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue; // malformed line — ignore, do not throw
    }
    const id = extractId(obj);
    const usage = normalizeUsage(extractUsage(obj));
    if (!id || !usage) continue; // not an assistant turn with accountable usage
    records.push({ id, usage, actor: extractActor(obj) });
  }
  return records;
}

function zeroBucket() {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, through: 0 };
}

function addInto(bucket, usage) {
  bucket.input += usage.input;
  bucket.output += usage.output;
  bucket.cacheRead += usage.cacheRead;
  bucket.cacheWrite += usage.cacheWrite;
  bucket.through += usage.through;
}

/**
 * Analyze normalized records: dedup by message id, sum through-model tokens,
 * and split orchestrator vs per-phase-subagent attribution.
 *
 * Dedup rule: on a colliding message id, keep the record with the most complete
 * usage (largest output_tokens), breaking ties by latest occurrence. This
 * prevents a partial streaming chunk from clobbering the final usage block.
 *
 * @param {Array<{id,usage,actor}>} records
 * @returns {object} report
 */
function analyzeTranscript(records) {
  const arr = Array.isArray(records) ? records : [];
  const naiveTotal = arr.reduce((s, r) => s + r.usage.through, 0);

  // Dedup by id, keeping the most-complete usage (largest output, then latest).
  const byId = new Map();
  let droppedDuplicates = 0;
  for (const rec of arr) {
    const existing = byId.get(rec.id);
    if (!existing) {
      byId.set(rec.id, rec);
    } else {
      droppedDuplicates += 1;
      // tie-break: larger output wins; equal output → latest (this rec) wins.
      if (rec.usage.output >= existing.usage.output) {
        byId.set(rec.id, rec);
      }
    }
  }

  const throughModel = zeroBucket();
  const orchestrator = zeroBucket();
  const subagentsTotal = zeroBucket();
  const unattributed = zeroBucket();
  const byAgent = {};
  let sawAttribution = false;

  for (const rec of byId.values()) {
    addInto(throughModel, rec.usage);
    if (rec.actor.kind === 'subagent') {
      sawAttribution = true;
      addInto(subagentsTotal, rec.usage);
      const key = rec.actor.agent;
      if (!byAgent[key]) byAgent[key] = zeroBucket();
      addInto(byAgent[key], rec.usage);
    } else if (rec.actor.kind === 'orchestrator') {
      sawAttribution = true;
      addInto(orchestrator, rec.usage);
    } else {
      addInto(unattributed, rec.usage);
    }
  }

  // Expose the through-model grand total under `.total` (alias of `.through`)
  // so callers can read `report.throughModel.total` as the headline figure.
  throughModel.total = throughModel.through;

  return {
    throughModel,
    naiveTotal,
    deduped: {
      messageCount: byId.size,
      droppedDuplicates,
    },
    attributionAvailable: sawAttribution,
    byActor: {
      orchestrator,
      subagents: { total: subagentsTotal, byAgent },
      unattributed,
    },
  };
}

/** Convenience: analyze a transcript file by path. */
function analyzeFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return analyzeTranscript(parseTranscript(text));
}

module.exports = {
  normalizeUsage,
  extractId,
  extractUsage,
  extractActor,
  parseTranscript,
  analyzeTranscript,
  analyzeFile,
};

// CLI shim: `node token-forensics.cjs <transcript.jsonl>`
// stdout: pretty-printed JSON report. stderr: one-line human summary.
// exit 0 on success, exit 2 on bad args / unreadable file.
if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    process.stderr.write('Usage: token-forensics.cjs <transcript.jsonl>\n');
    process.exit(2);
  }
  let report;
  try {
    report = analyzeFile(file);
  } catch (err) {
    process.stderr.write(`token-forensics: cannot read transcript: ${err.message}\n`);
    process.exit(2);
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  const tm = report.throughModel.total;
  const attr = report.attributionAvailable
    ? `orchestrator=${report.byActor.orchestrator.through} subagents=${report.byActor.subagents.total.through}`
    : `unattributed=${report.byActor.unattributed.through}`;
  process.stderr.write(
    `through-model=${tm} (deduped ${report.deduped.messageCount} msgs, ` +
    `dropped ${report.deduped.droppedDuplicates} dups; naive=${report.naiveTotal}) ${attr}\n`,
  );
  process.exit(0);
}
