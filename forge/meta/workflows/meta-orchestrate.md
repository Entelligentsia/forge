---
requirements:
  reasoning: High
  context: High
  speed: Medium
deps:
  personas: [architect, engineer, supervisor, bug-fixer, collator, qa-engineer]
  skills: [architect, engineer, supervisor, generic]
  templates: []
  sub_workflows: [plan_task, implement_plan, review_plan, review_code, fix_bug, architect_approve, commit_task, validate_task]
  kb_docs: [architecture/stack.md]
  config_fields: [paths.engineering]
---

# 🌊 Meta-Workflow: Orchestrate Task

## Purpose

Wire the atomic workflows into a pipeline that drives a single task through
the complete lifecycle. This is the task state machine.

## Pipeline Phases

Each phase has:
- `name` — identifier
- `agent` — which role executes
- `workflow` — which workflow file to load
- `requires` — prerequisite artifact
- `produces` — output artifact
- `max_iterations` — revision loop limit (for review phases)
- `gate_checks` — conditions that must pass before proceeding

## Model Resolution

Subagents inherit the parent session's model by default. **Omit the `model`
parameter on Agent tool spawns** — Claude Code resolves the correct model
from its environment.

### Cluster Detection

At session start, detect the execution cluster from environment variables
provided by Claude Code:

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_SUBAGENT_MODEL` | The actual model subagents run on |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | What "opus" resolves to |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | What "sonnet" resolves to |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | What "haiku" resolves to |

```
if ANTHROPIC_DEFAULT_OPUS_MODEL == ANTHROPIC_DEFAULT_SONNET_MODEL == ANTHROPIC_DEFAULT_HAIKU_MODEL:
    cluster = "single"  # all tiers resolve to same model
else:
    cluster = "tiered"  # tiers resolve to different models
```

On **single** clusters (e.g. non-Anthropic runtimes), omit `model` — all
phases inherit the parent model. On **tiered** clusters, the orchestrator
passes `model=opus|sonnet|haiku` based on the role-to-tier mapping below,
and Claude Code resolves the tier name to the actual runtime model.

### Role-to-Tier Mapping

Used only on tiered clusters to select the appropriate model tier:

| Role | Tier | Rationale |
|------|------|-----------|
| `review-plan` | opus | Deep reasoning for spec compliance |
| `review-code` | opus | Deep reasoning for code quality |
| `validate` | opus | Adversarial review needs highest precision |
| `approve` | opus | Architectural sign-off needs broad context |
| `plan` | sonnet | Balanced implementation planning |
| `implement` | sonnet | Balanced coding and iteration |
| `commit` | haiku | Fast, reliable state machine transition |
| `writeback` | haiku | Fast, reliable collation and file writes |

### Dispatch Behavior

| Cluster type | Agent tool `model` param | Phase announcement |
|-------------|------------------------|-------------------|
| Single | Omitted (inherit parent) | `[glm-5.1:cloud]` |
| Tiered | Tier name from mapping | `[opus → claude-opus-4-6]` |
| Per-phase override | Override value from config | `[sonnet → claude-sonnet-4-6]` |
| Unknown | Omitted (inherit parent) | `[inherited]` |

### Phase Announcements

Display the resolved model name in phase announcements:

```
# Single cluster — show the model directly
→ SPECT-T01  [glm-5.1:cloud]

