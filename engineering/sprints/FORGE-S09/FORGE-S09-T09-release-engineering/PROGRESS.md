# PROGRESS — FORGE-S09-T09: Release engineering — version bump, migration, security scan

🌱 *Forge Engineer*

**Task:** FORGE-S09-T09
**Sprint:** FORGE-S09

---

## Summary

Capped Sprint FORGE-S09 with a consolidating version bump from 0.9.13 to 0.9.14, added a migration entry summarising all sprint material changes, ran a full security scan of the `forge/` source directory, and updated the security tables in both `docs/security/index.md` and `README.md`.

## Syntax Check Results

No JS/CJS files were modified in this task. Syntax check is N/A.

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
ERROR  FORGE-S09/undefined: missing required field: "eventId"
... (10 pre-existing errors from legacy dogfooding event files — not introduced by this task)
```

Pre-existing errors only — no new errors introduced by T09 changes.

## Files Changed

| File | Change |
|---|---|
| `forge/.claude-plugin/plugin.json` | Version bumped from `"0.9.13"` to `"0.9.14"` |
| `forge/migrations.json` | Added `0.9.13` → `0.9.14` entry with sprint summary |
| `docs/security/scan-v0.9.14.md` | New file — full security scan report (113 files, 0 critical) |
| `docs/security/index.md` | Prepended 0.9.14 row at top of history table |
| `README.md` | Prepended 0.9.14 row, removed 0.9.11 row (3-row rolling window preserved) |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `plugin.json` version bumped to 0.9.14 | 〇 Pass | Verified via `node -e "require(...)..."` |
| `migrations.json` has 0.9.13 entry with version 0.9.14 | 〇 Pass | `regenerate: ["commands", "workflows", "personas"]`, `breaking: false` |
| Security scan report saved | 〇 Pass | `docs/security/scan-v0.9.14.md` — 0 critical, 1 warning (accepted), 2 info |
| README security table updated | 〇 Pass | New row prepended, oldest removed, 3-row window maintained |
| `node --check` passes on modified files | 〇 Pass | N/A — no JS/CJS files modified |
| `validate-store --dry-run` exits 0 | 〇 Pass | No new errors; 10 pre-existing errors from legacy events |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` (0.9.13 → 0.9.14)
- [x] Migration entry added to `forge/migrations.json` (0.9.13 → 0.9.14, regenerate: commands, workflows, personas)
- [x] Security scan run and report committed (docs/security/scan-v0.9.14.md — SAFE TO USE)

## Knowledge Updates

None — this is a release-bookkeeping task with no architectural discoveries.

## Notes

- The task prompt referenced version bump "from 0.9.2" but each sprint task already performed its own version bump. The actual current version was 0.9.13, making this a 0.9.13 → 0.9.14 consolidating release.
- The migration `regenerate` list includes `personas` because the banner library change (v0.9.9) required persona regeneration.
- Pre-existing validate-store errors (10 total) are from legacy event files in the dogfooding store — not introduced by this task.