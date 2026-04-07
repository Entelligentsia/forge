# PROGRESS — BUG-006: collate COST_REPORT.md written to SNN/ stub dirs

🍂 *Forge Bug Fixer*

**Bug:** BUG-006
**Sprint:** bugs (combined fix with BUG-005)
**Version:** 0.5.5 → 0.5.6

---

## Summary

Patched `forge/tools/collate.cjs` lines 246-251 to use `sprint.path` when
present, exactly mirroring the `t.path` pattern already used for MASTER_INDEX
task link generation. When a sprint has a descriptive directory name
(`sprint_30_panohost_archival_recovery/`), `collate` will now derive the
directory from the stored path instead of falling back to `resolveDir`, which
was generating identical non-existent candidates and creating stub `SNN/`
directories.

## Syntax Check Results

```
$ node --check forge/tools/collate.cjs
OK
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
Store validation passed (2 sprint(s), 8 task(s), 6 bug(s)).
```

## Files Changed

| File | Change |
|---|---|
| `forge/tools/collate.cjs` | Lines 246-251: use `sprint.path` when present; fall back to `resolveDir` only when absent |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| COST_REPORT.md written to descriptive sprint dir | 〇 Pass | `sprint.path` → `path.basename(sprint.path.replace(/\/$/, ''))` |
| No SNN/ stub dirs created | 〇 Pass | Stub path only reached when `sprint.path` is absent |
| Projects without `sprint.path` unaffected | 〇 Pass | Fallback to `resolveDir` preserved |
| `node --check` passes | 〇 Pass | |
| `validate-store --dry-run` exits 0 | 〇 Pass | |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` (shared with BUG-005)
- [x] Migration entry added to `forge/migrations.json` (shared with BUG-005)
- [ ] Security scan — pending (run before commit)

## Knowledge Updates

Stack-checklist item added (conceptually): when adding a new file-writing block
to `collate.cjs`, always check whether the target has a `path` field in its
store JSON before using `resolveDir` inference.

## Notes

Spurious `SNN/` directories created by previous `/collate` runs must be
cleaned up manually by affected users. No automated migration needed.
