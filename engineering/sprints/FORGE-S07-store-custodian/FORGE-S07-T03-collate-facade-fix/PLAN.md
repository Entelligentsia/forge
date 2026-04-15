# PLAN — FORGE-S07-T03: Fix collate.cjs facade bypasses — writeCollationState and purgeEvents

🌱 *Forge Engineer*

**Task:** FORGE-S07-T03
**Sprint:** FORGE-S07
**Estimate:** S

---

## Objective

Replace the two direct filesystem operations in `forge/tools/collate.cjs` that bypass the store facade with calls to the new `Store` methods added in T02. After this task, collate.cjs no longer calls `writeFile()` or `fs.rmSync()` on store paths — all store mutations go through the facade.

## Approach

Mechanical substitution of two call sites in collate.cjs:

1. **Line 509** — `writeFile(path.join(storeRoot, 'COLLATION_STATE.json'), ...)` is replaced with `store.writeCollationState(stateData)`. The facade's `writeCollationState()` already serialises with `JSON.stringify(data, null, 2) + '\n'` and creates parent directories, matching the existing behaviour. The local `writeFile` helper's dry-run logging is the only difference; since `writeCollationState` is a store-internal operation, dry-run suppression is acceptable (the collation itself is the visible output; the state file is a bookkeeping artifact).

2. **Lines 515-536** — The entire `--purge-events` block is replaced with a call to `store.purgeEvents(SPRINT_ARG, { dryRun: DRY_RUN })`. The facade's `purgeEvents()` implements the same path-traversal guard internally, so the duplicate guard in collate.cjs is removed. The facade returns `{ purged, fileCount, files }`, which provides all the information needed for the console output messages.

The local `writeFile()` helper function (lines 32-36) is retained because it is still used for non-store writes: MASTER_INDEX.md, COST_REPORT.md, and feature INDEX.md pages. These files live under the engineering root, not the store root, so they do not belong on the store facade.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/collate.cjs` | Replace `writeFile(...)` at line 509 with `store.writeCollationState(stateData)` | Facade bypass — all store writes must go through the facade |
| `forge/tools/collate.cjs` | Replace purge-events block (lines 515-536) with `store.purgeEvents(SPRINT_ARG, { dryRun: DRY_RUN })` + result handling | Facade bypass — all store mutations must go through the facade |

## Plugin Impact Assessment

- **Version bump required?** Yes — but deferred to T09 (Release engineering). This task alters tool behaviour in `forge/tools/collate.cjs`. The task prompt explicitly states version bump is included in T09.
- **Migration entry required?** No new migration entry in this task — deferred to T09. No schema or config changes; no regeneration targets.
- **Security scan required?** Yes — but deferred to T09 (included there). Any change to `forge/` requires a scan.
- **Schema change?** No — no schemas are modified.

## Testing Strategy

- Syntax check: `node --check forge/tools/collate.cjs`
- Store validation: `node forge/tools/validate-store.cjs --dry-run` (pre-existing errors from T05/T06 paths are unrelated)
- Manual smoke test: `node forge/tools/collate.cjs` should produce the same MASTER_INDEX.md and COST_REPORT.md output as before
- Purge test: `node forge/tools/collate.cjs FORGE-S01 --purge-events --dry-run` should report what would be purged without deleting anything

## Acceptance Criteria

- [ ] Line ~509: `writeFile(path.join(storeRoot, 'COLLATION_STATE.json'), ...)` is replaced with `store.writeCollationState(stateData)`
- [ ] Lines ~515-536: The purge-events block using `fs.rmSync()` is replaced with `store.purgeEvents(SPRINT_ARG, { dryRun: DRY_RUN })`
- [ ] The path-traversal guard (lines 521-524) is removed from collate.cjs (the facade implements it internally)
- [ ] `node --check forge/tools/collate.cjs` passes
- [ ] `node forge/tools/collate.cjs` produces the same output as before
- [ ] `--purge-events --dry-run` flag still works end-to-end

## Operational Impact

- **Distribution:** No immediate action required by users. The change is internal to collate.cjs and produces identical output.
- **Backwards compatibility:** Fully preserved. The facade methods added in T02 replicate the exact behaviour of the direct filesystem operations they replace.