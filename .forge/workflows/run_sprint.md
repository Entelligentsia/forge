# Workflow: Run Sprint (Forge)

## Purpose

Drive all tasks in a sprint through the pipeline. Respects dependency
ordering and execution mode. Handles errors without halting the whole
sprint — escalated or failed tasks do not block unrelated tasks.

---

## Step 1 — Load Sprint

- Read `.forge/store/sprints/FORGE-S{NN}.json`
- Read all task JSONs from `.forge/store/tasks/` filtered by `sprintId`

**Skip** tasks already in a terminal status: `committed`, `abandoned`.
**Resume** tasks mid-pipeline: `planned`, `plan-approved`, `implementing`, `review-approved`, `approved`, `escalated` (only if explicitly requested).

Update sprint `status` to `active`.

## Step 2 — Sort by Dependency

- Topological sort: tasks with no remaining dependencies go first.
- Compute waves: tasks with no inter-wave edges can run in parallel.
- Validate: no cycles. If a cycle is detected, stop and escalate to the user.

## Step 3 — Execute

Each task runs as an Agent tool subagent — **never inline**. This keeps the
sprint runner's context minimal regardless of sprint size. The subagent
runs the full task pipeline (plan → review-plan → implement → review-code
→ approve → commit) in its own fresh context window, reading and writing
disk as the source of truth.

### Sequential Mode (default)

```
for each task in dependency_sorted(tasks):
  # Announce with the orchestrator banner
  print("🌊 Sprint {SPRINT_ID} — running {task.taskId}")

  # Spawn a fresh-context subagent for the full task pipeline via the Agent tool.
  # The task-level orchestrator then spawns per-phase subagents with their own
  # per-phase model resolution (see orchestrate_task.md).
  spawn_subagent(
    prompt="Read `.forge/workflows/orchestrate_task.md` and follow it. "
           "Task ID: {task.taskId}. "
           "Also read `engineering/MASTER_INDEX.md` for project state.",
    description="Run pipeline for {task.taskId}",
    model="sonnet"    # orchestrator is a lightweight state machine
  )

  # After the subagent returns, read the task status from disk.
  task_status = read_task_status(task.taskId)   # .forge/store/tasks/{TASK_ID}.json
  # Terminal: "committed" → success. "escalated" → note and continue.
  # Never halt the whole sprint on one escalation.
```

**All verdict detection, revision loops, escalation, and event emission are
handled inside the task subagent.** See `orchestrate_task.md`.

### Wave-Parallel Mode

For each wave in dependency order:

1. Create a git worktree per task in the wave: `git worktree add ../worktrees/{TASK_ID} HEAD`
2. Spawn one subagent per task in parallel, each running `orchestrate_task.md` inside its worktree
3. Wait for all subagents in the wave to finish
4. Merge strategy: rebase each completed worktree onto `main`; on conflict → escalate that task, continue with the rest
5. Remove worktrees: `git worktree remove ../worktrees/{TASK_ID}`

### Full-Parallel Mode

Same as wave-parallel but all tasks start simultaneously. Use only when
every task is independent (no dependencies at all).

## Step 4 — Post-Sprint

Once all tasks have reached a terminal status:

1. Run collation: `node forge/tools/collate.cjs`
2. Summarise outcomes:
   ```
   🌊 Sprint {SPRINT_ID} complete.
   〇 Committed: N tasks
   △ Escalated: N tasks
   ── Carried over / abandoned: N tasks
   ```
3. Update sprint `status` to `completed` or `partially-completed`
4. Suggest: "Run `/retrospective {SPRINT_ID}` to close out the sprint."

## Resume Semantics

If interrupted, re-run `/run-sprint {SPRINT_ID}`. Already-committed tasks are
skipped. Tasks in mid-pipeline state resume from their current phase
(the task-level orchestrator reads `status` from disk and continues).

## Execution Modes

| Mode | Behaviour |
|---|---|
| `sequential` | One task at a time (default) |
| `wave-parallel` | Tasks in the same dependency wave run in parallel worktrees |
| `full-parallel` | All tasks run in parallel (use only when fully independent) |

## Event Emission

The sprint runner itself emits `sprint-start`, `sprint-complete`, and
per-task `task-dispatch` events to `.forge/store/events/{SPRINT_ID}/`.
Per-phase events are emitted by `orchestrate_task.md` inside each task
subagent.
