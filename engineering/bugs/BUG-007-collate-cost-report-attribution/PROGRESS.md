# PROGRESS — BUG-007: collate COST_REPORT.md path fallback + (unknown) attribution

🌱 *Forge Engineer*

**Task:** BUG-007
**Sprint:** bugs (virtual)

---

## Summary

Fixed two bugs in `forge/tools/collate.cjs`. Bug 1: `resolveDir` now performs a
numeric glob fallback when no candidate path exists on disk — extracts the first
integer from the last candidate and scans `base` for the first alphabetically-sorted
directory whose own first integer matches, covering sprint IDs like `S31` with no
hyphen and no `sprint.path` in the store. Bug 2: `loadSprintEvents` now backfills
`taskId`, `role`, and `action` from sidecar filenames when those fields are absent
in the parsed JSON, eliminating `(unknown)` rows in COST_REPORT.md Per-Task and
Per-Role tables. Version bumped to `0.6.12` with migration entry added.

## Syntax Check Results

```
$ node --check forge/tools/collate.cjs
(no output)
EXIT:0
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
Store validation passed (6 sprint(s), 21 task(s), 7 bug(s)).
EXIT:0
```

## Files Changed

| File | Change |
|---|---|
| `forge/tools/collate.cjs` | Replace `resolveDir` with numeric glob fallback version; replace `loadSprintEvents` with attribution-backfill version |
| `forge/.claude-plugin/plugin.json` | Bump `version` from `0.6.11` to `0.6.12` |
| `forge/migrations.json` | Add `"0.6.11"` → `"0.6.12"` migration entry |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `node --check forge/tools/collate.cjs` exits 0 | 〇 Pass | Clean, no output |
| `node forge/tools/validate-store.cjs --dry-run` exits 0 | 〇 Pass | 6 sprints, 21 tasks, 7 bugs |
| resolveDir numeric glob fallback implemented | 〇 Pass | Extracts first int, scans sorted dirs in base |
| loadSprintEvents attribution backfill implemented | 〇 Pass | USAGE_RE guard, only fills absent fields |
| Sidecar filenames not matching USAGE_RE silently skipped | 〇 Pass | Guard on regex test before split |
| `forge/.claude-plugin/plugin.json` version is `0.6.12` | 〇 Pass | |
| `forge/migrations.json` contains `"0.6.11"` → `"0.6.12"` entry | 〇 Pass | |
| Security scan saved to `docs/security/scan-v0.6.12.md` | △ Pending | Per plan, security scan is review-code phase responsibility |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` → `0.6.12`
- [x] Migration entry added to `forge/migrations.json` (`"0.6.11"` → `"0.6.12"`)
- [ ] Security scan — to be run in review-code phase: `/security-watchdog:scan-plugin forge:forge --source-path forge/`

## Knowledge Updates

No new architectural discoveries. Both fixes follow established patterns (exact-match
fallback chains, filename-encoded attribution) documented in the analysis.

## Notes

- The numeric glob fallback in `resolveDir` applies uniformly to all four call sites
  (COST_REPORT block, MASTER_INDEX sprint/task loop, task link fallback, bug loop) with
  no per-call-site changes.
- The attribution backfill in `loadSprintEvents` is strictly additive — existing
  well-formed events with `taskId`/`role` already set are never overwritten.
- Stub dirs created by previous broken runs must be cleaned up manually (same guidance
  as BUG-006).
- No schema changes; no workflow or command regeneration required.
