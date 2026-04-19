'use strict';

// preflight-gate.cjs — evaluates a phase's declared gates against the current
// task state, pre-spawn. Returns { ok, missing[] } so the orchestrator (or a
// manual command) can halt loudly before invoking a subagent on broken
// prerequisites.
//
// Pure function: only fs.existsSync / fs.statSync / fs.readFileSync. No writes,
// no network, no process spawns.

const fs = require('node:fs');
const path = require('node:path');
const { parseVerdict } = require('./parse-verdict.cjs');

function preflight({ phase, gates, state = {}, substitutions = {}, verdictSources = {} }) {
  const spec = gates && gates[phase];
  if (!spec) {
    return { ok: false, missing: [`no gate definition registered for phase "${phase}" (unknown phase or missing gates block)`] };
  }

  const missing = [];

  for (const art of spec.artifacts || []) {
    const resolved = applySubstitutions(art.path, substitutions);
    let exists = false;
    let size = 0;
    try {
      const st = fs.statSync(resolved);
      exists = st.isFile();
      size = st.size;
    } catch (_) {
      exists = false;
    }
    if (!exists) {
      missing.push(`artifact missing: ${resolved}`);
    } else if (size < (art.minBytes || 0)) {
      missing.push(`artifact too small (stub): ${resolved} (${size} bytes, need >= ${art.minBytes})`);
    }
  }

  for (const pred of spec.require || []) {
    if (!evalPredicate(pred, state)) {
      missing.push(`require failed: ${describePredicate(pred)} (got ${JSON.stringify(readField(pred.field, state))})`);
    }
  }

  for (const pred of spec.forbid || []) {
    if (evalPredicate(pred, state)) {
      missing.push(`forbid triggered: ${describePredicate(pred)}`);
    }
  }

  for (const after of spec.after || []) {
    const src = verdictSources[after.phase];
    if (!src) {
      missing.push(`predecessor verdict source not provided for phase "${after.phase}"`);
      continue;
    }
    let contents;
    try {
      contents = fs.readFileSync(src, 'utf8');
    } catch (err) {
      missing.push(`cannot read predecessor review for "${after.phase}" at ${src}: ${err.code || err.message}`);
      continue;
    }
    const verdict = parseVerdict(contents);
    if (verdict === null) {
      missing.push(`predecessor review for "${after.phase}" has no parseable **Verdict:** line (${src})`);
    } else if (verdict !== after.verdict) {
      missing.push(`predecessor "${after.phase}" verdict is "${verdict}", expected "${after.verdict}"`);
    }
  }

  return { ok: missing.length === 0, missing };
}

function applySubstitutions(template, subs) {
  return template.replace(/\{(\w+)\}/g, (full, key) => {
    if (Object.prototype.hasOwnProperty.call(subs, key)) return String(subs[key]);
    return full;
  });
}

function readField(dottedPath, state) {
  const parts = dottedPath.split('.');
  let cur = state;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[p];
  }
  return cur;
}

function evalPredicate(pred, state) {
  const actual = readField(pred.field, state);
  switch (pred.op) {
    case '==':
      return String(actual) === String(pred.value);
    case '!=':
      return String(actual) !== String(pred.value);
    case 'in':
      return pred.value.map(String).includes(String(actual));
    default:
      throw new Error(`preflight-gate: unknown predicate op "${pred.op}"`);
  }
}

function describePredicate(pred) {
  if (pred.op === 'in') return `${pred.field} in [${pred.value.join(', ')}]`;
  return `${pred.field} ${pred.op} ${pred.value}`;
}

module.exports = { preflight };