# Tiered cluster — show tier → resolved model
→ SPECT-T01  [opus → claude-opus-4-6]
```

Resolve the display name by reading `ANTHROPIC_DEFAULT_{TIER}_MODEL` from
the environment. If the variable is unset, fall back to the tier name.

### Per-Phase Override

If a pipeline phase definition in `config.pipelines` includes a `model`
field, it takes precedence over the cluster-based dispatch. This is the
highest priority — it allows users to pin specific phases to specific models
regardless of the detected cluster type.

The orchestrator itself runs on whichever model it was invoked with — it is
a lightweight state machine and does not need a heavy model.

## Pipeline Resolution

The orchestrator supports pluggable pipelines. When starting a task:

1. Read the task manifest from `.forge/store/tasks/{TASK_ID}.json`.
2. If `task.pipeline` is set, look up that key in `.forge/config.json` → `pipelines`.
3. If found, use the phases defined in that pipeline.
4. If `task.pipeline` is not set or the key is not found, use the `default` pipeline
   (either from `config.pipelines.default` or the hardcoded default below).

Each phase in a pipeline has:
- `command` — the slash command to invoke (passed the task ID as argument)
- `role` — semantic role (`plan`, `review-plan`, `implement`, `review-code`, `approve`, `commit`)
- `maxIterations` — for review roles, the revision loop limit (default 3)
- `on_revision` — (optional) command name of the phase to re-invoke on "Revision Required";
  if absent, defaults to the nearest preceding phase whose role is not a review role

## Default Pipeline

```
plan → review-plan → [loop max 3] → implement → review-code → [loop max 3] → validate → [loop max 3] → approve → writeback → commit
```

When no `pipelines` section exists in config, the orchestrator uses this
hardcoded default. Projects that define `config.pipelines.default` override it.

## Context Isolation

**Each phase MUST run as a subagent (Agent tool call), NOT inline.**

Invoking phases inline accumulates context from every prior phase and task into
the orchestrator's window. This violates Forge's design principle of keeping
context light and nimble. By the time a sprint reaches its third or fourth task,
an inline orchestrator is carrying tens of thousands of tokens of prior work that
is irrelevant to the current phase.

The fix: use the Agent tool to spawn a subagent per phase. Each subagent:
- Starts with a fresh context window
- Receives only what it needs: the workflow file path and the task ID
- Reads all other context from disk (task JSON, PLAN.md, MASTER_INDEX.md, etc.)
- Writes results to disk (artifacts, task status updates)
- Returns to the orchestrator, which then reads the verdict from disk

The orchestrator itself stays minimal — it only holds the phase loop and event log.

## Token Self-Reporting

Each phase subagent is responsible for reporting its own token usage via a sidecar file.

**Before returning, every subagent MUST:**

1. Run `/cost` to retrieve token usage for the session.
2. Parse the output for the five fields:
   `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
3. Write the usage sidecar via `/forge:store emit {sprintId} '{sidecar-json}' --sidecar` with the exact format:
   ```json
   {
     "inputTokens": <integer>,
     "outputTokens": <integer>,
     "cacheReadTokens": <integer>,
     "cacheWriteTokens": <integer>,
     "estimatedCostUSD": <number>
   }
   ```

The `eventId` is computed by the orchestrator before spawning and passed in the subagent prompt —
it follows the format `{ISO_TIMESTAMP}_{TASK_ID}_{role}_{action}` (e.g.
`20260415T141523000Z_ACME-S02-T03_engineer_implement`).

The leading underscore on the sidecar filename marks it as ephemeral — `validate-store.cjs` skips
files prefixed with `_`, so the sidecar will never be treated as a real event record. If `/cost` is
unavailable or token data cannot be parsed, skip writing the sidecar silently — the orchestrator
handles missing sidecars gracefully (see Execution Algorithm below).

## Role-to-Noun Mapping

The orchestrator resolves persona and skill file lookups using **noun-based**
filenames, not role-literal filenames. A role like `plan` maps to the noun
`engineer`, so the persona file is `engineer.md`, not `plan.md`.

```
ROLE_TO_NOUN = {
  "plan":        "engineer",
  "implement":   "engineer",
  "update-plan": "engineer",
  "update-impl": "engineer",
  "commit":      "engineer",
  "review-plan": "supervisor",
  "review-code": "supervisor",
  "validate":    "qa-engineer",
  "approve":     "architect",
  "writeback":   "collator",
}
```

The `.get(key, fallback)` pattern preserves the old role-literal behaviour for
any role not yet in the table, which is a safe degradation path for custom
pipeline roles.

