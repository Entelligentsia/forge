# 🌊 Meta-Workflow: Orchestrate Task

## Purpose

Wire the atomic workflows into a pipeline that drives a single task through
the complete lifecycle. This is the task state machine.

## Pipeline Phases

Each phase has:
- `name` — identifier
- `agent` — which role executes
- `model` — which model to use (see Model Resolution below)
- `workflow` — which workflow file to load
- `requires` — prerequisite artifact
- `produces` — output artifact
- `max_iterations` — revision loop limit (for review phases)
- `gate_checks` — conditions that must pass before proceeding

## Model Resolution

Each phase subagent MUST be spawned with an explicit `model` parameter.
The orchestrator resolves the model for each phase using this priority:

1. **`phase.model`** — if the pipeline phase definition in `config.pipelines`
   includes a `model` field, use it (highest priority, allows per-phase override).
2. **Capability-Based Match** — if the workflow file for the phase has a `requirements`
   block in its frontmatter, map these tiers against the Capability Table:

   ### Internal Capability Tiers
   | Tier | Description | Target Profile |
   | :--- | :--- | :--- |
   | **High** | Deep reasoning, complex synthesis, adversarial review | Highest intelligence, max precision |
   | **Medium** | Standard implementation, iterative refinement | Balanced intelligence and speed |
   | **Low** | State machine transitions, formatting, simple commits | High speed, low latency, high reliability |

   ### Host-Agnostic Mapping (Current Host: Claude Code)
   | Capability | High | Medium | Low |
   | :--- | :--- | :--- | :--- |
   | **Reasoning** | `claude-3-opus` | `claude-3-5-sonnet` | `claude-3-haiku` |
   | **Context** | `claude-3-opus` | `claude-3-5-sonnet` | `claude-3-haiku` |
   | **Speed** | `claude-3-haiku` | `claude-3-5-sonnet` | `claude-3-haiku` |

   The orchestrator selects the model that best satisfies the primary requirement
   (Reasoning > Context > Speed). If the preferred model is unavailable, it
   falls back to the next-best match in the table.
3. **Role-based default** — if no `phase.model` or `requirements` are set, use the role default tier:
   | Role | Default Tier | Mapping |
   |------|---------------|---------|
   | `plan` | Medium | `claude-3-5-sonnet` |
   | `implement` | Medium | `claude-3-5-sonnet` |
   | `review-plan` | High | `claude-3-opus` |
   | `review-code` | High | `claude-3-opus` |
   | `validate` | High | `claude-3-opus` |
   | `approve` | High | `claude-3-opus` |
   | `commit` | Low | `claude-3-haiku` |

The orchestrator itself runs on whichever model it was invoked with (typically
`sonnet` — it is a lightweight state machine and does not need a heavy model).

Short model names (`sonnet`, `opus`, `haiku`) are valid for the Agent tool's
`model` parameter in Claude Code.

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
3. Write a sidecar file at `.forge/store/events/{sprintId}/_{eventId}_usage.json` with the exact format:
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

