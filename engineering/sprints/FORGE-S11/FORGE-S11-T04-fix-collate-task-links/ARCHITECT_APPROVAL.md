# Architect Approval — FORGE-S11-T04

🗻 *Forge Architect*

**Status:** Approved

## Distribution Notes

- **Version bump:** Deferred to T08 (release engineering). T08 will bump from v0.19.2 to v0.20.0 and run the security scan for all T01–T07 changes as a single release gate. This is the correct sprint-level bundling pattern.
- **Migration entry:** Deferred to T08. The `regenerate` target will be `["tools"]` since `collate.cjs` changed — users will need to run `/forge:update-tools` after upgrading.
- **Security scan:** Not yet present for v0.20.0. Required before T08 commits. No blocker for this task approval since T08 gates the actual distribution.
- **Backwards compatibility:** Fully maintained. `buildSprintIndex` gains a new `t._taskDir` property read but falls back to `t.taskId` when absent — existing callers that don't annotate tasks are unaffected. `resolveTaskDir` is a new export with no API impact on existing users.

## Operational Notes

- Users who run `/forge:collate` after upgrading will see correct task links in sprint INDEX files instead of dangling `{taskId}/INDEX.md` paths.
- Task INDEX.md files will now be generated inside task directories for tasks that have plugin-source paths (e.g., `forge/tools/collate.cjs`). Previously these were silently skipped.
- No new directories, installed artifacts, or disk-write sites beyond the corrected INDEX.md generation.
- No changes to `forge/hooks/`, `forge/commands/`, `forge/schemas/`, or `forge/meta/` — distribution footprint unchanged.

## Follow-Up Items

- The missing trailing newline in `forge/tools/__tests__/collate.test.cjs` (noted in CODE_REVIEW advisory) should be fixed in a cleanup commit or as part of T08 formatting pass.
- The numeric-suffix fallback in `resolveTaskDir` uses the last integer in the task ID, consistent with `resolveDir`. If a sprint ever has two tasks whose task IDs share the same trailing integer in different positions, the alphabetical-first-match heuristic could produce a wrong resolution. This is unlikely given current naming conventions but worth documenting as a known limitation.
