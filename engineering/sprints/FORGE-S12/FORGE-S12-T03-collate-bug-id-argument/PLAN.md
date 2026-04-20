# PLAN — FORGE-S12-T03: Collate bug-ID first-class argument

*Forge Engineer*

**Task:** FORGE-S12-T03
**Sprint:** FORGE-S12
**Estimate:** M

---

## Objective

Make `collate.cjs` accept bug IDs as first-class positional arguments. Currently `collate.cjs HELLO-B02` fails with "sprint not found"; the user must add `--purge-events` as a workaround. Bug IDs should be recognized by pattern and automatically trigger event purging, making them equal citizens to sprint IDs.

## Approach

1. Add an `isBugId(id)` helper function that detects bug-ID patterns (`BUG-\d+` and `*-B\d+\b`) and rejects sprint/task IDs.
2. In the CLI argument-parsing section, detect when the positional argument is a bug ID and auto-enable `PURGE_EVENTS`.
3. Update the sprint-not-found error branch to distinguish bug IDs from unknown strings, so bug IDs skip sprint processing gracefully while unknown IDs still error.
4. Export `isBugId` for unit testing.
5. Write comprehensive tests for `isBugId` covering all pattern variations.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/collate.cjs` | Add `isBugId()` helper, update CLI arg parsing to auto-enable purge for bug IDs, update usage comment | Core feature: bug IDs as first-class args |
| `forge/tools/__tests__/collate.test.cjs` | Add `isBugId` test suite (12 tests) | Verify pattern detection for all bug/sprint/task ID variants |

## Plugin Impact Assessment

- **Version bump required?** Yes — changes distributed tool behavior
- **Migration entry required?** Yes — `regenerate: ["tools"]`
- **Security scan required?** Yes — changes `forge/`
- **Schema change?** No

## Testing Strategy

- Syntax check: `node --check forge/tools/collate.cjs`
- Unit tests: `node --test forge/tools/__tests__/collate.test.cjs`
- Full suite: `node --test forge/tools/__tests__/*.test.cjs`
- Manual smoke tests:
  - `node forge/tools/collate.cjs BUG-001 --dry-run` (bug ID without --purge-events)
  - `node forge/tools/collate.cjs BUG-001 --purge-events --dry-run` (backwards compat)
  - `node forge/tools/collate.cjs FORGE-S12 --dry-run` (sprint ID, no auto-purge)
  - `node forge/tools/collate.cjs NONEXISTENT --dry-run` (unknown ID, error)
  - `node forge/tools/collate.cjs --dry-run` (no args, process all)

## Acceptance Criteria

- [x] `collate.cjs {BUG_ID}` processes that bug without requiring `--purge-events`
- [x] `collate.cjs {BUG_ID} --purge-events` still works (backwards compatible)
- [x] `collate.cjs` with no args still processes all bugs (existing behavior preserved)
- [x] Bug IDs are disambiguated from sprint IDs by pattern: `*-B\d+` and `*BUG-\d+` = bug, `FORGE-S{NNN}` = sprint
- [x] `node --check` passes on collate.cjs
- [x] All existing tests pass, plus 12 new tests for `isBugId`

## Operational Impact

- **Distribution:** Users must run `/forge:update` after upgrade to get the updated collate tool
- **Backwards compatibility:** Fully backwards compatible — `--purge-events` flag still works; bug IDs are additive