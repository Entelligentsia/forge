# FORGE-S09-T08: Close BUG-002/003 validate-store pre-existing errors

**Sprint:** FORGE-S09
**Estimate:** M
**Pipeline:** default

---

## Objective

Fix the 32 pre-existing validate-store errors in the dogfooding store that have been flagged
every sprint since S04. These are legacy data issues (missing fields, schema mismatches) that
need to be resolved by running the automated fix tool and manually correcting any remaining
data.

## Acceptance Criteria

1. `node forge/tools/validate-store.cjs --dry-run` reports 0 errors against the dogfooding
   store
2. No valid data is lost — only missing fields are backfilled
3. All 32 pre-existing errors are resolved

## Context

These errors are BUG-002 (referential integrity checks incomplete) and BUG-003 (missing data
migration for new required schema fields). They are dogfooding-store-only — no schema changes
and no version bump required.

**Process:**
1. Run `node forge/tools/validate-store.cjs --dry-run` to see current errors
2. Run `node forge/tools/validate-store.cjs --fix --dry-run` to preview fixes
3. Run `node forge/tools/validate-store.cjs --fix` to apply automated fixes
4. Manually correct any remaining data that automated fix cannot resolve
5. Verify with `node forge/tools/validate-store.cjs --dry-run` exits 0

## Plugin Artifacts Involved

- None — this task modifies data in `.forge/store/` only (dogfooding instance)
- `forge/tools/validate-store.cjs` is used but not modified

## Operational Impact

- **Version bump:** not required — no `forge/` code changes, data fix only
- **Regeneration:** no user action needed
- **Security scan:** not required — no `forge/` code changes