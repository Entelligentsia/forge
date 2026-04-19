# FORGE-S07-T03: Fix collate.cjs facade bypasses — writeCollationState and purgeEvents

**Sprint:** FORGE-S07
**Estimate:** S
**Pipeline:** default

---

## Objective

Replace the two direct filesystem operations in `forge/tools/collate.cjs` that bypass
the store facade with calls to the new `Store` methods added in T02. After this task,
collate.cjs no longer calls `writeFile()` or `fs.rmSync()` on store paths — all
store mutations go through the facade.

## Acceptance Criteria

1. Line ~509: `writeFile(path.join(storeRoot, 'COLLATION_STATE.json'), ...)` is replaced
   with `store.writeCollationState(stateData)` using the existing `store` instance
2. Line ~532: `fs.rmSync(eventsDir, { recursive: true, force: true })` is replaced with
   `store.purgeEvents(SPRINT_ARG, { dryRun: DRY_RUN })` — dry-run mode uses the facade's
   dryRun flag instead of the manual check
3. `node --check forge/tools/collate.cjs` passes
4. Running `node forge/tools/collate.cjs` against the dogfooding store produces the same
   output as before (MASTER_INDEX.md, COST_REPORT.md files generated correctly)
5. `--purge-events` flag still works end-to-end

## Context

Requirement R7.1 and R7.2, AC5. The `store` variable is already instantiated in
collate.cjs; the task is purely a mechanical substitution of two call sites.

The safety guard currently in collate.cjs at line ~516–529 (path must stay within
`events/` base) should be removed from collate.cjs once the facade's `purgeEvents()`
implements the same guard internally (added in T02).

## Plugin Artifacts Involved

- `forge/tools/collate.cjs` — replace direct writeFile and fs.rmSync at lines ~509 and ~532

## Operational Impact

- **Version bump:** Required (included in T09)
- **Regeneration:** None required
- **Security scan:** Required (included in T09)
