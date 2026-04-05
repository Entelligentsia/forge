# PROGRESS — FORGE-S01-T08: Version bump, migration entry, and security scan

**Task:** FORGE-S01-T08
**Sprint:** FORGE-S01

---

## Summary

Bumped `forge/.claude-plugin/plugin.json` from `0.3.15` to `0.4.0` and added the
corresponding migration entry `"0.3.15"` to `forge/migrations.json` with
`regenerate: ["tools", "workflows"]`, `breaking: false`. Created a placeholder
security scan report at `docs/security/scan-v0.4.0.md` and added a PENDING row to
the README.md Security table. All JS/CJS files under `forge/` pass `node --check`.

## IMPORTANT: Security Scan Required Before Commit

The security scan **must be run by the sprint runner** before this commit is pushed:

```
/security-watchdog:scan-plugin forge:forge --source-path forge/
```

If `--source-path` is not supported, instruct the skill to scan:
```
/home/boni/src/forge/forge/
```

After the scan completes:
1. Replace `docs/security/scan-v0.4.0.md` with the **full** scan report (no summary).
2. Update the README.md Security table row for `0.4.0` — replace "PENDING" with the
   actual summary line (e.g. "N files — 0 critical, X warnings (justified), SAFE TO USE").

## Syntax Check Results

```
$ find forge/ -name "*.js" -o -name "*.cjs" | xargs node --check
(no output — all files pass)
ALL PASS
```

No JS/CJS files were modified in this task. All pre-existing files pass syntax check.

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
39 error(s) found.
```

Pre-existing errors in `.forge/store/events/FORGE-S01/` for events written by prior
sprint tasks (T01–T07). These errors exist in the store before this task and are not
caused by any change made here. No schema files were modified in T08.

The errors are missing required fields (`model`, `role`, `phase`, `iteration`,
`startTimestamp`, `endTimestamp`, `durationMinutes`) in event JSON files written by
earlier engineer and architect agents in this sprint session. These are data quality
issues in the sprint store, not tool or schema bugs introduced by T08.

## Files Changed

| File | Change |
|---|---|
| `forge/.claude-plugin/plugin.json` | `version` bumped from `0.3.15` to `0.4.0` |
| `forge/migrations.json` | Added `"0.3.15"` migration entry → `0.4.0` |
| `docs/security/scan-v0.4.0.md` | Created placeholder — must be replaced with full scan report |
| `README.md` | Added PENDING row for v0.4.0 in Security Scan History table |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `forge/.claude-plugin/plugin.json` `version` is `"0.4.0"` | ✅ Pass | Verified |
| `forge/migrations.json` has key `"0.3.15"` with correct fields | ✅ Pass | Verified with `node -e JSON.parse` |
| Migration `regenerate: ["tools","workflows"]`, `breaking: false`, `manual: []` | ✅ Pass | |
| Security scan run against `forge/` source directory | ⚠️ Pending | Must be run by sprint runner before push |
| `docs/security/scan-v0.4.0.md` exists with full scan report | ⚠️ Pending | Placeholder exists; replace with actual report |
| `README.md` Security table has a row for `0.4.0` | ✅ Pass | Row added (PENDING status) |
| `node --check` passes on all modified JS/CJS files | ✅ Pass | No JS/CJS files modified; all `forge/` files pass |
| `node forge/tools/validate-store.cjs --dry-run` exits 0 | ❌ Pre-existing | 39 errors in sprint event store from prior tasks; not caused by T08 |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` (material change — sprint release)
- [x] Migration entry added to `forge/migrations.json` (material change — sprint release)
- [ ] Security scan run and report committed — **must be run by sprint runner before push**

## Knowledge Updates

No updates required. This task is purely administrative with no logic or schema changes.

## Notes

- The `validate-store --dry-run` failures are from prior sprint tasks that emitted
  event JSON files missing required fields. These predate T08 and are a data quality
  issue in the sprint's event store, not a regression from this task.
- The security scan placeholder row in README.md must be updated once the actual scan
  is complete. The sprint runner should not commit and push until the scan is done and
  the report is saved.
- Migration `notes` field summarises all T01–T07 changes for the FORGE-S01 sprint
  so users upgrading via `/forge:update` understand what `0.4.0` includes.
