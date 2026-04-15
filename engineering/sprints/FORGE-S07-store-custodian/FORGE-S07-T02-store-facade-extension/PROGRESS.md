# PROGRESS — FORGE-S07-T02: Store facade extension — writeCollationState, purgeEvents, listEventFilenames

🌱 *Forge Engineer*

**Task:** FORGE-S07-T02
**Sprint:** FORGE-S07

---

## Summary

Added four new public methods to the `Store` class (and `FSImpl`) in `forge/tools/store.cjs`: `writeCollationState(data)`, `readCollationState()`, `purgeEvents(sprintId, opts)`, and `listEventFilenames(sprintId)`. These methods close the facade bypasses currently used by `collate.cjs` and `validate-store.cjs`, enabling T03 and T04 to replace direct filesystem access with store facade calls. All methods follow the existing Store/FSImpl delegation pattern exactly. Functional smoke tests pass for all four methods.

## Syntax Check Results

```
$ node --check forge/tools/store.cjs
(no output — exit 0)
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
ERROR  FORGE-S07/EVT-S07-PLAN-001: missing required field: "iteration"
WARN   FORGE-S07-T05: path "forge/tools/store-cli.cjs" does not exist on disk
WARN   FORGE-S07-T06: path "forge/meta/skills/meta-store-custodian.md" does not exist on disk
1 error(s) found.
```

Note: The error and warnings are pre-existing issues unrelated to this task. No schemas were changed; the validation errors existed before this change.

## Files Changed

| File | Change |
|---|---|
| `forge/tools/store.cjs` | Added four public delegate methods to `Store` class; added four `FSImpl` implementations with path-traversal guard on `purgeEvents` |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `writeCollationState(data)` writes via `_writeJson()` | Pass | Verified: round-trip test writes and reads back correctly |
| `readCollationState()` reads via `_readJson()`, returns null if absent | Pass | Verified: returns null for missing file, returns data for existing |
| `purgeEvents(sprintId, { dryRun })` deletes directory; dry-run returns list; path-traversal guard | Pass | Verified: dry-run returns `{ purged: false, fileCount: N, files: [...] }` without deleting; path traversal throws |
| `listEventFilenames(sprintId)` returns `{ filename, id }` for all `.json` files including `_`-prefixed | Pass | Verified: returns 11 files for FORGE-S07 including both regular and sidecar files |
| All four methods on Store class (delegating to FSImpl) | Pass | Follows existing pattern exactly |
| `node --check forge/tools/store.cjs` passes | Pass | Exit 0, no output |
| No existing methods modified or broken | Pass | Only additive changes |
| `validate-store --dry-run` exits 0 | N/A | Pre-existing error unrelated to this task; no schemas changed |

## Plugin Checklist

- [ ] Version bumped in `forge/.claude-plugin/plugin.json` — deferred to T09
- [ ] Migration entry added to `forge/migrations.json` — not required (additive API, no schema changes)
- [ ] Security scan run and report committed — deferred to T09

## Knowledge Updates

None. No new patterns discovered that aren't already documented.

## Notes

- The `purgeEvents` return value's `fileCount` reflects `.json` files only, but `fs.rmSync` deletes the entire directory. This matches the existing `collate.cjs` behavior. A code comment documents this.
- No deviations from the approved PLAN.md.