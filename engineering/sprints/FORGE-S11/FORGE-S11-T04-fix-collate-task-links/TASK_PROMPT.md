# FORGE-S11-T04: Fix collate: broken task links + missing task INDEX.md generation (#53)

**Sprint:** FORGE-S11
**Estimate:** M
**Pipeline:** default

---

## Objective

Two related bugs in `forge/tools/collate.cjs`:

1. Sprint `INDEX.md` renders task links as `{taskId}/INDEX.md` (flat path), but the actual filesystem path is `tasks/{task_dir}/INDEX.md`. All task links in sprint and master index dangle.

2. No `INDEX.md` is generated inside task directories — so even if link paths were correct, the targets don't exist.

Fix both: correct the link path construction, and emit an `INDEX.md` inside each task directory.

## Acceptance Criteria

1. Sprint `INDEX.md` task links resolve correctly to `tasks/{task_dir}/INDEX.md`.
2. `collate.cjs` creates (or updates) an `INDEX.md` inside each task directory it processes.
3. All existing collate tests pass.
4. New tests cover: (a) correct path format in generated sprint INDEX.md task links; (b) task directory INDEX.md is created.
5. `node --check forge/tools/collate.cjs` exits 0.
6. `node forge/tools/validate-store.cjs --dry-run` exits 0 (no schema changes expected).

## Context

- GitHub issue: #53
- `collate.cjs` already knows task paths from store records — no schema change expected.
- Write failing tests FIRST for both bugs, then fix, then confirm tests pass.
- Run full suite: `node --test forge/tools/__tests__/*.test.cjs` — all 241 tests must pass.

## Plugin Artifacts Involved

- `forge/tools/collate.cjs` — primary fix
- `forge/tools/__tests__/collate.test.cjs` — new regression tests

## Operational Impact

- **Version bump:** required (addressed in T08)
- **Regeneration:** users must run `/forge:update-tools` after installing (tools target)
- **Security scan:** required (addressed in T08)
