# Meta-Workflow: Orchestrate Task

## Purpose

Wire the atomic workflows into a pipeline that drives a single task through
the complete lifecycle. This is the task state machine.

## Pipeline Phases

Each phase has:
- `name` — identifier
- `agent` — which role executes
- `model` — which model to use
- `workflow` — which workflow file to load
- `requires` — prerequisite artifact
- `produces` — output artifact
- `max_iterations` — revision loop limit (for review phases)
- `gate_checks` — conditions that must pass before proceeding

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
plan → review-plan → [loop max 3] → implement → review-implementation → [loop max 3] → approve → writeback → commit
```

When no `pipelines` section exists in config, the orchestrator uses this
hardcoded default. Projects that define `config.pipelines.default` override it.

## Execution Algorithm

The orchestrator MUST follow this procedure exactly. Do not deviate.

```
for each task in dependency_sorted(tasks):
  phases = resolve_pipeline(task)           # from config.pipelines or default
  iteration_counts = {}                     # keyed by phase command name
  i = 0

  while i < len(phases):
    phase = phases[i]

    # --- Invoke phase ---
    emit_event(task, phase, iteration=iteration_counts.get(phase.command, 0) + 1, action="start")
    invoke_slash_command(phase.command, task_id)
    emit_event(task, phase, action="complete")

    # --- Non-review phases always advance ---
    if phase.role not in ("review-plan", "review-code"):
      i += 1
      continue

    # --- Review phase: detect verdict ---
    verdict = read_verdict(task, phase)     # see Verdict Detection below

    if verdict == "Approved":
      i += 1                                # advance to next phase

    elif verdict == "Revision Required":
      iteration_counts[phase.command] = iteration_counts.get(phase.command, 0) + 1

      if iteration_counts[phase.command] >= phase.maxIterations:   # default 3
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

| Phase role    | Artifact to read                                      | Verdict field                  |
|---------------|-------------------------------------------------------|--------------------------------|
| `review-plan` | `{engineering}/sprints/{sprintDir}/{taskDir}/PLAN_REVIEW.md` | Line matching `**Verdict:**`   |
| `review-code` | `{engineering}/sprints/{sprintDir}/{taskDir}/CODE_REVIEW.md` | Line matching `**Verdict:**`   |

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

If the artifact does not exist after the review phase completes, treat it as an
unrecognised verdict and escalate.

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
| `eventId` | `{ISO_TIMESTAMP}_{TASK_ID}_{role}_{action}` e.g. `20260415T141523000Z_ACME-S02-T03_engineer_implement` |
| `taskId` | Task ID from the task manifest |
| `sprintId` | Sprint ID from the task manifest |
| `role` | Agent role executing this phase (e.g. `engineer`, `supervisor`, `architect`) |
| `action` | Slash command invoked (e.g. `/implement`, `/review-plan`) |
| `phase` | Pipeline phase name (e.g. `plan`, `review-plan`, `implement`, `review-code`, `approve`, `commit`) |
| `iteration` | 1-based iteration count for this phase |
| `startTimestamp` | ISO 8601 timestamp when the phase began |
| `endTimestamp` | ISO 8601 timestamp when the phase completed |
| `durationMinutes` | Elapsed minutes (computed from start/end) |

**Optional fields**: `model`, `verdict` (for review phases: `Approved` / `Revision Required`), `notes`.

Use only the field names above — no aliases (`agent`, `status`, `timestamp`, `details`, etc.).
When in doubt, read `.forge/schemas/event.schema.json` directly.

## Generation Instructions
- Fill in concrete test/build/lint commands from .forge/config.json
- Reference generated workflows by exact filename in .forge/workflows/
- Include stack-specific gate checks
- Set model assignments per role
- Use the Execution Algorithm above verbatim — do not paraphrase or summarise it
