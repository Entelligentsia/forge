# Workflow: Run Sprint (Forge)

## Purpose

Drive all tasks in a sprint through the pipeline. Respects dependency ordering
and execution mode. Handles errors without halting the whole sprint.

---

## Step 1 — Load Sprint

Read `.forge/store/sprints/FORGE-{NN}.json`.
Read all task JSONs for this sprint from `.forge/store/tasks/`.

Skip tasks already in terminal status: `committed`, `abandoned`.
Resume tasks in: `planned`, `plan-approved`, `implementing`, `review-approved`, `approved`.

Update sprint `status` to `active`.

## Step 2 — Sort by Dependency

Topological sort: tasks with no remaining dependencies go first.
Compute waves: tasks with no inter-wave dependencies can run in parallel.

## Step 3 — Execute (Sequential Mode — default)

Each task runs as an Agent tool subagent — **never inline**. This keeps the
sprint runner context minimal regardless of sprint size. The subagent runs the
full task pipeline (plan → review → implement → review → approve → commit) in
its own fresh context window, reading and writing disk as the source of truth.

```
for each task in dependency_sorted(tasks):
  # Spawn a fresh-context subagent for the full task pipeline using the Agent tool:
  #   prompt:      "Read `.forge/workflows/orchestrate_task.md` and follow it.
  #                 Task ID: {task.taskId}. Also read `engineering/MASTER_INDEX.md`."
  #   description: "Run pipeline for {task.taskId}"
  #   model:       "sonnet"   ← orchestrator is a lightweight state machine;
  #                              it delegates heavy work to phase subagents with
  #                              per-phase model resolution (see orchestrate_task.md)
  spawn_subagent(orchestrate_task.md, task.taskId, model="sonnet")

  # After the subagent returns, read the task status from disk to verify outcome.
  task_status = read_task_status(task.taskId)   # from .forge/store/tasks/{TASK_ID}.json
  # Terminal: "committed" or "escalated" — continue to next task either way.
```

**All verdict detection, revision loops, escalation, and event emission are
handled inside the task subagent. See `orchestrate_task.md`.**

## Step 4 — Post-Sprint

Once all tasks have reached terminal status:

1. Run collation: `node forge/tools/collate.cjs`
2. Summarise outcomes:
   ```
   🌊 Sprint {SPRINT_ID} complete.
   〇 Committed: N tasks
   △ Escalated: N tasks
   ── Carried over: N tasks
   ```
3. Update sprint `status` to `completed` or `partially-completed`
4. Suggest: "Run `/retrospective {SPRINT_ID}` to close out the sprint."

## Resume Semantics

If interrupted, re-run `/run-sprint {SPRINT_ID}`. Already-committed tasks are skipped.
Tasks in mid-pipeline state resume from their current phase.

## Execution Modes

| Mode | Behaviour |
|---|---|
| `sequential` | One task at a time (default) |
| `wave-parallel` | Tasks in the same dependency wave run in parallel worktrees |
| `full-parallel` | All tasks run in parallel (use only when tasks are fully independent) |

For `wave-parallel` / `full-parallel`: create a git worktree per task, merge on completion.
Merge strategy: rebase onto main; if conflict, escalate to human.
