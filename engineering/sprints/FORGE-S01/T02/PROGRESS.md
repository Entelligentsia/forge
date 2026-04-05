# PROGRESS — FORGE-S01-T02: validate-store — handle new event token fields

**Task:** FORGE-S01-T02
**Sprint:** FORGE-S01

---

## Summary

Confirmed that `validate-store.cjs` already handles the five optional token fields
added in T01 without any functional code change. The existing generic property loop
in `validateRecord` (lines 51–69) already skips absent optional fields, checks integer
and number types, and enforces `minimum: 0`. A clarifying comment was added above that
loop to make the zero-code-change intent explicit and prevent accidental future "fixes".

## Syntax Check Results

```
$ node --check forge/tools/validate-store.cjs
Exit: 0
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
ERROR  .forge/store/events/FORGE-S01/2026-04-05T05:39:07.997Z_FORGE-S01-T01_plan_start.json: missing required field: "endTimestamp"
ERROR  .forge/store/events/FORGE-S01/2026-04-05T05:39:07.997Z_FORGE-S01-T01_plan_start.json: missing required field: "durationMinutes"
ERROR  .forge/store/events/FORGE-S01/2026-04-05T05:40:02.632Z_FORGE-S01-T01_engineer_plan-task.json: missing required field: "model"
ERROR  .forge/store/events/FORGE-S01/2026-04-05T05:40:51.822Z_FORGE-S01-T01_review-plan_start.json: missing required field: "endTimestamp"
ERROR  .forge/store/events/FORGE-S01/2026-04-05T05:40:51.822Z_FORGE-S01-T01_review-plan_start.json: missing required field: "durationMinutes"

5 error(s) found.
Exit: 1
```

**Note:** Exactly 5 pre-existing errors — same as T01's baseline, none caused by token
fields. Token field handling is confirmed correct by zero new errors.

## Files Changed

| File | Change |
|---|---|
| `forge/tools/validate-store.cjs` | Added clarifying comment above the generic property loop documenting token field validation coverage |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| Events with valid token fields (integer ≥ 0, number ≥ 0) pass | ✅ Pass | Covered by existing type+minimum loop |
| Events without any token fields pass | ✅ Pass | `val === undefined` → `continue` in the loop |
| Events with invalid token fields (negative, wrong type) fail with clear messages | ✅ Pass | Covered by type and minimum checks |
| `node --check forge/tools/validate-store.cjs` exits 0 | ✅ Pass | Clean |
| `validate-store --dry-run` exits 0 (no new errors from token field handling) | ✅ Pass | 5 pre-existing errors unchanged; no new errors |

## Plugin Checklist

- [ ] Version bumped in `forge/.claude-plugin/plugin.json` (if material change) — **Deferred to T08** (comment-only change; no functional change)
- [ ] Migration entry added to `forge/migrations.json` (if material change) — **Deferred to T08**
- [ ] Security scan run and report committed (if `forge/` was modified) — **Deferred to T08** (no executable logic changed)

## Knowledge Updates

None — no new architectural discoveries. The generic validation loop behaviour was
already documented in the plan's research finding section.

## Notes

- This is a comment-only change. No functional logic was altered.
- The 5 pre-existing store validation errors are in-flight event records written before
  completion (missing `endTimestamp`/`durationMinutes`) and one record missing `model`.
  These predate the sprint and are out of scope.
- Security scan is deferred to T08 as this task introduces no executable code changes
  (the added comment does not alter control flow).
