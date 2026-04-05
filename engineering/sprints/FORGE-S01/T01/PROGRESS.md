# PROGRESS — FORGE-S01-T01: Event schema — add optional token fields

**Task:** FORGE-S01-T01
**Sprint:** FORGE-S01

---

## Summary

Added five optional token-consumption fields (`inputTokens`, `outputTokens`,
`cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`) to the `properties`
object in both copies of `event.schema.json`. The fields are not added to the
`required` array, preserving full backward compatibility. `additionalProperties: false`
is preserved in both files.

## Syntax Check Results

```
N/A — modified files are JSON schemas, not JS/CJS. node --check is not applicable.
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
```

**Note:** These 5 errors are pre-existing in the store and were present before
this task's changes (verified with `git stash` + re-run). They are caused by
earlier-phase event records written with null/missing required fields (a
separate issue). The schema changes introduced in T01 are purely additive and
do not cause these failures.

## Files Changed

| File | Change |
|---|---|
| `forge/schemas/event.schema.json` | Added 5 optional token fields to `properties` |
| `.forge/schemas/event.schema.json` | Mirror of the same change (local validation copy) |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD` in `properties` | ✅ Pass | Both copies updated |
| All five fields use `integer`/`number` type with `minimum: 0` | ✅ Pass | integers for token counts, number for cost |
| None of the five fields appear in `required` array | ✅ Pass | |
| `additionalProperties: false` preserved | ✅ Pass | |
| `.forge/schemas/event.schema.json` mirrors the change | ✅ Pass | |
| `validate-store --dry-run` exits 0 | ❌ Fail (pre-existing) | 5 errors pre-date this task; confirmed by stash test |

## Plugin Checklist

- [ ] Version bumped in `forge/.claude-plugin/plugin.json` (if material change) — **Deferred to T08**
- [ ] Migration entry added to `forge/migrations.json` (if material change) — **Deferred to T08**
- [ ] Security scan run and report committed (if `forge/` was modified) — **Deferred to T08**

## Knowledge Updates

None — schema structure already documented in `engineering/architecture/database.md`.

## Notes

- Version bump, migration, and security scan are intentionally deferred to T08 as
  documented in the plan's Plugin Impact Assessment.
- The pre-existing store validation failures should be investigated separately (likely
  from the orchestrator writing "start" events with null endTimestamp/durationMinutes
  before phases complete).
