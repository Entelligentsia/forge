# Workflow: Run Sprint (Forge)

## Purpose

Drive all tasks in a sprint through the pipeline. Respects dependency
ordering and execution mode. Handles errors without halting the whole
sprint — escalated or failed tasks do not block unrelated tasks.

---

## Step 1 — Load Sprint

- Read `.forge/store/sprints/{{PREFIX}}-S{NN}.json`
- Read all task JSONs from `.forge/store/tasks/` filtered by `sprintId`

**Skip** tasks already in a terminal status: `committed`, `abandoned`.
**Resume** tasks mid-pipeline: `planned`, `plan-approved`, `implementing`, `review-approved`, `approved`, `escalated` (only if explicitly requested).

Update sprint `status` to `active`.

## Step 2 — Sort by Dependency

- Topological sort: tasks with no remaining dependencies go first.
- Compute waves: tasks with no inter-wave edges can run in parallel.
- Validate: no cycles. If a cycle is detected, stop and escalate to the user.

### Wave Computation Algorithm

```
function compute_waves(tasks):
    # Build adjacency list from task.dependencies
    graph = {task_id: set() for task_id in tasks}
    in_degree = {task_id: 0 for task_id in tasks}
    task_map = {task.taskId: task for task in tasks}

    for task in tasks:
        for dep_id in task.get("dependencies", []):
            if dep_id in graph:
                graph[dep_id].add(task.taskId)
                in_degree[task.taskId] += 1

    # Kahn's algorithm — each "wave" is all nodes with in_degree == 0
    waves = []
    queue = [tid for tid, deg in in_degree.items() if deg == 0]

    while queue:
        wave = sorted(queue)   # deterministic ordering within a wave
        waves.append(wave)
        next_queue = []
        for tid in wave:
            for successor in graph[tid]:
                in_degree[successor] -= 1
                if in_degree[successor] == 0:
                    next_queue.append(successor)
        queue = next_queue

    # If any nodes remain, there is a cycle
    remaining = [tid for tid, deg in in_degree.items() if deg > 0]
    if remaining:
        raise CycleError(f"Dependency cycle detected among: {remaining}")

    return waves
```

## Step 3 — Execute

### Clear Progress Log at Sprint Start

Before dispatching any task, clear the progress log for this sprint:

```bash
FORGE_ROOT=$(node -e "console.log(require('./.forge/config.json').paths.forgeRoot)")
node "$FORGE_ROOT/tools/store-cli.cjs" progress-clear {SPRINT_ID}
```

This ensures a clean log for each sprint run.

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

  # Re-spawn guard: if the subagent returned without reaching a terminal state
  # (e.g. it produced large output and ran out of context mid-pipeline),
  # spawn once more with an explicit resume instruction before escalating.
  if task_status not in ["committed", "abandoned", "escalated"]:
    spawn_subagent(
      prompt="Read `.forge/workflows/orchestrate_task.md` and follow it. "
             "Task ID: {task.taskId}. "
             "The task is currently at status '{task_status}' — resume from that phase. "
             "Do not re-run phases that are already complete. "
             "Also read `engineering/MASTER_INDEX.md` for project state.",
      description="Resume pipeline for {task.taskId} (was {task_status})",
      model="sonnet"
    )
    task_status = read_task_status(task.taskId)
    if task_status not in ["committed", "abandoned", "escalated"]:
      # Two attempts exhausted — escalate and continue with remaining tasks.
      escalate("Task {task.taskId} did not reach terminal state after re-spawn "
               "(status: {task_status}). Manual intervention required.")
      # DO NOT compact mid re-spawn guard — compact only after final status read.

  # Terminal: "committed" → success. "escalated" → note and continue.
  # Never halt the whole sprint on one escalation.

  # Compact context before next task: all state is on disk
  remaining = count of tasks not yet in terminal status
  print(f"[checkpoint] sprint={SPRINT_ID} task={task.taskId} status={task_status} remaining={remaining}")
  /compact
```

**All verdict detection, revision loops, escalation, and event emission are
handled inside the task subagent.** See `orchestrate_task.md`.

### Wave-Parallel Mode

For each wave in dependency order:

1. Create a git worktree per task in the wave:
   ```bash
   git worktree add ../worktrees/{TASK_ID} HEAD
   ```
2. Spawn one subagent per task in parallel, each running `orchestrate_task.md` inside its worktree
3. Wait for all subagents in the wave to finish
4. Merge strategy: rebase each completed worktree onto `main`; on conflict → escalate that task, continue with the rest
5. Remove worktrees:
   ```bash
   git worktree remove ../worktrees/{TASK_ID}
   ```

### Full-Parallel Mode

Same as wave-parallel but all tasks start simultaneously. Use only when
every task is independent (no dependencies at all).

## Execution Modes

| Mode | Behaviour |
|---|---|
| `sequential` | One task at a time (default) |
| `wave-parallel` | Tasks in the same dependency wave run in parallel worktrees |
| `full-parallel` | All tasks run in parallel (use only when fully independent) |

## Step 4 — Post-Sprint

Once all tasks have reached a terminal status:

1. Run collation using the runtime-read pattern:
   ```bash
   FORGE_ROOT=$(node -e "console.log(require('./.forge/config.json').paths.forgeRoot)")
   node "$FORGE_ROOT/tools/collate.cjs"
   ```
   Or — since this repository is Forge itself — use the in-tree tool:
   ```bash
   node forge/tools/collate.cjs
   ```
2. Summarise outcomes:
   ```
   🌊 Sprint {SPRINT_ID} complete.
   〇 Committed: N tasks
   △ Escalated: N tasks
   ── Carried over / abandoned: N tasks
   ```
3. Update sprint `status` to `completed` or `partially-completed`
4. Suggest: "Run `/forge:retrospective {SPRINT_ID}` to close out the sprint."

## Sprint Lifecycle Hooks

| Hook | When | Action |
|---|---|---|
| `collate` | After all tasks terminal | Run `node "$FORGE_ROOT/tools/collate.cjs"` |
| `report` | After collation | Print outcome summary (committed/escalated/carried-over counts) |
| `suggest` | After report | Suggest `/forge:retrospective {SPRINT_ID}` |

## Resume Semantics

If interrupted, re-run `/forge:run-sprint {SPRINT_ID}`. Already-committed tasks are
skipped. Tasks in mid-pipeline state resume from their current phase
(the task-level orchestrator reads `status` from disk and continues).

## Event Emission

The sprint runner itself emits `sprint-start`, `sprint-complete`, and
per-task `task-dispatch` events to `.forge/store/events/{SPRINT_ID}/`.
Per-phase events are emitted by `orchestrate_task.md` inside each task
subagent.