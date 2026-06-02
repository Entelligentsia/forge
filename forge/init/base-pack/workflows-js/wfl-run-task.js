export const meta = {
  name: 'wfl:run-task',
  description: 'Code-orchestrated port of /forge:run-task — resolve the task pipeline, drive each phase (plan→review→implement→review→validate→approve→commit) through a subagent on its ROLE_TIER model (review/validate/approve→opus, plan/implement→sonnet, commit→haiku), hold the revision loop + verdict routing + escalation in JS.',
  whenToUse: 'Run a single Forge task through its full plan→implement→review→approve→commit pipeline via a deterministic JS driver instead of the LLM orchestrator. Pass the task id as args, e.g. args: "FORGE-S27-T01".',
  phases: [
    { title: 'Resolve', detail: 'one agent reads the task manifest + config, returns the resolved pipeline phases and pre-task status' },
    { title: 'Pipeline', detail: 'per phase: one subagent runs the gate + phase workflow + emits its own event; JS owns the phase index, revision counters, verdict routing, and escalation decision' },
    { title: 'Report', detail: 'summarise the terminal outcome — committed / escalated / blocked' },
  ],
}

// ---------------------------------------------------------------------------
// wfl:run-task — a code-orchestrated port of .forge/workflows/orchestrate_task.md
//
// Why a script: orchestrate_task.md is a deterministic phase FSM — a linear
// pipeline with review→revision back-edges, per-phase iteration caps, declarative
// pre-flight gates, and escalate-don't-continue on any failure. In the LLM
// orchestrator that loop is hand-run turn-by-turn. Here the JS holds the phase
// index, the revision counters, the verdict routing, and the escalation decision;
// subagents only run a single phase's workflow and write artifacts/events to disk.
//
// HOW THIS DIFFERS FROM wfl:run-sprint:
//   wfl:run-sprint ported the OUTER wave-sort FSM but delegated each whole task
//   to ONE orchestrate_task agent — it never decomposed the per-phase loop.
//   wfl:run-task decomposes that loop: one subagent PER PHASE. That is the only
//   version with a reason to exist (a single orchestrate_task agent == the
//   existing /forge:run-task, and adds nothing).
//
// SIDE-EFFECT OWNERSHIP — READ BEFORE EDITING:
//   The vanished orchestrate_task agent used to do a stack of shell-dependent
//   jobs for free. This script has NO filesystem/shell access, so each per-phase
//   subagent now owns them: preflight-gate, the phase workflow (which writes its
//   own artifacts + {PHASE}-SUMMARY.json + status), read-verdict (review phases),
//   token sidecar, friction drain, AND its own canonical phase event.
//
//   *** DELIBERATE DEVIATION from orchestrate_task.md's "the orchestrator is the
//   sole actor that calls store-cli emit" rule: here each phase subagent emits
//   its OWN phase event. This is defensible — the subagent is the only actor that
//   holds its own runtime attribution (model, provider, token usage). The JS
//   driver cannot run store-cli. This is a control-flow-authoritative port with
//   delegated telemetry, NOT a byte-for-byte reproduction of the emit contract. ***
//
//   Honest fallback if per-phase emission ever proves too lossy: collapse to the
//   thin port (one agent reading orchestrate_task.md, == wfl:run-sprint.dispatchTask),
//   which inherits every side-effect for free. Do NOT ship a silently-lossy deep port.
//
// MODEL TIERING: each phase is dispatched on the model tier orchestrate_task.md
// § Role-to-Tier Mapping prescribes (review/validate/approve → opus, plan/implement
// → sonnet, commit/writeback → haiku). The Workflow agent() hook takes the tier
// NAME ('opus'|'sonnet'|'haiku') and the host (Claude Code) resolves it to the
// configured model for that tier — the same tier-name dispatch the LLM orchestrator
// does for a tiered cluster. NOTE this means phases are hard-tiered regardless of
// cluster: in a single-model setup the host still maps the tier name to whatever
// that tier resolves to, so plan/commit will NOT inherit the session model.
//
// Invocation (Workflow tool):  { name: 'wfl:run-task', args: 'FORGE-S27-T01' }
// args may also be an object: { taskId: 'FORGE-S27-T01' }
// ---------------------------------------------------------------------------

