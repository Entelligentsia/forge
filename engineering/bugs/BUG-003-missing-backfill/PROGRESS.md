# PROGRESS — BUG-003: forge:update missing data migration for new required schema fields

**Task:** BUG-003
**Sprint:** N/A (bug fix)

---

## Summary

Extended validate-store.cjs `--fix` mode to backfill missing required fields on pre-existing store records: `sprint.createdAt` derived from `completedAt`/`startDate`/`endDate` or current timestamp, `bug.reportedAt` derived from `resolvedAt` or current timestamp. Event fields (`phase`, `iteration`, `model`) confirmed already optional in schema — no backfill needed. Updated spec fallback required list to match schema reality.

## Syntax Check Results

```
$ node --check forge/tools/validate-store.cjs
(clean)
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
Store validation passed (0 sprint(s), 0 task(s), 1 bug(s)).
```

## Files Changed

| File | Change |
|---|---|
| `forge/tools/validate-store.cjs` | Added `BACKFILL` rules and `backfillRecord()` function; wired into sprint/bug loops |
| `forge/meta/tool-specs/validate-store.spec.md` | Removed `taskId`, `phase`, `iteration` from event fallback required list |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `--fix` backfills sprint.createdAt | ✅ Pass | |
| `--fix` backfills bug.reportedAt | ✅ Pass | |
| Event fields remain optional | ✅ Pass | Schema does not require them |
| Spec fallback list matches schema | ✅ Pass | |
| `node --check` passes | ✅ Pass | |
| `validate-store --dry-run` exits 0 | ✅ Pass | |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` (0.3.14)
- [x] Migration entry added to `forge/migrations.json`
- [ ] Security scan run and report committed

## Knowledge Updates

- Added backfill checklist item to `engineering/stack-checklist.md` under Schema Changes