// CLI shim: `node preflight-gate.cjs --phase <name> --task <taskId> [--bug <bugId>]`
// exit codes: 0 ok, 1 gate(s) failed, 2 invalid args / missing definitions
if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.phase || (!args.task && !args.bug)) {
    process.stderr.write('Usage: preflight-gate.cjs --phase <phaseName> --task <taskId> [--bug <bugId>]\n');
    process.exit(2);
  }

  const { parseGates } = require('./parse-gates.cjs');
  const store = require('./store.cjs');

  const workflowMd = loadWorkflowMarkdown(args.phase);
  if (!workflowMd) {
    process.stderr.write(`preflight-gate: could not locate workflow file defining phase "${args.phase}"\n`);
    process.exit(2);
  }
  let gates;
  try {
    gates = parseGates(workflowMd);
  } catch (err) {
    process.stderr.write(`preflight-gate: ${err.message}\n`);
    process.exit(2);
  }
  if (!gates[args.phase]) {
    process.stderr.write(`preflight-gate: no gates block for phase "${args.phase}"\n`);
    process.exit(2);
  }

  const taskRecord = args.task ? safe(() => store.getTask(args.task)) : null;
  const bugRecord = args.bug ? safe(() => store.getBug(args.bug)) : null;
  const state = {};
  if (taskRecord) state.task = taskRecord;
  if (bugRecord) state.bug = bugRecord;

  // Resolve engineering root from config; path templates can reference {engineering}.
  let engineeringRoot = 'engineering';
  try {
    const cfg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '.forge/config.json'), 'utf8'));
    if (cfg.paths && cfg.paths.engineering) engineeringRoot = cfg.paths.engineering;
  } catch (_) { /* fall back to default */ }

  // {task} / {bug} in path templates refer to the artifact directory suffix
  // (e.g., "T01", "BUG-007-broken-foo"), taken from the store record's path.
  // If unavailable, fall back to the raw id.
  function lastSegment(p) {
    const parts = String(p || '').split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  }
  const taskDir = taskRecord && taskRecord.path ? lastSegment(taskRecord.path) : args.task;
  const bugDir = bugRecord && bugRecord.path ? lastSegment(bugRecord.path) : args.bug;

  const substitutions = {
    engineering: engineeringRoot,
    sprint: taskRecord ? taskRecord.sprintId : undefined,
    task: taskDir,
    bug: bugDir,
  };

  const verdictSources = resolveVerdictSources(gates[args.phase].after || [], taskRecord, bugRecord);

  const result = preflight({ phase: args.phase, gates, state, substitutions, verdictSources });
  if (result.ok) process.exit(0);
  process.stderr.write(`Gate failed for phase "${args.phase}":\n`);
  for (const m of result.missing) process.stderr.write(`  - ${m}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--phase') out.phase = argv[++i];
    else if (a === '--task') out.task = argv[++i];
    else if (a === '--bug') out.bug = argv[++i];
  }
  return out;
}

function safe(fn) {
  try { return fn(); } catch (_) { return null; }
}

function loadWorkflowMarkdown(_phaseName) {
  // Search the dogfooded/installed workflows for one containing a `## Phase: <name>` heading.
  const candidates = [
    path.resolve(process.cwd(), '.forge/workflows/meta-orchestrate.md'),
    path.resolve(process.cwd(), '.forge/workflows/meta-fix-bug.md'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const md = fs.readFileSync(c, 'utf8');
      if (new RegExp(`^##\\s+Phase:\\s+${escapeRegex(_phaseName)}\\s*$`, 'm').test(md)) {
        return md;
      }
    }
  }
  return null;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Canonical review artifact filenames per phase. Centralised here so the
// orchestrator, manual commands, and tests all agree on where a given phase's
// verdict lives.
const VERDICT_ARTIFACTS = {
  'review-plan': 'PLAN_REVIEW.md',
  'review-code': 'CODE_REVIEW.md',
  'validate':    'VALIDATION_REPORT.md',
  'approve':     'ARCHITECT_APPROVAL.md',
};

function resolveVerdictSources(afterList, taskRecord, bugRecord) {
  const sources = {};
  const base = taskRecord ? taskRecord.path : bugRecord ? bugRecord.path : null;
  if (!base) return sources;
  for (const entry of afterList) {
    const filename = VERDICT_ARTIFACTS[entry.phase];
    if (!filename) continue; // unknown predecessor phase — preflight will flag it via missing-source
    sources[entry.phase] = path.resolve(process.cwd(), base, filename);
  }
  return sources;
}
