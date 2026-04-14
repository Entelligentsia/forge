# PROGRESS — FORGE-S06-T10: Release engineering — version bump, migration, security scan

🌱 *Forge Engineer*

**Task:** FORGE-S06-T10
**Sprint:** FORGE-S06

---

## Summary

Bumped Forge from `0.7.11` to `0.8.0`. Added migration entry keyed `"0.7.11"` to `forge/migrations.json` with `regenerate: ["workflows", "personas"]` to reflect the Sprint S06 changes (persona noun-based lookup, meta-workflow purification, forge:regenerate defaults, ghost event fix, breaking-change suppression, sprint path field, slug-aware directory discovery). Ran security scan of the source directory (`forge/`) and committed the full report to `docs/security/scan-v0.8.0.md`. Updated the README security table with the new row.

## Syntax Check Results

No `.js`/`.cjs` files were modified in this task — only `plugin.json`, `migrations.json`, `docs/security/scan-v0.8.0.md`, and `README.md`. Syntax check is not applicable.

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
[... 109 pre-existing errors from S04/S05 and early S06 events with missing required fields ...]
109 error(s) found.
```

Note: These 109 errors are all pre-existing — they originate from S04/S05 events created before the event schema required `endTimestamp`, `durationMinutes`, and `model` fields, plus an early S06-T02 start event. None are introduced by this task. This task modified only `plugin.json`, `migrations.json`, `docs/security/scan-v0.8.0.md`, and `README.md` — none of which affect store validation. The pre-existing errors are tracked under BUG-004 and will be resolved via `validate-store --fix` in a separate task.

## Files Changed

| File | Change |
|---|---|
| `forge/.claude-plugin/plugin.json` | Bumped `"version"` from `"0.7.11"` to `"0.8.0"` |
| `forge/migrations.json` | Added migration entry keyed `"0.7.11"` → `"0.8.0"` with `regenerate: ["workflows", "personas"]` |
| `docs/security/scan-v0.8.0.md` | Created — full security scan report for v0.8.0 |
| `README.md` | Added row for v0.8.0 to the Security Scan History table |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `forge/.claude-plugin/plugin.json` version = `"0.8.0"` | 〇 Pass | Verified |
| `forge/migrations.json` has key `"0.7.11"` with `"version": "0.8.0"` | 〇 Pass | Added at top of file |
| `migrations.json` entry has `"regenerate": ["workflows", "personas"]` | 〇 Pass | Verified |
| `migrations.json` entry has `"breaking": false, "manual": []` | 〇 Pass | Verified |
| `docs/security/scan-v0.8.0.md` exists with full scan report | 〇 Pass | 102 files scanned, 0 critical |
| README security table has row for v0.8.0 | 〇 Pass | Added above 0.7.11 row |
| `node forge/tools/validate-store.cjs --dry-run` exits 0 | — N/A | Pre-existing errors unrelated to this task; no schema files modified |
| All modified files end with trailing newline | 〇 Pass | All files verified |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` — `0.7.11` → `0.8.0`
- [x] Migration entry added to `forge/migrations.json` — key `"0.7.11"`, version `"0.8.0"`, regenerate `["workflows", "personas"]`
- [x] Security scan run and report committed — `docs/security/scan-v0.8.0.md`

## Knowledge Updates

None. This is a pure release-engineering task — no architectural discoveries.

## Notes

The migration entry correctly uses `"0.7.11"` as the key (not `"0.7.2"` as stated in the original task prompt, which was written before the sprint began). The plan correctly identified this and documented the reason: each T01–T09 task carried its own version bump and migration entry, advancing the version to `0.7.11` before T10 ran.

The security scan was performed against the source directory (`forge/`) per `--source-path forge/` instruction. The scan found 0 critical issues and 2 pre-existing accepted warnings (version-check HTTPS call to GitHub and the config sync write).
