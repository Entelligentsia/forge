# Generation: Orchestration

## Purpose

Generate the task pipeline orchestrator and sprint runner from meta-orchestrate,
wiring in the generated atomic workflows.

## Inputs

- `$FORGE_ROOT/meta/workflows/meta-orchestrate.md`
- Generated atomic workflows (from Phase 5) — their exact filenames
- `.forge/config.json` — commands, paths, pipeline configuration

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
   - Model assignments per role
   - Max iteration counts
3. **Each phase MUST be invoked as an Agent tool subagent, NOT inline.**
   The subagent prompt must include the exact `.forge/workflows/{workflow_filename}.md`
   path and the task ID. Example:
   ```
   Use the Agent tool to spawn a subagent:
     prompt: "Read `.forge/workflows/engineer_plan_task.md` and follow it. Task ID: {TASK_ID}.
              Also read `engineering/MASTER_INDEX.md` for project state."
     description: "plan phase for {TASK_ID}"
   ```
   The subagent reads all context it needs from disk and writes results (artifacts,
   task status) back to disk before returning. The orchestrator then reads verdicts
   from disk artifacts. Never pass conversation context to subagents — disk is the
   source of truth.
4. For custom pipelines, each phase's `workflow` file is used as the subagent's
   workflow instruction. Review-role phases still enforce revision loops up to
   `maxIterations` — read verdict from the disk artifact after the subagent returns.
5. Include error recovery strategies
6. Include event emission format with project ID prefix

### run_sprint.md
1. Define execution modes (sequential, wave-parallel, full-parallel)
2. Include wave computation algorithm
3. Include worktree management commands
4. Include merge strategy
5. Include sprint lifecycle hooks (collate, report, suggest)
6. Include resume semantics