## Execution Algorithm

The orchestrator MUST follow this procedure exactly. Do not deviate.

```
# --- Persona symbol lookup (emoji, name, tagline) ---
PERSONA_MAP = {
  "plan":        ("🌱", "Engineer",    "I plan what will be built before any code is written."),
  "implement":   ("🌱", "Engineer",    "I build what was planned. I do not move forward until the code is clean."),
  "update-plan": ("🌱", "Engineer",    "I address what the Supervisor found. No more, no less."),
  "update-impl": ("🌱", "Engineer",    "I address what the Supervisor found. No more, no less."),
  "commit":      ("🌱", "Engineer",    "I close out completed work with a clean, honest commit."),
  "review-plan": ("🌿", "Supervisor",  "I review before things move forward. I read the actual task prompt, not just the plan."),
  "review-code": ("🌿", "Supervisor",  "I review before things move forward. I read the actual code, not the report."),
  "validate":    ("🍵", "QA Engineer", "I validate against what was promised. The code compiling is not enough."),
  "approve":     ("🗻", "Architect",   "I hold the shape of the whole. I give final sign-off before commit."),
  "writeback":   ("🍃", "Collator",    "I gather what exists and arrange it into views."),
}

# --- Banner identity map (banner name per phase role) ---
# Maps each role to a banner in forge/tools/banners.cjs.
# Displayed by the orchestrator ONLY (badge before spawn, exit signal after return).
# Subagents do NOT display banners — the orchestrator owns phase announcements.
BANNER_MAP = {
  "plan":        "forge",
  "implement":   "forge",
  "update-plan": "forge",
  "update-impl": "forge",
  "commit":      "forge",
  "review-plan": "oracle",
  "review-code": "oracle",
  "validate":    "lumen",
  "approve":     "north",
  "writeback":   "drift",
}

for each task in dependency_sorted(tasks):
  phases = resolve_pipeline(task)           # from config.pipelines or default
  iteration_counts = {}                     # keyed by phase command name
  i = 0

  # --- Detect execution cluster from env vars (see Model Resolution) ---
  opus_model   = env("ANTHROPIC_DEFAULT_OPUS_MODEL", "")
  sonnet_model = env("ANTHROPIC_DEFAULT_SONNET_MODEL", "")
  haiku_model  = env("ANTHROPIC_DEFAULT_HAIKU_MODEL", "")
  if opus_model and opus_model == sonnet_model == haiku_model:
    cluster = "single"
    resolved_model = opus_model   # all tiers same model
  elif opus_model:
    cluster = "tiered"
    resolved_model = None         # each tier resolves differently
  else:
    cluster = "unknown"
    resolved_model = env("CLAUDE_CODE_SUBAGENT_MODEL", "unknown")

  # --- Role-to-tier mapping for tiered cluster dispatch ---
  ROLE_TIER = {
    "review-plan": "opus",
    "review-code": "opus",
    "validate":    "opus",
    "approve":     "opus",
    "plan":        "sonnet",
    "implement":   "sonnet",
    "commit":      "haiku",
    "writeback":   "haiku",
  }

  # --- Clear progress log for this sprint ---
  progress_log_path = f".forge/store/events/{sprint_id}/progress.log"
  run_bash(f'FORGE_ROOT=$(node -e "console.log(require(\'./.forge/config.json\').paths.forgeRoot)") && node "$FORGE_ROOT/tools/store-cli.cjs" progress-clear {sprint_id}')

  while i < len(phases):
    phase = phases[i]

    # --- Resolve model for display and dispatch (see Model Resolution) ---
    if phase.model:                                   # per-phase override from config
      display_model = phase.model
      dispatch_model = phase.model                   # pass override to Agent tool
      if env(f"ANTHROPIC_DEFAULT_{phase.model.upper()}_MODEL"):
        resolved = env(f"ANTHROPIC_DEFAULT_{phase.model.upper()}_MODEL")
        display_model = f"{phase.model} → {resolved}"
    elif cluster == "single" and resolved_model:
      display_model = resolved_model
      dispatch_model = None                           # inherit parent model
    elif cluster == "tiered":
      tier = ROLE_TIER.get(phase.role, "sonnet")
      resolved = env(f"ANTHROPIC_DEFAULT_{tier.upper()}_MODEL", tier)
      display_model = f"{tier} → {resolved}" if resolved != tier else tier
      dispatch_model = tier                           # pass tier name, Claude Code resolves
    else:
      display_model = env("CLAUDE_CODE_SUBAGENT_MODEL", "inherited")
      dispatch_model = None                           # inherit parent model

    # --- Compute eventId before spawning so the subagent can name its sidecar ---
    start_ts = current_iso_timestamp()       # e.g. "20260415T141523000Z"
    event_id = f"{start_ts}_{task_id}_{phase.role}_{phase.action}"
    sidecar_path = f".forge/store/events/{sprint_id}/_{event_id}_usage.json"  # used by merge-sidecar

    # --- Compute agent name for progress IPC ---
    persona_noun = ROLE_TO_NOUN.get(phase.role, phase.role)
    iteration = iteration_counts.get(phase.command, 0) + 1
    agent_name = f"{task_id}:{persona_noun}:{phase.role}:{iteration}"

    # --- Announce phase with identity banner (badge) + task context ---
    emoji, persona_name, tagline = PERSONA_MAP.get(phase.role, ("🌊", "Orchestrator", "I move tasks through their lifecycle."))
    banner_name = BANNER_MAP.get(phase.role, "forge")
    run_bash(f'FORGE_ROOT=$(node -e "console.log(require(\'./.forge/config.json\').paths.forgeRoot)") && node "$FORGE_ROOT/tools/banners.cjs" --badge {banner_name}')
    print(f"  → {task_id}  [{display_model}]\n")

    # --- Start progress Monitor before spawning subagent ---
    # The Monitor streams lines from the progress log as the subagent works.
    # New lines arrive as notifications while the Agent tool blocks on the subagent.
    start_monitor(
      command=f"tail -n +1 -F {progress_log_path} 2>/dev/null || true",
      description=f"Progress: {agent_name}",
      persistent=False
    )

    # --- Invoke phase as subagent (fresh context per phase) ---
    emit_event(task, phase, eventId=event_id, iteration=iteration, action="start")

    # Symmetric Injection Assembly: Persona -> Skill -> Workflow
    persona_content = read_file(f".forge/personas/{persona_noun}.md")
    skill_content   = read_file(f".forge/skills/{persona_noun}-skills.md")

    spawn_kwargs = dict(
      prompt=(
        f"### Progress Reporting\n"
        f"- Agent name: {agent_name}\n"
        f"- Progress log: {progress_log_path}\n"
        f"- Banner key: {banner_name}\n\n"
        f"Append progress entries to the log as you work:\n\n"
        f"```\n"
        f"node \"$FORGE_ROOT/tools/store-cli.cjs\" progress {sprint_id} {agent_name} {banner_name} start \"Starting {phase.role} phase\"\n"
        f"node \"$FORGE_ROOT/tools/store-cli.cjs\" progress {sprint_id} {agent_name} {banner_name} progress \"Reading codebase\"\n"
        f"node \"$FORGE_ROOT/tools/store-cli.cjs\" progress {sprint_id} {agent_name} {banner_name} done \"Completed {phase.role}\"\n"
        f"```\n\n"
        f"Write a `start` entry when you begin, `progress` entries as you make headway, "
        f"a `done` entry when you finish, or an `error` entry if something fails. "
        f"The orchestrator is monitoring this log in real time.\n\n"
        f"---\n\n"
        f"{persona_content}\n\n"
        f"{skill_content}\n\n"
        f"### Current Working Context\n"
        f"- Sprint Root: {sprint_root_path}\n"
        f"- Task Root:   {task_root_path}\n"
        f"- Store Root:  {store_root_path}\n\n"
        f"Read `{phase.workflow}` and follow it. Task ID: {task_id}. "
        f"Also read `engineering/MASTER_INDEX.md` for project state. "
        f"Before returning: run /cost, parse token usage, and write the usage sidecar via "
        f"`/forge:store emit {sprint_id} '{{sidecar-json}}' --sidecar` with fields: "
        f"inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, estimatedCostUSD."
      ),
      description=f"{emoji} {persona_name} — {phase.name} for {task_id}",
    )
    if dispatch_model:
      spawn_kwargs["model"] = dispatch_model
    spawn_subagent(**spawn_kwargs)
    # Subagent reads all context from disk, does its work, writes artifacts/status to disk, then exits.

    # --- Stop progress Monitor ---
    stop_monitor(progress_log_path)

    # --- Sidecar merge: merge token usage written by subagent via custodian ---
    # The subagent wrote the sidecar via /forge:store emit {sprintId} '{sidecar-json}' --sidecar
    # Merge the sidecar into the canonical event and delete the sidecar file
    FORGE_ROOT = resolve_forge_root()
    run: node "$FORGE_ROOT/tools/store-cli.cjs" merge-sidecar {sprint_id} {event_id}
    # merge-sidecar reads the sidecar, merges token fields into the canonical event, and deletes the sidecar
    # If the sidecar does not exist, merge-sidecar exits 1 — treat as non-fatal (subagent may have skipped it)
    emit_event(task, phase, action="complete")

    # --- Phase-exit signal ---
    # Non-review phases always advance with a completion signal
    if phase.role not in ("review-plan", "review-code", "validate"):
      print(f"  ✓ {task_id}  {phase.role}  — completed\n")
      i += 1
      # Compact context: all state is on disk; preserve loop bookkeeping in the summary
      print(f"[checkpoint] task={task_id} sprint={sprint_id} phase_index={i} iterations={iteration_counts}")
      /compact
      continue

    # --- Review phase: detect verdict ---
    verdict = read_verdict(task, phase)     # see Verdict Detection below

    if verdict == "Approved":
      print(f"  ✓ {task_id}  {phase.role}  — Approved\n")
      i += 1                                # advance to next phase
      # Compact context: all state is on disk; preserve loop bookkeeping in the summary
      print(f"[checkpoint] task={task_id} sprint={sprint_id} phase_index={i} iterations={iteration_counts}")
      /compact

    elif verdict == "Revision Required":
      iteration_counts[phase.command] = iteration_counts.get(phase.command, 0) + 1
      print(f"  ↻ {task_id}  {phase.role}  — Revision Required (iteration {iteration_counts[phase.command]})\n")

      if iteration_counts[phase.command] >= phase.maxIterations: # default 3
        escalate_to_human(task, phase, reason="max iterations reached")
        break                               # stop processing this task

      # Route back to the revision target
      target = phase.on_revision or nearest_preceding_non_review(phases, i)
      i = index_of(phases, target)          # loop back
      # Compact context: all state is on disk; preserve loop bookkeeping in the summary
      print(f"[checkpoint] task={task_id} sprint={sprint_id} phase_index={i} iterations={iteration_counts}")
      /compact

    else:
      # Unexpected verdict (empty, malformed, or unknown)
      print(f"  ⚠ {task_id}  {phase.role}  — escalated to human\n")
      escalate_to_human(task, phase, reason=f"unrecognised verdict: {verdict}")
      break
