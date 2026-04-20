# PROGRESS — FORGE-S12-T01: Calibrate baseline auto-initialization — remove dead end

*Forge Engineer*

**Task:** FORGE-S12-T01
**Sprint:** FORGE-S12

---

## Summary

Replaced the dead-end in `/forge:calibrate` Step 2 with auto-initialization logic that computes and writes the calibration baseline when absent from `.forge/config.json`. The algorithm mirrors init Phase 5/6-b exactly (hash MASTER_INDEX.md, list completed sprints, write baseline to config). Updated `/forge:health` to recommend `/forge:calibrate` instead of `/forge:init` for missing baselines. Version bumped to 0.22.0 with migration entry and security scan.

## Syntax Check Results

No JS/CJS files were modified. All changes are Markdown command files.

```
$ node forge/tools/validate-store.cjs --dry-run
Store validation passed (12 sprint(s), 85 task(s), 18 bug(s)).
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
Store validation passed (12 sprint(s), 85 task(s), 18 bug(s)).
```

## Files Changed

| File | Change |
|---|---|
| `forge/commands/calibrate.md` | Step 2: replaced dead-end exit with auto-initialization; renamed step title |
| `forge/commands/health.md` | Check 2: recommend `/forge:calibrate` instead of `/forge:init` for missing baseline |
| `forge/.claude-plugin/plugin.json` | Version bump: 0.21.0 -> 0.22.0 |
| `forge/migrations.json` | New migration entry: 0.21.0 -> 0.22.0, regenerate: ["commands"] |
| `forge/integrity.json` | Regenerated for v0.22.0 |
| `CHANGELOG.md` | Added 0.22.0 entry |
| `docs/security/scan-v0.22.0.md` | Security scan report: SAFE TO USE |
| `docs/security/index.md` | Added v0.22.0 scan row |
| `README.md` | Updated Security table with v0.22.0 row |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `/forge:calibrate` writes initial baseline when absent | 〇 Pass | Step 2 auto-init present in calibrate.md |
| `/forge:health` recommends calibration for missing baseline | 〇 Pass | health.md updated |
| No dead-end after `/forge:health` | 〇 Pass | Step 2 no longer exits early for missing baseline |
| Existing baselines unaffected | 〇 Pass | "If present" branch unchanged |
| `node --check` passes | 〇 Pass | No JS/CJS modified |
| All existing tests pass | 〇 Pass | 526 pass, 0 fail |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` (0.21.0 -> 0.22.0)
- [x] Migration entry added to `forge/migrations.json` (regenerate: ["commands"])
- [x] Security scan run and report committed (scan-v0.22.0.md: SAFE TO USE)

## Knowledge Updates

None required. No architecture or stack changes.

## Notes

The `preflight-gate.cjs` `resolveVerdictSources` function has a latent bug: it uses `taskRecord.path` (plugin source file) as the base for verdict artifact resolution, which causes gate failures for tasks whose `path` points to a plugin file. This should be addressed in a future sprint.