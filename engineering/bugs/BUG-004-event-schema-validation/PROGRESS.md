# PROGRESS — BUG-004: validate-store rejects valid null timing fields and has no event backfill

🍂 *Forge Bug Fixer*

**Task:** BUG-004
**Sprint:** N/A (bug fix)

---

## Summary

Two root causes produced 41 validate-store errors on FORGE-S01 events:

1. **Null timing fields on start events** — `plan_start` and `review-plan_start` events legitimately have `endTimestamp: null` and `durationMinutes: null` (the phase was opened but closed elsewhere). The validator treated any `null` not in `NULLABLE_FK` as a missing required field.

2. **Pre-schema freeform commit/approve events** — 7 events written before schema stabilization used ad-hoc field names (`agent`, `actor`, `timestamp`, `status`) instead of the canonical schema fields. No `--fix` backfill existed for events.

Fixed by:
- Adding `endTimestamp` and `durationMinutes` to `NULLABLE_FK`
- Adding `BACKFILL.event` rules that derive missing fields from filename and sibling data
- Passing `file` to derive functions so `eventId` can be derived from filename
- Wiring `backfillRecord(file, rec, 'event')` into the events validation loop

## Syntax Check Results

```
$ node --check forge/tools/validate-store.cjs
(clean)
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
Store validation passed (2 sprint(s), 8 task(s), 3 bug(s)).
```

## Files Changed

| File | Change |
|---|---|
| `forge/tools/validate-store.cjs` | Extend `NULLABLE_FK`; add `BACKFILL.event`; pass `file` to derive functions; wire event backfill |
| `forge/.claude-plugin/plugin.json` | Bump to 0.5.5 |
| `forge/migrations.json` | Add migration entry for 0.5.4 → 0.5.5 |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `endTimestamp: null` on start events passes validation | 〇 Pass | In NULLABLE_FK |
| `durationMinutes: null` on start events passes validation | 〇 Pass | In NULLABLE_FK |
| `--fix` backfills missing `eventId` from filename | 〇 Pass | Verified on T08 |
| `--fix` backfills missing `role` from `agent` field | 〇 Pass | Verified on T04, T07 |
| `--fix` backfills `model` from `actor` when actor is a model ID | 〇 Pass | T05: `claude-haiku-4-5` |
| `--fix` backfills timing from `timestamp` when available | 〇 Pass | Verified on T02, T04, T05 |
| `node --check` passes | 〇 Pass | |
| `validate-store --dry-run` exits 0 after `--fix` | 〇 Pass | 0 errors |
| `--fix` writes JSON null (not string "null") | 〇 Pass | Verified in file output |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` (0.5.5)
- [x] Migration entry added to `forge/migrations.json`
- [ ] Security scan run and report committed

## Knowledge Updates

None — the stack checklist already has the backfill rule from BUG-003.

## Notes

The `--fix` log message shows `backfilled "field" = "null"` for null-valued fields (template literal coerces null to string). The actual JSON written to file is `null` (JSON null), verified by inspection. A follow-up could improve the log format but it's cosmetic.
