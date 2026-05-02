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

// Canonical review artifact filenames per phase. Centralised here so the
// orchestrator, manual commands, and tests all agree on where a given phase's
// verdict lives.
const VERDICT_ARTIFACTS = {
  'review-plan': 'PLAN_REVIEW.md',
  'review-code': 'CODE_REVIEW.md',
  'validate':    'VALIDATION_REPORT.md',
  'approve':     'ARCHITECT_APPROVAL.md',
};

module.exports = { preflight };

// CLI shim: `node preflight-gate.cjs --phase <name> --task <taskId> [--bug <bugId>] [--workflow <name>]`
// exit codes: 0 ok, 1 gate(s) failed, 2 invalid args / missing definitions
// Scan the sprint directory for a subdirectory matching the task ID prefix.
// Returns the directory name (e.g. "FORGE-S12-T06-model-discovery") or null.
function resolveTaskArtifactDir(taskRecord, engineeringRoot) {
  if (!taskRecord || !taskRecord.sprintId || !taskRecord.taskId) return null;
  const sprintDir = path.resolve(process.cwd(), engineeringRoot, 'sprints', taskRecord.sprintId);
  try {
    const entries = fs.readdirSync(sprintDir);
    for (const entry of entries) {
      try {
        if (fs.statSync(path.join(sprintDir, entry)).isDirectory() &&
            entry.startsWith(taskRecord.taskId + '-')) {
          return entry;
        }
      } catch (_) { /* skip unreadable entries */ }
    }
  } catch (_) { /* sprint directory not found */ }
  return null;
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.phase || (!args.task && !args.bug)) {
    process.stderr.write('Usage: preflight-gate.cjs --phase <phaseName> --task <taskId> [--bug <bugId>]\n');
    process.exit(2);
  }

  const { parseGates } = require('./parse-gates.cjs');
  const store = require('./store.cjs');

  // Resolve store records and substitutions BEFORE calling loadWorkflowMarkdown
  // so the placeholder-key filter can use them to select the correct workflow file.
  // (Previously loadWorkflowMarkdown was called first, causing fix_bug.md to shadow
  // orchestrate_task.md for phases shared between the two workflows — forge#72.)
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
  // (e.g., "FORGE-S12-T06-model-discovery", "BUG-007-broken-foo").
  // task.path is the primary source file in forge/, NOT the artifact directory.
  // Scan the sprint directory to find the correct artifact directory name.
  function lastSegment(p) {
    const parts = String(p || '').split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  }
  const taskArtifactDir = resolveTaskArtifactDir(taskRecord, engineeringRoot);
  const taskDir = taskArtifactDir
    || (taskRecord && taskRecord.path ? lastSegment(taskRecord.path) : args.task);
  const bugDir = bugRecord && bugRecord.path ? lastSegment(bugRecord.path) : args.bug;

  // Compute the full artifact directory path for verdict source resolution.
  let taskArtifactPath = null;
  if (taskArtifactDir && taskRecord && taskRecord.sprintId) {
    taskArtifactPath = path.join(engineeringRoot, 'sprints', taskRecord.sprintId, taskArtifactDir);
  } else if (taskRecord && taskRecord.path) {
    taskArtifactPath = taskRecord.path;
  }

  const substitutions = {
    engineering: engineeringRoot,
    sprint: taskRecord ? taskRecord.sprintId : undefined,
    task: taskDir,
    bug: bugDir,
  };

  // Now load the workflow, passing substitutions so the placeholder-key filter
  // can skip workflows whose gate block references keys not present in subs.
  const workflowMd = loadWorkflowMarkdown(args.phase, args.workflow, substitutions);
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

  const verdictSources = resolveVerdictSources(gates[args.phase].after || [], taskArtifactPath, bugRecord);

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
    else if (a === '--workflow') out.workflow = argv[++i];
  }
  return out;
}

function safe(fn) {
  try { return fn(); } catch (_) { return null; }
}