// Task statuses that mean "do not run any phase" — orchestrate_task pre-task guard.
const SKIP_STATUS = ['blocked', 'escalated', 'committed', 'abandoned']
// Phase roles whose artifact carries a **Verdict:** that routes the FSM.
// NOTE: `approve` is NOT here — orchestrate_task advances it on completion like a
// non-review phase (the approve workflow self-escalates if it rejects).
const REVIEW_ROLES = ['review-plan', 'review-code', 'validate']
// Per-phase model tier — verbatim port of orchestrate_task.md § Role-to-Tier Mapping.
// Passed as the `model` opt to agent(); the host resolves the tier name to a model.
const ROLE_TIER = {
  'plan':        'sonnet',
  'implement':   'sonnet',
  'review-plan': 'opus',
  'review-code': 'opus',
  'validate':    'opus',
  'approve':     'opus',
  'commit':      'haiku',
  'writeback':   'haiku',
}
const tierFor = (role) => ROLE_TIER[role] || 'sonnet'   // orchestrate_task's ROLE_TIER.get(role, "sonnet")

const RESOLVE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['taskId', 'sprintId', 'taskStatus', 'phases'],
  properties: {
    taskId: { type: 'string' },
    sprintId: { type: 'string' },
    taskStatus: { type: 'string' },         // status read from .forge/store/tasks/{id}.json
    phases: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['command', 'role', 'workflow', 'maxIterations'],
        properties: {
          command: { type: 'string' },       // slash-command name, e.g. "review-plan"
          role: { type: 'string' },           // semantic role, e.g. "review-plan"
          workflow: { type: 'string' },       // workflow file under .forge/workflows/, e.g. "review_plan.md"
          maxIterations: { type: 'integer' }, // revision cap for review roles (default 3)
        },
      },
    },
  },
}

const PHASE_RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['phase', 'role', 'gatePassed', 'verdict', 'escalated', 'taskStatus'],
  properties: {
    phase: { type: 'string' },                                  // the command name dispatched
    role: { type: 'string' },
    gatePassed: { type: 'boolean' },                            // preflight-gate.cjs exit 0
    verdict: { type: 'string', enum: ['approved', 'revision', 'malformed', 'none'] }, // 'none' for non-review phases
    escalated: { type: 'boolean' },                             // subagent set status=escalated (gate fail / malformed / self-escalation)
    taskStatus: { type: 'string' },                             // status read back after the phase
    note: { type: 'string' },
  },
}

// --- nearest preceding non-review phase (revision target) -------------------
// Port of orchestrate_task.md: a "Revision Required" verdict routes back to the
// nearest earlier phase whose role is NOT a review role (i.e. the producer).
function revisionTarget(phases, reviewIdx) {
  for (let j = reviewIdx - 1; j >= 0; j--) {
    if (!REVIEW_ROLES.includes(phases[j].role)) return j
  }
  return 0   // degenerate pipeline with no producer before the review — loop to start
}

