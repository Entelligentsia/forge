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
   - For each phase in the resolved pipeline, invoke the phase's `command`
     with the task ID as argument
2. Define the default pipeline phases with concrete values:
   - Workflow file paths (the exact filenames generated in Phase 5)
   - Gate checks (test command, build command, lint command from config)
   - Model assignments per role
   - Max iteration counts
3. For custom pipelines, the orchestrator invokes each phase's `command` as
   a slash command (e.g., `convert-measure {TASK_ID}`). Review-role phases
   still enforce revision loops up to `maxIterations`.
4. Include error recovery strategies
5. Include event emission format with project ID prefix

### run_sprint.md
1. Define execution modes (sequential, wave-parallel, full-parallel)
2. Include wave computation algorithm
3. Include worktree management commands
4. Include merge strategy
5. Include sprint lifecycle hooks (collate, report, suggest)
6. Include resume semantics