```

## Agent Naming Convention

Each subagent is assigned a structured name at spawn time:

```
{taskId}:{persona_noun}:{phase.role}:{iteration}
```

| Component | Source | Example |
|-----------|--------|---------|
| `taskId` | Task ID from manifest | `FORGE-S09-T01` |
| `persona_noun` | `ROLE_TO_NOUN` mapping | `engineer`, `supervisor`, `qa-engineer` |
| `phase.role` | Pipeline phase role | `plan`, `review-plan`, `implement` |
| `iteration` | 1-based revision count for this phase | `1`, `2`, `3` |

Examples:

- `FORGE-S09-T01:engineer:plan:1` — First plan attempt for T01
- `FORGE-S09-T01:supervisor:review-plan:1` — First plan review for T01
- `FORGE-S09-T01:engineer:update-impl:2` — Second implementation revision for T01

The agent name is passed in the subagent prompt and used in every progress log
entry the subagent writes. It provides identity and traceability for mid-task
feedback.

## Progress Reporting

Each subagent writes progress entries to a transient log file that the
orchestrator monitors in real time.

**Log path:** `.forge/store/events/{sprintId}/progress.log`

**Format per line:**

```
{ISO_TIMESTAMP}|{agent_name}|{banner_key}|{status}|{detail}
```

| Field | Format | Example |
|-------|--------|---------|
| `ISO_TIMESTAMP` | ISO 8601 UTC | `2026-04-16T14:15:23Z` |
| `agent_name` | `{taskId}:{persona_noun}:{phase.role}:{iteration}` | `FORGE-S09-T01:engineer:plan:1` |
| `banner_key` | Banner identity key from BANNER_MAP | `forge` |
| `status` | One of: `start`, `progress`, `done`, `error` | `progress` |
| `detail` | Free text (no pipe characters) | `Reading codebase` |

**Writing entries:** Use `store-cli progress`:

```
node "$FORGE_ROOT/tools/store-cli.cjs" progress {sprintId} {agentName} {bannerKey} {status} "detail text"
```

**Monitoring:** The orchestrator starts a Monitor on the progress log before
spawning each subagent and stops it after the subagent returns. This streams
real-time status to the orchestrator's chat.

**Clearing:** The orchestrator clears the progress log at task start using
`store-cli progress-clear {sprintId}`.

## Phase-Exit Signals

After each subagent returns, the orchestrator prints a phase-exit signal:

| Outcome | Format |
|---------|--------|
| Non-review phase completed | `  ✓ {task_id}  {phase_role}  — completed` |
| Review verdict: Approved | `  ✓ {task_id}  {phase_role}  — Approved` |
| Review verdict: Revision Required | `  ↻ {task_id}  {phase_role}  — Revision Required (iteration {n})` |
| Escalated | `  ⚠ {task_id}  {phase_role}  — escalated to human` |

Examples:

```
  ✓ FORGE-S09-T01  plan  — completed
  ✓ FORGE-S09-T01  review-plan  — Approved
  ↻ FORGE-S09-T01  review-plan  — Revision Required (iteration 2)
  ⚠ FORGE-S09-T01  validate  — escalated to human
