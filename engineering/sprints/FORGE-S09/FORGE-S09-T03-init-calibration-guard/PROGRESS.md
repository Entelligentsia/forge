# PROGRESS — FORGE-S09-T03: Init — calibration baseline write + incomplete init guard

🌱 *Forge Engineer*

**Task:** FORGE-S09-T03
**Sprint:** FORGE-S09

---

## Summary

Added two new features to Phase 5 of `forge/init/sdlc-init.md`: (1) a completeness guard that
verifies all required config fields (per `sdlc-config.schema.json`) are present and non-empty before
proceeding, halting with a human-readable prompt if any are missing; (2) a calibration baseline
write that computes and writes `calibrationBaseline` into `.forge/config.json` after the guard
passes. Also bumped version to 0.9.10 and added migration entry.

## Syntax Check Results

No JS/CJS files were modified — `node --check` is not applicable.

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
53 error(s) found.
```

All 53 errors are pre-existing (tracked in BUG-002/003/008). No new errors introduced by this
change. No `forge/schemas/*.schema.json` files were modified.

## Files Changed

| File | Change |
|---|---|
| `forge/init/sdlc-init.md` | Added completeness guard + calibration baseline write at end of Phase 5, before init-progress.json write |
| `forge/.claude-plugin/plugin.json` | Version bump: 0.9.9 → 0.9.10 |
| `forge/migrations.json` | Added migration entry: 0.9.9 → 0.9.10, regenerate: [], breaking: false |
| `docs/security/scan-v0.9.10.md` | Security scan report — SAFE TO USE |
| `docs/security/index.md` | Added v0.9.10 row to scan history table |
| `README.md` | Updated Security table with v0.9.10 row (3 most recent) |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| Phase 5 completeness guard checks all required top-level and nested config fields | 〇 Pass | Top-level: version, project, stack, commands, paths. Nested: project.prefix, project.name, commands.test, paths.engineering/store/workflows/commands/templates |
| Guard halts with human-readable prompt listing missing fields | 〇 Pass | Displays field path + hint, does not write partial config |
| Phase 5 writes calibrationBaseline with lastCalibrated, version, masterIndexHash, sprintsCovered | 〇 Pass | All four fields written per schema |
| masterIndexHash strips blank lines and comment lines before hashing | 〇 Pass | Uses `l.trim()&&!l.trim().startsWith('<!--')` filter |
| sprintsCovered lists sprint IDs with status done or retrospective-done | 〇 Pass | Filters on `['done','retrospective-done']` |
| Calibration baseline uses node -e inline scripts (no new JS files, no npm deps) | 〇 Pass | Only `crypto` and `fs` built-ins used |
| No existing Phase 5 output removed or broken | 〇 Pass | Skill generation block preserved verbatim |
| `node --check` passes on all modified JS/CJS files | 〇 Pass | No JS/CJS files modified |
| `validate-store --dry-run` exits 0 (no new errors) | 〇 Pass | 53 pre-existing errors, 0 new |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` (0.9.9 → 0.9.10)
- [x] Migration entry added to `forge/migrations.json` (regenerate: [], breaking: false)
- [x] Security scan run and report committed (required — `forge/` was modified)
  - Report: `docs/security/scan-v0.9.10.md`
  - Verdict: SAFE TO USE — 0 critical, 1 warning (accepted), 3 info

## Knowledge Updates

None required. No new architectural patterns or conventions discovered.

## Notes

- The PLAN_REVIEW advisory note about `forge/migrations.json` and `forge/.claude-plugin/plugin.json`
  not being listed in the Files to Modify table was addressed — both files were updated.
- The PLAN correctly notes that `forge/commands/init.md` requires no changes since the new features
  are internal to Phase 5 and do not change the public phase count or phase names.