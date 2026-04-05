# PROGRESS — BUG-002: validate-store referential integrity checks incomplete

**Task:** BUG-002
**Sprint:** N/A (bug fix)

---

## Summary

Fixed three referential integrity gaps in validate-store.cjs: (1) event `taskId` now checked against both task and bug ID sets, (2) virtual sprint directories (`events/bugs/`, `events/ops/`) accepted as valid sprintId values, (3) nullable foreign keys (`sprintId`, `taskId`) no longer rejected as "missing required field" when null.

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
| `forge/tools/validate-store.cjs` | Added `NULLABLE_FK` set; event taskId checked against bugIds; sprintId accepts parent dir name |
| `forge/meta/tool-specs/validate-store.spec.md` | Aligned fallback required list; documented nullable FK and virtual sprint dir rules |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| Event taskId checked against bugIds | ✅ Pass | |
| Virtual sprint dirs accepted | ✅ Pass | |
| Nullable FKs not rejected | ✅ Pass | |
| `node --check` passes | ✅ Pass | |
| `validate-store --dry-run` exits 0 | ✅ Pass | |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` (0.3.14)
- [x] Migration entry added to `forge/migrations.json`
- [ ] Security scan run and report committed

## Knowledge Updates

- Added 3 items to `engineering/stack-checklist.md` under Schema Changes