// --- dispatch one phase as a subagent ---------------------------------------
// The subagent owns ALL shell-dependent side-effects for this phase (see header).
function runPhase(taskId, sprintId, phase, iteration) {
  return agent(
    [
      `You are running a SINGLE pipeline phase for Forge task ${taskId} (sprint ${sprintId}).`,
      `Phase: role="${phase.role}", command="${phase.command}", workflow="${phase.workflow}", iteration=${iteration}.`,
      `Resolve FORGE_ROOT from .forge/config.json paths.forgeRoot first.`,
      '',
      '1. PRE-FLIGHT GATE. Run `node "$FORGE_ROOT/tools/preflight-gate.cjs" --phase ' + phase.role + ' --task ' + taskId + '`.',
      '   If it exits non-zero: do NOT run the phase. Set status via',
      '   `store-cli.cjs update-status task ' + taskId + ' status escalated`, emit an escalation event,',
      '   and return gatePassed=false, escalated=true, verdict="none", with the gate stderr in note.',
      '',
      '2. RUN THE PHASE. Read `.forge/workflows/' + phase.workflow + '` and follow it for task ' + taskId + '.',
      '   The workflow writes its own artifacts, {PHASE}-SUMMARY.json, and any task-status changes.',
      '   Also read the task-scoped slice of `engineering/MASTER_INDEX.md` for project context.',
      '',
      '3. EMIT YOUR PHASE EVENT. You are the only actor that knows your runtime attribution, so YOU emit it.',
      '   Compose an eventId of the form `{ISO_TIMESTAMP}_' + taskId + '_' + phase.role + '_complete` and emit a',
      '   canonical event via `node "$FORGE_ROOT/tools/store-cli.cjs" emit ' + sprintId + " '{event-json}'\`",
      '   conforming to `.forge/schemas/event.schema.json` (role, action="complete", phase, iteration=' + iteration + ',',
      '   plus your own model/provider/token usage — do NOT invent placeholder model strings).',
      '   If `/cost` data is available, also write the token sidecar via the `--sidecar` form. Best-effort; skip silently if unavailable.',
      '   Then drain any `.forge/cache/FRICTION-*.jsonl` friction records you produced and emit them as type "friction".',
      '',
      phase.role && REVIEW_ROLES.includes(phase.role)
        ? '4. READ VERDICT. This is a REVIEW phase. The phase workflow records its verdict into the store '
          + 'summary (`summaries.' + phase.role + '.verdict`) via set-summary — make sure that write happened. '
          + 'Then resolve it with the canonical tool `node "$FORGE_ROOT/tools/read-verdict.cjs" --phase ' + phase.role + ' --task ' + taskId + '` '
          + '(reads the structured summary, NOT a markdown artifact path). '
          + 'Map exit code → verdict="approved" (exit 0), "revision" (exit 1), "malformed" (exit 2 = missing/unreadable). NEVER guess.'
        : '4. NON-REVIEW phase: return verdict="none".',
      '',
      '5. Read `.forge/store/tasks/' + taskId + '.json` and return its final status as taskStatus, plus a one-line note.',
    ].join('\n'),
    { label: `${taskId}:${phase.role}:${iteration}`, phase: 'Pipeline', schema: PHASE_RESULT_SCHEMA, model: tierFor(phase.role) }
  )
}

// --- escalate from the JS driver (maxIterations exhaustion / null dispatch) --
// The script can't write the store, so a tiny agent performs the status write + event.
function escalateTask(taskId, sprintId, reason) {
  return agent(
    [
      `Escalate Forge task ${taskId} to a human. Resolve FORGE_ROOT from .forge/config.json paths.forgeRoot, then`,
      `run \`node "$FORGE_ROOT/tools/store-cli.cjs" update-status task ${taskId} status escalated\``,
      `and emit one event (sprint ${sprintId}) with verdict="escalated" and notes="${reason}".`,
      `Return the task's final status as taskStatus, gatePassed=true, verdict="none", escalated=true, phase="escalate", role="escalate".`,
    ].join(' '),
    { label: `${taskId}:escalate`, phase: 'Pipeline', schema: PHASE_RESULT_SCHEMA, model: 'haiku' }
  )
}

// --- Main -------------------------------------------------------------------
const taskId = (typeof args === 'string' ? args : args?.taskId)
if (!taskId) throw new Error('wfl:run-task requires a task id — pass args: "FORGE-S27-T01"')

// Phase 1 — Resolve the pipeline + pre-task status (agent does the store/config I/O).
phase('Resolve')
const resolved = await agent(
  [
    `Resolve the run-task pipeline for Forge task ${taskId}. Resolve FORGE_ROOT from .forge/config.json paths.forgeRoot.`,
    `Read \`node "$FORGE_ROOT/tools/store-cli.cjs" read task ${taskId} --json\` for its current status and sprintId.`,
    'Then resolve the phase pipeline EXACTLY as `.forge/workflows/orchestrate_task.md` § Pipeline Resolution prescribes:',
    'if task.pipeline names a key in `.forge/config.json` pipelines, use those phases; otherwise use the default pipeline.',
    'The hardcoded default is: plan → review-plan → implement → review-code → validate → approve → commit,',
    'mapping roles to workflow files: plan→plan_task.md, review-plan→review_plan.md, implement→implement_plan.md,',
    'review-code→review_code.md, validate→validate_task.md, approve→architect_approve.md, commit→commit_task.md.',
    'maxIterations defaults to 3 for review roles (review-plan, review-code, validate) and 1 otherwise.',
    'Return taskId, sprintId, taskStatus, and the ordered phases[]. Read-only — do NOT modify anything.',
  ].join(' '),
  { label: `resolve:${taskId}`, phase: 'Resolve', schema: RESOLVE_SCHEMA }
)
if (!resolved) throw new Error(`Could not resolve pipeline for task ${taskId}`)

