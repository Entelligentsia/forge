# Generation: Orchestration

## Purpose

Generate the task pipeline orchestrator and sprint runner from meta-orchestrate,
wiring in the generated atomic workflows.

## Inputs

- `$FORGE_ROOT/meta/workflows/meta-orchestrate.md`
- Generated atomic workflows (from Phase 5) — their exact filenames
- `.forge/config.json` — commands, paths, pipeline configuration

## Setup

Read the configured KB path:

```sh
KB_PATH: !`node "$FORGE_ROOT/tools/manage-config.cjs" get paths.engineering 2>/dev/null || echo "engineering"`
```

## Outputs

- `.forge/workflows/orchestrate_task.md` — single-task pipeline (run-task)
- `.forge/workflows/run_sprint.md` — sprint scheduler

## Instructions

### orchestrate_task.md
1. Add a **Pipeline Resolution** section at the top of the orchestrator:
   - Read `task.pipeline` from the task manifest JSON
   - If set, resolve it against `config.pipelines[task.pipeline]`
   - If not set or not found, use the default pipeline
2. Define the default pipeline phases with concrete values:
   - Workflow file paths (the exact filenames generated in Phase 5)
   - Gate checks (test command, build command, lint command from config)
   - Max iteration counts
3. **Include the Model Resolution section** from meta-orchestrate.md verbatim.
   The generated orchestrator MUST resolve a model for each phase using the priority:
   `phase.model` (from config pipeline) → role-based default table. The role defaults are:
   `plan`/`implement` → `sonnet`, `review-plan`/`review-code`/`approve` → `opus`, `commit` → `haiku`.
4. **Each phase MUST be invoked as an Agent tool subagent, NOT inline.**
   The subagent prompt must include the exact `.forge/workflows/{workflow_filename}.md`
   path and the task ID. **The `model` parameter is mandatory.** Example:
   ```
   Use the Agent tool to spawn a subagent:
     prompt: "Read `.forge/workflows/plan_task.md` and follow it. Task ID: {TASK_ID}.
              Also read `{KB_PATH}/MASTER_INDEX.md` for project state."
     description: "plan phase for {TASK_ID}"
     model: phase_model   # resolved from phase.model or role default — NEVER omit
   ```
   The subagent reads all context it needs from disk and writes results (artifacts,
   task status) back to disk before returning. The orchestrator then reads verdicts
   from disk artifacts. Never pass conversation context to subagents — disk is the
   source of truth.
5. For custom pipelines, each phase's `workflow` file is used as the subagent's
   workflow instruction. Review-role phases still enforce revision loops up to
   `maxIterations` — read verdict from the disk artifact after the subagent returns.
   Custom pipeline phases that define `"model"` in config override the role default.
6. Include error recovery strategies
7. Include event emission format with project ID prefix
8. **Phase banners are orchestrator-owned.** The generated orchestrator MUST NOT include
   a "Your first action — run this banner command" instruction in subagent prompts.
   The orchestrator displays the badge before spawning and the exit signal after return;
   subagents do not display banners. Instead, include progress reporting instructions
   in the subagent prompt with the agent name, progress log path, and banner key.
9. **Include the progress IPC pattern.** Each generated orchestrator MUST:
   - Clear the progress log at task start: `node "$FORGE_ROOT/tools/store-cli.cjs" progress-clear {sprintId}`
   - Compute the agent name before each spawn: `{taskId}:{persona_noun}:{phase.role}:{iteration}`
   - Start a Monitor on the progress log before each subagent spawn
   - Include progress reporting instructions in the subagent prompt (agent name,
     progress log path, banner key, and `store-cli progress` command examples)
   - Stop the Monitor after the subagent returns
   - Display phase-exit signals after each phase completes
10. **Include phase-exit signals.** After each subagent returns (and after sidecar
    merge and event emission), the generated orchestrator MUST print the appropriate
    exit signal: `✓` for completed/approved, `↻` for revision required (with iteration
    count), `⚠` for escalated.

### run_sprint.md
1. Define execution modes (sequential, wave-parallel, full-parallel)
2. Include wave computation algorithm
3. Include worktree management commands
4. Include merge strategy
5. Include sprint lifecycle hooks (collate, report, suggest)
6. Include resume semantics
7. **Clear the progress log at sprint start**, before any task dispatch:
   ```
   FORGE_ROOT=$(node -e "console.log(require('./.forge/config.json').paths.forgeRoot)")
   node "$FORGE_ROOT/tools/store-cli.cjs" progress-clear {SPRINT_ID}
   ```
   This ensures a clean log for each sprint run.
8. **Include post-task /compact calls.** After each task subagent reaches a terminal
   state (committed, escalated, or abandoned — including after the re-spawn guard),
   print a checkpoint line and run `/compact` before dispatching the next task:
   ```
   [checkpoint] sprint={SPRINT_ID} task={task.taskId} status={task_status} remaining={remaining_task_count}
   /compact
   ```
   All durable state is on disk. The checkpoint line preserves loop bookkeeping in
   the compact summary. Do NOT compact mid re-spawn guard — only after the final
   status read for that task.
