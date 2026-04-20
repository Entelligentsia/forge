# PLAN — FORGE-S11-T04: Fix collate — broken task links + missing task INDEX.md generation

## Problem Statement

Two bugs in `forge/tools/collate.cjs`:

1. **Sprint INDEX.md task links** — `buildSprintIndex` generates `{taskId}/INDEX.md` (flat), but the actual
   filesystem paths for FORGE-S11 tasks are slug-named directories like
   `FORGE-S11-T04-fix-collate-task-links/INDEX.md`. All sprint-level task links dangle.

2. **Task INDEX.md not generated** — When `task.path` is a plugin source file (e.g., `forge/tools/collate.cjs`)
   the CLI loop hits `continue` and never writes an `INDEX.md` inside the corresponding task directory.
   Even if path was correct (Bug 1), the target file would not exist.

## Fix Design

### New exported helper: `resolveTaskDir(task, sprintDirPath, engPath)`

Centralise task-directory resolution into a pure, testable, exported function.

Resolution order:
1. If `task.path` is under `engPath` — return `path.basename(task.path)`.
2. Scan `sprintDirPath` for a directory matching: exact taskId, then taskId+slug prefix, then numeric suffix.
3. Return `null` if nothing found.

### `buildSprintIndex` — use `t._taskDir || t.taskId`

The function already accepts task objects. Callers annotate each task with `_taskDir` computed by
`resolveTaskDir` before calling `buildSprintIndex`. The function uses `_taskDir` when present, falls
back to `taskId` for backward compatibility.

### CLI loop — use `resolveTaskDir` for both sprint INDEX and task INDEX generation

Replace the inline path detection in the task loop with a single `resolveTaskDir` call per task.
Annotate tasks with `_taskDir` before calling `buildSprintIndex`. Drop the `continue` that skipped
plugin-source tasks.

## TDD Approach

Write failing tests first, then implement:

- `buildSprintIndex` test: tasks with `_taskDir` → link uses slug dir name, not flat taskId
- `resolveTaskDir` tests: engPath case, plugin-source case, absent path case, no-dir-found case

## Files Changed

- `forge/tools/collate.cjs` — add `resolveTaskDir`, fix `buildSprintIndex`, fix CLI loop
- `forge/tools/__tests__/collate.test.cjs` — new tests (6 new, all green before fix; red before, green after)