const { sprintId, phases } = resolved
// Pre-task status guard — orchestrate_task skips already-terminal/blocked tasks.
if (SKIP_STATUS.includes(resolved.taskStatus)) {
  log(`⚠ ${taskId} — status is ${resolved.taskStatus}, nothing to run.`)
  return { taskId, sprintId, skipped: true, taskStatus: resolved.taskStatus, results: [] }
}
log(`Task ${taskId} (sprint ${sprintId}) — ${phases.length} phases: ${phases.map(p => p.role).join(' → ')}`)

// Phase 2 — drive the phase FSM. JS owns sequencing, counters, routing, escalation.
phase('Pipeline')
const iterationCounts = {}    // keyed by phase command
const results = []
let i = 0
let escalated = false
let escalationReason = null

while (i < phases.length) {
  const p = phases[i]
  const iteration = (iterationCounts[p.command] || 0) + 1
  log(`→ ${taskId}  ${p.role} [${tierFor(p.role)}]  (iteration ${iteration})`)

  // Dispatch with one retry on a null/skipped dispatch (escalate-don't-halt at phase grain).
  let r = await runPhase(taskId, sprintId, p, iteration)
  if (!r) r = await runPhase(taskId, sprintId, p, iteration)
  if (!r) {
    escalated = true
    escalationReason = `phase ${p.role} dispatch returned null after retry`
    log(`✗ ${taskId}  ${p.role}  — dispatch failed twice, escalating`)
    break
  }
  results.push(r)

  // Gate failure or subagent self-escalation (already wrote status=escalated).
  if (!r.gatePassed || r.escalated) {
    escalated = true
    escalationReason = r.note || `${p.role} gate failed / self-escalated`
    log(`⚠ ${taskId}  ${p.role}  — escalated (${escalationReason})`)
    break
  }

  // Review phases route on verdict; non-review phases advance on completion.
  if (REVIEW_ROLES.includes(p.role)) {
    if (r.verdict === 'approved') {
      log(`✓ ${taskId}  ${p.role}  — Approved`)
      i += 1
    } else if (r.verdict === 'revision') {
      iterationCounts[p.command] = (iterationCounts[p.command] || 0) + 1
      log(`↻ ${taskId}  ${p.role}  — Revision Required (iteration ${iterationCounts[p.command]})`)
      if (iterationCounts[p.command] >= p.maxIterations) {
        escalated = true
        escalationReason = `max iterations (${p.maxIterations}) reached at ${p.role}`
        break
      }
      i = revisionTarget(phases, i)   // loop back to the producing phase
    } else {
      // 'malformed' (or unexpected 'none' from a review phase) — never guess.
      escalated = true
      escalationReason = `verdict malformed at ${p.role}`
      break
    }
  } else {
    log(`✓ ${taskId}  ${p.role}  — completed`)
    i += 1
  }
}

// If the JS driver decided to escalate (not the subagent), perform the status write.
const lastWroteEscalation = results.length && results[results.length - 1].escalated
if (escalated && !lastWroteEscalation) {
  await escalateTask(taskId, sprintId, escalationReason)
}

// Phase 3 — Report terminal outcome.
phase('Report')
const reachedEnd = !escalated && i >= phases.length
const finalStatus = reachedEnd ? 'committed' : 'escalated'
if (reachedEnd) {
  log(`🌱 Task ${taskId} complete — pipeline reached terminal (committed).`)
} else {
  log(`⚠ Task ${taskId} escalated: ${escalationReason}`)
  log(`   Resume with the failing phase command after addressing the issue, or re-run wfl:run-task.`)
}

return {
  taskId,
  sprintId,
  finalStatus,
  escalated,
  escalationReason,
  phasesRun: results.length,
  iterationCounts,
  results,
}