// Extract the gate block body for a given phase from a workflow markdown string.
// Returns the text between the opening and closing fence for that phase, or null.
function extractGateBlockBody(md, phaseName) {
  const openPattern = new RegExp('^```gates\\s+phase=' + escapeRegex(phaseName) + '\\s*$', 'm');
  const openMatch = openPattern.exec(md);
  if (!openMatch) return null;
  const afterOpen = md.slice(openMatch.index + openMatch[0].length);
  const closeIdx = afterOpen.indexOf('\n```');
  if (closeIdx === -1) return afterOpen; // unterminated fence — return what we have
  return afterOpen.slice(0, closeIdx);
}

// Check whether all {placeholder} keys in a gate block body are satisfied by
// the given substitutions map. Returns true if all placeholders are satisfied
// (or there are none), false if any placeholder key is missing from subs.
function gatePlaceholdersSatisfied(gateBody, subs) {
  const tokenRe = /\{(\w+)\}/g;
  let match;
  while ((match = tokenRe.exec(gateBody)) !== null) {
    const key = match[1];
    if (!Object.prototype.hasOwnProperty.call(subs, key) || subs[key] === undefined) {
      return false;
    }
  }
  return true;
}

function loadWorkflowMarkdown(phaseName, workflowName, substitutions) {
  const workflowsDir = path.resolve(process.cwd(), '.forge/workflows');
  let entries;
  try {
    entries = fs.readdirSync(workflowsDir).filter((f) => f.endsWith('.md'));
  } catch (_) {
    return null;
  }
  const fencePattern = new RegExp('^```gates\\s+phase=' + escapeRegex(phaseName) + '\\s*$', 'm');

  // If a specific workflow file was requested, try it first before scanning all files.
  // This prevents alphabetically-earlier files from shadowing the caller's workflow.
  if (workflowName) {
    const normalised = workflowName.endsWith('.md') ? workflowName : workflowName + '.md';
    if (entries.includes(normalised)) {
      const md = fs.readFileSync(path.join(workflowsDir, normalised), 'utf8');
      if (fencePattern.test(md)) return md;
    }
  }

  // Placeholder-key filter: when substitutions are provided, skip any workflow
  // whose gate block for this phase references a {key} not present in subs.
  // This prevents fix_bug.md (which uses {bug}) from shadowing orchestrate_task.md
  // (which uses {task}) when only --task is supplied and --bug is absent.
  // Fall-back: if NO workflow passes the filter, return the first match regardless
  // (preserves existing behaviour for malformed/unknown invocations).
  const subs = substitutions || {};
  const hasSubstitutions = Object.keys(subs).some(k => subs[k] !== undefined);

  let firstMatch = null; // fallback candidate
  for (const entry of entries) {
    const md = fs.readFileSync(path.join(workflowsDir, entry), 'utf8');
    if (!fencePattern.test(md)) continue;

    if (firstMatch === null) firstMatch = md; // remember first match for fallback

    if (!hasSubstitutions) {
      // No substitutions provided — use original first-match behaviour
      return md;
    }

    const gateBody = extractGateBlockBody(md, phaseName);
    if (gateBody !== null && gatePlaceholdersSatisfied(gateBody, subs)) {
      return md;
    }
    // Placeholder(s) unsatisfied — log at warn level and continue scanning
    process.stderr.write(
      `preflight-gate: skipping ${entry} for phase "${phaseName}" — gate block contains ` +
      `placeholder key(s) not present in supplied substitutions\n`
    );
  }

  // Fallback: no workflow passed the placeholder filter — return first match to
  // avoid total breakage for malformed invocations (preserves existing behaviour)
  if (firstMatch !== null) {
    process.stderr.write(
      `preflight-gate: placeholder filter matched no workflow for phase "${phaseName}" — ` +
      `falling back to first match\n`
    );
    return firstMatch;
  }
  return null;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveVerdictSources(afterList, taskArtifactPath, bugRecord) {
  const sources = {};
  const base = taskArtifactPath || (bugRecord ? bugRecord.path : null);
  if (!base) return sources;
  for (const entry of afterList) {
    const filename = VERDICT_ARTIFACTS[entry.phase];
    if (!filename) continue; // unknown predecessor phase — preflight will flag it via missing-source
    sources[entry.phase] = path.resolve(process.cwd(), base, filename);
  }
  return sources;
}
