# PROGRESS — FORGE-S07-T09: Release engineering — version bump to 0.9.0, migration entry, security scan

*Forge Engineer*

**Task:** FORGE-S07-T09
**Sprint:** FORGE-S07

---

## Summary

Bumped plugin version from 0.8.10 to 0.9.0 in plugin.json. Added migration entry
with key "0.8.10" to migrations.json specifying regenerate targets of workflows,
skills, and tools. Ran full security scan against the forge/ source directory —
0 critical findings, 5 info (all safe). Saved scan report and updated README
security table.

## Syntax Check Results

No JS/CJS files were modified in this task. JSON validation performed instead:

```
$ node -e "JSON.parse(require('fs').readFileSync('forge/.claude-plugin/plugin.json'))"
(no output — valid JSON)

$ node -e "JSON.parse(require('fs').readFileSync('forge/migrations.json'))"
(no output — valid JSON)
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
Store validation passed (7 sprint(s), 54 task(s), 14 bug(s)).
```

## Files Changed

| File | Change |
|---|---|
| `forge/.claude-plugin/plugin.json` | version: "0.8.10" -> "0.9.0" |
| `forge/migrations.json` | Added "0.8.10" entry pointing to version "0.9.0" |
| `docs/security/scan-v0.9.0.md` | New file — full security scan report |
| `README.md` | Added v0.9.0 row to Security Scan History table |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `plugin.json` version is "0.9.0" | Pass | Verified |
| `migrations.json` has "0.8.10" entry with correct fields | Pass | version, date, notes, regenerate, breaking, manual all present |
| Security scan run against forge/ source directory | Pass | 105 files scanned, 0 critical |
| Full scan report saved to docs/security/scan-v0.9.0.md | Pass | Saved with full findings detail |
| README.md security table has v0.9.0 row | Pass | Added as first row in table |
| validate-store --dry-run exits 0 | Pass | 7 sprints, 54 tasks, 14 bugs — all valid |
| Both modified JSON files parse as valid JSON | Pass | Confirmed via JSON.parse |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` (0.8.10 -> 0.9.0)
- [x] Migration entry added to `forge/migrations.json` (regenerate: ["workflows", "skills", "tools"])
- [x] Security scan run and report committed (docs/security/scan-v0.9.0.md)

## Knowledge Updates

None — no undocumented patterns discovered.

## Notes

- The migration entry `regenerate: ["workflows", "skills", "tools"]` reflects
  the full Store Custodian architectural change: workflows updated for custodian
  (T07), skills updated with new store-custodian skill (T06), tools updated with
  new CLI and facade gap closures (T02-T05).
- Security scan found 0 critical issues, 2 carry-forward warnings (check-update.js
  HTTPS call and long update.md file), and 5 informational findings (new
  store-cli.cjs, purgeEvents traversal guard, store-custodian skill, sidecar
  unlink, all verified safe).