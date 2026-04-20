# PLAN — FORGE-S11-T01: Fix event timestamps — store-cli.cjs zeros time component (#56)

🌱 *Forge Engineer*

**Task:** FORGE-S11-T01
**Sprint:** FORGE-S11
**Estimate:** S

---

## Objective

Fix `store-cli.cjs` so that event records written via `emit` use real ISO 8601 timestamps with actual time-of-day, not zeroed midnight values. When agents call `store-cli emit` with date-only timestamps (`T00:00:00Z`), the tool normalizes them to the current wall-clock time and recomputes `durationMinutes` accordingly.

## Approach

The root cause is that agents constructing event JSON manually often produce zeroed timestamps (e.g. `2026-04-20T00:00:00.000Z`), because they generate a date string without the time component. The fix is in `store-cli.cjs` `cmdEmit` — before schema validation, detect any zeroed `startTimestamp` or `endTimestamp` (pattern `T00:00:00`) and replace with `new Date().toISOString()`. Then recompute `durationMinutes` from the two normalized timestamps.

Two private helper functions are added inside the CLI block:
- `_isZeroedTimestamp(ts)` — returns true when the timestamp is absent, null, or matches `/T00:00:00/`
- `_normalizeEventTimestamps(data)` — mutates the event object in place, normalizing timestamps and recomputing duration

Non-zeroed timestamps provided by the caller are preserved unchanged.

The fix requires TDD: write the failing test first (4 tests), confirm they fail, implement the fix, confirm all tests pass.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/store-cli.cjs` | Add `_isZeroedTimestamp` + `_normalizeEventTimestamps` helpers; call `_normalizeEventTimestamps` in `cmdEmit` before validation | Root cause fix — normalize zeroed timestamps to real wall-clock time |
| `forge/tools/__tests__/store-cli.test.cjs` | Add `describe('store-cli.cjs — emit timestamp normalization (#56)')` with 4 tests | Regression coverage per TDD requirement |

## Plugin Impact Assessment

- **Version bump required?** Yes — addressed in T08 (bug fix to a shipped tool)
- **Migration entry required?** Yes — users must run `/forge:update-tools` (regenerate `tools` target). Addressed in T08.
- **Security scan required?** Yes — addressed in T08 (any change to `forge/` requires scan)
- **Schema change?** No — no schema files modified

## Testing Strategy

- Syntax check: `node --check forge/tools/store-cli.cjs`
- Full test suite: `node --test forge/tools/__tests__/*.test.cjs` — all tests must pass
- Store validation: `node forge/tools/validate-store.cjs --dry-run` — must exit 0

## Acceptance Criteria

- [x] `_isZeroedTimestamp` correctly identifies zeroed timestamps and null/missing values
- [x] `cmdEmit` normalizes zeroed `startTimestamp` to `new Date().toISOString()` before writing
- [x] `cmdEmit` normalizes zeroed `endTimestamp` to `new Date().toISOString()` before writing
- [x] `cmdEmit` recomputes `durationMinutes` from normalized timestamps
- [x] Non-zeroed timestamps provided by the caller are preserved unchanged
- [x] 4 new tests in `store-cli.test.cjs` covering the above behaviors
- [x] `node --check forge/tools/store-cli.cjs` exits 0
- [x] Full test suite passes (all 504 tests)
- [x] `node forge/tools/validate-store.cjs --dry-run` exits 0

## Operational Impact

- **Distribution:** Users must run `/forge:update-tools` after upgrading to get the fixed `store-cli.cjs`. This is addressed in the T08 release engineering task.
- **Backwards compatibility:** Fully backwards compatible. Events with real timestamps are preserved. Events with zeroed timestamps (the only case affected) now get real timestamps — this is a strict improvement with no data loss.
