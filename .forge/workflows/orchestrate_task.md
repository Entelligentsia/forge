# Workflow: Orchestrate Task (Forge)

## Pipeline Resolution

1. Read `.forge/store/tasks/{TASK_ID}.json`
2. If `task.pipeline` is set, look up `config.pipelines[task.pipeline]` in `.forge/config.json`
3. If found, use those phases; if not found or not set, use the default pipeline below

## Default Pipeline

```
plan → review-plan [max 3] → implement → review-code [max 3] → approve → commit
```

| Phase | Command | Role | Workflow | Model |
|---|---|---|---|---|
| plan | `/engineer {TASK_ID}` | plan | `.forge/workflows/engineer_plan_task.md` | from config |
| review-plan | `/supervisor {TASK_ID}` | review-plan | `.forge/workflows/supervisor_review_plan.md` | from config |
| implement | `/implement {TASK_ID}` | implement | `.forge/workflows/engineer_implement_plan.md` | from config |
| review-code | `/supervisor {TASK_ID}` | review-code | `.forge/workflows/supervisor_review_implementation.md` | from config |
| approve | `/approve {TASK_ID}` | approve | `.forge/workflows/architect_approve.md` | from config |
| commit | `/commit {TASK_ID}` | commit | `.forge/workflows/engineer_commit_task.md` | from config |

## Gate Checks (before advancing past `implement`)

- `node --check <modified files>` — must exit 0
- `node forge/tools/validate-store.cjs --dry-run` — must exit 0 if schemas changed

## Context Isolation

Each phase runs as an Agent tool subagent — **never inline**. This keeps the
orchestrator context minimal across a full sprint. Each subagent starts fresh,
reads what it needs from disk, writes results back to disk, and returns.
The orchestrator reads verdicts from disk artifacts, not from conversation context.

## Execution Algorithm

```
phases = resolve_pipeline(task)
iteration_counts = {}
i = 0

while i < len(phases):
  phase = phases[i]

  emit_event(task, phase, iteration=iteration_counts.get(phase.command, 0) + 1, action="start")

  # Spawn a fresh-context subagent for this phase using the Agent tool:
  #   prompt:      "Read `{phase.workflow}` and follow it. Task ID: {TASK_ID}.
  #                 Also read `engineering/MASTER_INDEX.md` for project state."
  #   description: "{phase.name} phase for {TASK_ID}"
  # The subagent reads all context from disk, does its work, writes artifacts/status,
  # then exits. Do NOT pass conversation history or prior phase output to subagents.
  spawn_subagent(phase.workflow, task_id)

  emit_event(task, phase, action="complete")

  if phase.role not in ("review-plan", "review-code"):
    i += 1
    continue

  # Read verdict from artifact
  verdict = read_verdict(task, phase)

  if verdict == "Approved":
    i += 1

  elif verdict == "Revision Required":
    iteration_counts[phase.command] = iteration_counts.get(phase.command, 0) + 1
    if iteration_counts[phase.command] >= phase.maxIterations:  # default 3
      escalate_to_human(task, phase, reason="max iterations reached")
      break
    target = phase.on_revision or nearest_preceding_non_review(phases, i)
    i = index_of(phases, target)

  else:
    escalate_to_human(task, phase, reason=f"unrecognised verdict: {verdict}")
    break
```

## Verdict Detection

| Phase role | Artifact | Verdict field |
|---|---|---|
| `review-plan` | `engineering/sprints/{SPRINT_DIR}/{TASK_DIR}/PLAN_REVIEW.md` | Line matching `**Verdict:**` |
| `review-code` | `engineering/sprints/{SPRINT_DIR}/{TASK_DIR}/CODE_REVIEW.md` | Line matching `**Verdict:**` |

Parse value after `**Verdict:**` (trimmed). Must be exactly `Approved` or `Revision Required`.
If the artifact does not exist or the verdict is unrecognised — escalate.

## Escalation

1. Set task `status` to `escalated`
2. Emit event with `verdict: "escalated"`
3. Output:
   ```
   ⚠ Task {TASK_ID} escalated: {reason}
   Review artifact: {artifact_path}
   Resume with: /{phase.command} {TASK_ID} after addressing the issues.
   ```
4. Continue to next task in sprint

## Event Format

Record `startTimestamp` immediately before spawning the phase subagent.
Record `endTimestamp` immediately after it returns.
Compute `durationMinutes` as the decimal difference.
Record `model` as the full model identifier the host CLI used for this phase
(e.g. `claude-sonnet-4-6`, `gpt-4o`) — read from pipeline config or CLI context.

```json
{
  "eventId": "{ISO_TIMESTAMP}_{TASK_ID}_{role}_{action}",
  "taskId": "{TASK_ID}",
  "sprintId": "{SPRINT_ID}",
  "role": "{role}",
  "action": "{slash_command}",
  "phase": "{phase_name}",
  "iteration": N,
  "startTimestamp": "{ISO}",
  "endTimestamp": "{ISO}",
  "durationMinutes": N,
  "model": "{full_model_id}",
  "verdict": "Approved | Revision Required | escalated"
}
```

Store path: `.forge/store/events/{SPRINT_ID}/`
Event file: `{eventId}.json`
