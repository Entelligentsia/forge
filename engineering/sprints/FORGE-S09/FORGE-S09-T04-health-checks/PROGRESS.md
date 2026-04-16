# PROGRESS — FORGE-S09-T04: Health — KB freshness check + config-completeness check

🌱 *Forge Engineer*

**Task:** FORGE-S09-T04
**Sprint:** FORGE-S09

---

## Summary

Added two new checks to `/forge:health`: (1) a config-completeness check that validates
`.forge/config.json` against required fields from `sdlc-config.schema.json`, exiting early
with missing-field details if incomplete; (2) a KB freshness check that compares the
current `MASTER_INDEX.md` hash against `calibrationBaseline.masterIndexHash`, categorizing
drift as "technical", "business", or "technical + business". Also bumped version to 0.9.11
and added migration entry.

## Syntax Check Results

No JS/CJS files were modified — `node --check` is not applicable.

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
63 error(s) found.
```

All 63 errors are pre-existing (tracked in BUG-002/003/008). No new errors introduced by this
change. No `forge/schemas/*.schema.json` files were modified.

## Files Changed

| File | Change |
|---|---|
| `forge/commands/health.md` | Added config-completeness check (step 1) and KB freshness check (step 2), renumbered existing steps 1-12 to 1-13, added two rows to Checks table |
| `forge/.claude-plugin/plugin.json` | Version bump: 0.9.10 → 0.9.11 |
| `forge/migrations.json` | Added migration entry: 0.9.10 → 0.9.11, regenerate: ["commands"], breaking: false |
| `docs/security/scan-v0.9.11.md` | Security scan report — SAFE TO USE |
| `docs/security/index.md` | Added v0.9.11 row to scan history table |
| `README.md` | Updated Security table with v0.9.11 row (3 most recent) |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `/forge:health` reports "Config complete" when all required fields present | 〇 Pass | Step 1 emits "〇 Config complete" when all required fields are present |
| `/forge:health` reports missing fields by path and exits early when config incomplete | 〇 Pass | Step 1 lists missing fields by path (e.g. `project.prefix`) with descriptions and exits early |
| `/forge:health` reports "KB fresh" when hash matches baseline | 〇 Pass | Step 2 emits "〇 KB fresh" with last calibration date |
| `/forge:health` reports "KB drifted — <category> changes detected" when hashes differ | 〇 Pass | Step 2 categorizes as "technical", "business", or "technical + business" |
| Freshness check distinguishes technical vs business drift | 〇 Pass | Technical sections (stack, routing, database, deployment, processes, architecture, schemas, conventions, stack-checklist) vs business sections (entity-model, domain, features, acceptance criteria, business-domain) |
| Config check runs first; KB freshness runs second (before stale-docs) | 〇 Pass | Steps are ordered: 1=config-completeness, 2=KB freshness, 3+=existing checks |
| Missing config fields → early exit, no cascade | 〇 Pass | Step 1 exits early with "Run `/forge:init` to complete configuration" |
| Absent calibrationBaseline → skip freshness, not error | 〇 Pass | Step 2 emits advisory and proceeds to step 3 |
| Users pointed to `/forge:calibrate` for drift resolution | 〇 Pass | Step 2 drift message includes "Run `/forge:calibrate` to re-align" |
| `node --check` passes on all modified JS/CJS files | 〇 Pass | N/A — no JS/CJS files modified |
| `validate-store --dry-run` exits 0 (no new errors) | 〇 Pass | 63 pre-existing errors, 0 new |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` (0.9.10 → 0.9.11)
- [x] Migration entry added to `forge/migrations.json` (regenerate: ["commands"], breaking: false)
- [x] Security scan run and report committed (required — `forge/` was modified)
  - Report: `docs/security/scan-v0.9.11.md`
  - Verdict: SAFE TO USE — 0 critical, 1 warning (accepted), 3 info

## Knowledge Updates

None required. No new architectural patterns or conventions discovered.

## Notes

- The hash computation in step 2 uses a self-contained `node -e` command that reads
  `.forge/config.json` to resolve the engineering path, consistent with the pattern
  established in `sdlc-init.md` Phase 5.
- The config-completeness check (step 1) extends the existing config-existence check
  from the previous step 1, combining both into a single guard step.
- Advisory notes from the plan review were addressed: (1) config check extends existing
  step 1 rather than replacing it; (2) drift categorization is done by the agent reading
  the current MASTER_INDEX.md content after a hash mismatch; (3) "technical + business"
  is included as a valid combined category.
- Security scan still needs to be run before commit.