```

## Verdict Detection

After each review phase completes, the orchestrator MUST read the verdict
before branching. Do not infer the verdict from conversation context alone —
always read the artifact.

| Phase role    | Artifact to read                                                          | Verdict field                |
|---------------|---------------------------------------------------------------------------|------------------------------|
| `review-plan` | `{engineering}/sprints/{sprintDir}/{taskDir}/PLAN_REVIEW.md`              | Line matching `**Verdict:**` |
| `review-code` | `{engineering}/sprints/{sprintDir}/{taskDir}/CODE_REVIEW.md`              | Line matching `**Verdict:**` |
| `validate`    | `{engineering}/sprints/{sprintDir}/{taskDir}/VALIDATION_REPORT.md`        | Line matching `**Verdict:**` |

The verdict line format is:

```
**Verdict:** Approved
```
or
```
**Verdict:** Revision Required
```

Parse the value after `**Verdict:**` (trimmed). Any value other than `Approved`
or `Revision Required` is unrecognised — escalate.

If the artifact does not exist after the review phase completes, treat it as
an unrecognised verdict and escalate.

## Escalation Procedure

When escalating to the human:

1. Update task status via `/forge:store update-status task {taskId} status escalated`
2. Emit a final event with `verdict: "escalated"` and `notes` explaining the reason
3. Output a clear message:
   ```
   ⚠ Task {TASK_ID} escalated: {reason}
   Review artifact: {artifact_path}
   Resume with: /{phase.command} {TASK_ID} after addressing the issues.
   ```
4. Stop processing this task. Continue to the next task in the sprint.

## Iron Laws

**YOU MUST NOT advance a phase until its gate checks pass.** Skipping a gate
because "it's probably fine" or "it's a small change" is not allowed. No exceptions.

**Review ordering is hardcoded:** spec compliance review ALWAYS runs before
code quality review. Never reverse this. Checking quality before confirming
correctness is wasted work.

**Revision loop exhaustion is an escalation trigger.** If max_iterations is
reached without approval, escalate to the human immediately. Do NOT approve
to unblock the pipeline.

**Always read the verdict from the artifact.** Never assume approval because the
review phase ran without error. The artifact is the source of truth.

## Error Recovery

- Test/build failure: pass error to Engineer revision workflow, retry once
- Verdict "Revision Required": enter revision loop (up to max_iterations)
- Timeout/empty response: retry subagent once with simplified prompt
- Git hook failure: diagnose, fix, create new commit
- Merge conflict: escalate to human

## Event Emission

Every phase emits a structured event via `/forge:store emit {sprintId} '{event-json}'`.

**Required fields** (defined in `.forge/schemas/event.schema.json`):

| Field | Value |
|-------|-------|
| `eventId` | `{ISO_TIMESTAMP}_{TASK_ID}_{role}_{action}` e.g. `20260415T141523000Z_ACME-S02-T03_implement_plan-task` |
| `taskId` | Task ID from the task manifest |
| `sprintId` | Sprint ID from the task manifest |
| `role` | Pipeline phase role (e.g. `plan`, `review-plan`, `implement`, `review-code`, `approve`, `commit`) |
| `action` | Slash command invoked in namespaced form (e.g. `/{prefix}:implement`, `/{prefix}:review-plan`) |
| `phase` | Pipeline phase name (e.g. `plan`, `review-plan`, `implement`, `review-code`, `approve`, `commit`) |
| `iteration` | 1-based iteration count for this phase |
| `startTimestamp` | ISO 8601 timestamp recorded **before** spawning the phase subagent |
| `endTimestamp` | ISO 8601 timestamp recorded **after** the subagent returns |
| `durationMinutes` | Decimal minutes elapsed between start and end (compute from the two timestamps) |
| `model` | Resolved model identifier for this phase (e.g. `claude-sonnet-4-6`, `gpt-4o`, `glm-5.1:cloud`). Read from `CLAUDE_CODE_SUBAGENT_MODEL` on single-cluster runtimes, or from `ANTHROPIC_DEFAULT_{TIER}_MODEL` on tiered clusters. Use the full identifier, not a short alias like "opus" or "sonnet". |

**Optional fields**: `verdict` (for review phases: `Approved` / `Revision Required`), `notes`,
`inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`
(token usage merged from the subagent sidecar — present only when the subagent wrote
the sidecar).

Use only the field names above — no aliases (`agent`, `status`, `timestamp`, `details`, etc.).
When in doubt, read `.forge/schemas/event.schema.json` directly.

## Generation Instructions
- Fill in concrete test/build/lint commands from .forge/config.json
- Reference generated workflows by exact filename in .forge/workflows/
- Include stack-specific gate checks
- Use the Execution Algorithm above verbatim — do not paraphrase or summarise it
- `spawn_subagent` = Agent tool call. Each phase invocation MUST use the Agent tool with
  the exact workflow filename and task ID in the prompt. Never invoke phases inline.
- **Model dispatch uses cluster detection.** The generated workflow must include
  the cluster detection block (reading `ANTHROPIC_DEFAULT_*_MODEL` env vars) and
  the ROLE_TIER mapping table. On single clusters, omit `model` on Agent spawns
  (subagents inherit the parent model). On tiered clusters, pass `model=tier`
  based on the role-to-tier mapping. Only override this for per-phase `model`
  fields from `config.pipelines`.
  Do NOT generate a "Model Assignments" table — the Model Resolution section
  above is the single source of truth.
- **Include the sidecar merge pattern.** After each subagent returns, run
  `/forge:store merge-sidecar {sprintId} {eventId}` to merge token fields from the
  sidecar into the canonical event and delete the sidecar. If the sidecar does not
  exist (merge-sidecar exits 1), treat as non-fatal and emit the event without token
  fields (graceful fallback — no error).
- **Include the role-to-noun mapping table.** The generated orchestrator MUST include
  a `ROLE_TO_NOUN` dictionary (or equivalent in the host language) that maps every
  pipeline phase role to a noun-based persona identifier. This table is used for
  persona and skill file lookups, not for display. Example:

  | Role | Noun | Persona File | Skill File |
  |------|------|-------------|------------|
  | `plan` | `engineer` | `.forge/personas/engineer.md` | `.forge/skills/engineer-skills.md` |
  | `implement` | `engineer` | `.forge/personas/engineer.md` | `.forge/skills/engineer-skills.md` |
  | `review-plan` | `supervisor` | `.forge/personas/supervisor.md` | `.forge/skills/supervisor-skills.md` |
  | `review-code` | `supervisor` | `.forge/personas/supervisor.md` | `.forge/skills/supervisor-skills.md` |
  | `validate` | `qa-engineer` | `.forge/personas/qa-engineer.md` | `.forge/skills/qa-engineer-skills.md` |
  | `approve` | `architect` | `.forge/personas/architect.md` | `.forge/skills/architect-skills.md` |
  | `commit` | `engineer` | `.forge/personas/engineer.md` | `.forge/skills/engineer-skills.md` |
  | `writeback` | `collator` | `.forge/personas/collator.md` | `.forge/skills/collator-skills.md` |

  Generated lookups must use `{persona_noun}.md` and `{persona_noun}-skills.md`,
  never `{phase.role}.md` or `{phase.role}-skills.md`.
- **Phase banners are orchestrator-owned.** The generated orchestrator MUST NOT include
  a "Your first action — run this banner command" instruction in subagent prompts.
  The orchestrator displays the badge before spawning and the exit signal after return;
  subagents do not display banners. Instead, include progress reporting instructions
  in the subagent prompt with the agent name, progress log path, and banner key.
- **Include the progress IPC pattern.** Each generated orchestrator MUST:
  1. Clear the progress log at task start: `node "$FORGE_ROOT/tools/store-cli.cjs" progress-clear {sprintId}`
  2. Compute the agent name before each spawn: `{taskId}:{persona_noun}:{phase.role}:{iteration}`
  3. Start a Monitor on the progress log before each subagent spawn
  4. Include progress reporting instructions in the subagent prompt (agent name,
     progress log path, banner key, and `store-cli progress` command examples)
  5. Stop the Monitor after the subagent returns
  6. Display phase-exit signals after each phase completes (see Phase-Exit Signals section)
- **Include phase-exit signals.** After each subagent returns (and after sidecar
  merge and event emission), the generated orchestrator MUST print the appropriate
  exit signal: `✓` for completed/approved, `↻` for revision required (with iteration
  count), `⚠` for escalated.
- **Include post-phase /compact calls.** After each phase-exit signal (for every
  non-escalation outcome), the generated orchestrator MUST:
  1. Print a checkpoint line: `[checkpoint] task={task_id} sprint={sprint_id} phase_index={i} iterations={iteration_counts}`
  2. Run `/compact` to free orchestrator context before the next phase.
  All durable state is on disk; the checkpoint line ensures the compact summary
  preserves the loop bookkeeping (task ID, sprint ID, current phase index,
  iteration counts). Do NOT compact on escalation — the human needs full context.