for each task in dependency_sorted(tasks):
  phases = resolve_pipeline(task)           # from config.pipelines or default
  iteration_counts = {}                     # keyed by phase command name
  i = 0

  while i < len(phases):
    phase = phases[i]

    # --- Resolve model for this phase (see Model Resolution) ---
    # 1. phase.model override
    # 2. workflow frontmatter 'requirements' -> Capability Table -> Model ID
    # 3. role default tier -> Capability Table -> Model ID
    phase_model = resolve_model(phase, workflow_path)

    # --- Compute eventId before spawning so the subagent can name its sidecar ---
    start_ts = current_iso_timestamp()       # e.g. "20260415T141523000Z"
    event_id = f"{start_ts}_{task_id}_{phase.role}_{phase.action}"
    sidecar_path = f".forge/store/events/{sprint_id}/_{event_id}_usage.json"

    # --- Resolve persona symbol, name, tagline ---
    emoji, persona_name, tagline = PERSONA_MAP.get(phase.role, ("🌊", "Orchestrator", "I move tasks through their lifecycle."))
    print(f"\n{emoji} **Forge {persona_name}** — {task_id} · {tagline} [{phase_model}]\n")

    # --- Invoke phase as subagent (fresh context per phase) ---
    emit_event(task, phase, eventId=event_id, iteration=iteration_counts.get(phase.command, 0) + 1, action="start")
    
    # Symmetric Injection Assembly: Persona -> Skill -> Workflow
    persona_noun    = ROLE_TO_NOUN.get(phase.role, phase.role)
    persona_content = read_file(f".forge/personas/{persona_noun}.md")
    skill_content   = read_file(f".forge/skills/{persona_noun}-skills.md")
    
    spawn_subagent(
      prompt=f"Your first output — before any tool use or file reads — print this exact line:\n\n{emoji} **Forge {persona_name}** — {task_id} · {tagline} [{phase_model}]\n\n---\n\n{persona_content}\n\n{skill_content}\n\n### Current Working Context\n- Sprint Root: {sprint_root_path}\n- Task Root: {task_root_path}\n- Store Root: {store_root_path}\n\nRead `{phase.workflow}` and follow it. Task ID: {task_id}. Also read `engineering/MASTER_INDEX.md` for project state. Before returning: run /cost, parse token usage, and write sidecar `.forge/store/events/{sprint_id}/_{event_id}_usage.json` with fields: inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, estimatedCostUSD.",
      description=f"{emoji} {persona_name} — {phase.name} for {task_id}",
      model=phase_model
    )
    # Subagent reads all context from disk, does its work, writes artifacts/status to disk, then exits.

    # --- Sidecar merge: pick up token usage written by subagent (graceful fallback if missing) ---
    token_fields = {}
    if file_exists(sidecar_path):
        token_fields = read_json(sidecar_path)
        delete_file(sidecar_path)
    emit_event(task, phase, action="complete", extra_fields=token_fields)

    # --- Non-review phases always advance ---
    if phase.role not in ("review-plan", "review-code", "validate"):
      i += 1
      continue

    # --- Review phase: detect verdict ---
    verdict = read_verdict(task, phase)     # see Verdict Detection below

    if verdict == "Approved":
      i += 1                                # advance to next phase

    elif verdict == "Revision Required":
      iteration_counts[phase.command] = iteration_counts.get(phase.command, 0) + 1

      if iteration_counts[phase.command] >= phase.maxIterations: # default 3
        escalate_to_human(task, phase, reason="max iterations reached")
        break                               # stop processing this task

      # Route back to the revision target
      target = phase.on_revision or nearest_preceding_non_review(phases, i)
      i = index_of(phases, target)          # loop back

    else:
      # Unexpected verdict (empty, malformed, or unknown)
      escalate_to_human(task, phase, reason=f"unrecognised verdict: {verdict}")
      break
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

1. Update the task store: set `status` to `escalated`
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

Every phase emits a structured event to `.forge/store/events/{sprintId}/`.

**Required fields** (defined in `.forge/schemas/event.schema.json`):

| Field | Value |
|-------|-------|
| `eventId` | `{ISO_TIMESTAMP}_{TASK_ID}_{role}_{action}` e.g. `20260415T141523000Z_ACME-S02-T03_implement_plan-task` |
| `taskId` | Task ID from the task manifest |
| `sprintId` | Sprint ID from the task manifest |
| `role` | Pipeline phase role (e.g. `plan`, `review-plan`, `implement`, `review-code`, `approve`, `commit`) |
| `action` | Slash command invoked (e.g. `/implement`, `/review-plan`) |
| `phase` | Pipeline phase name (e.g. `plan`, `review-plan`, `implement`, `review-code`, `approve`, `commit`) |
| `iteration` | 1-based iteration count for this phase |
| `startTimestamp` | ISO 8601 timestamp recorded **before** spawning the phase subagent |
| `endTimestamp` | ISO 8601 timestamp recorded **after** the subagent returns |
| `durationMinutes` | Decimal minutes elapsed between start and end (compute from the two timestamps) |
| `model` | Model identifier as reported by the host CLI for this phase (e.g. `claude-sonnet-4-6`, `gpt-4o`, `o3`) — use the full identifier, not a short alias |

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
- **Model assignment is mandatory.** Every `spawn_subagent` call in the generated
  orchestrator MUST include a `model` parameter. The generated workflow must:
  1. Include the Model Resolution section (priority: `phase.model` from config $\rightarrow$ role default)
  2. Include the role-based default table
  3. Pass `model=phase_model` in every `spawn_subagent()` call in the execution algorithm
  Do NOT generate a "Model Assignments" table without wiring it into the algorithm —
  that produces dead documentation.
- **Include the sidecar merge pattern.** After each subagent returns, check for
  `_{eventId}_usage.json` in the events directory; if found, merge the five token fields
  (`inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`)
  into the event record and delete the sidecar; if missing, emit without token fields
  (graceful fallback — no error).
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
