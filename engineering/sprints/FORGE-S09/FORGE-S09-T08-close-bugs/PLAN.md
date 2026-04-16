# PLAN — FORGE-S09-T08: Close BUG-002/003 validate-store pre-existing errors

**Forge Engineer**

**Task:** FORGE-S09-T08
**Sprint:** FORGE-S09
**Estimate:** M

---

## Objective

Bring the dogfooding store to zero validate-store errors by (1) updating stale installed schemas to match plugin source, (2) running the automated `--fix` backfill, and (3) manually removing undeclared fields from legacy event records that the fix tool cannot handle.

## Root Cause Analysis

The 93 errors fall into three categories:

### Category 1: Stale installed sprint schema (9 errors)

The dogfooding project's `.forge/schemas/sprint.schema.json` is outdated compared to the plugin source `forge/schemas/sprint.schema.json`. The source schema added `path`, `goal`, and `features` fields, but the installed copy was never regenerated. Since `additionalProperties: false`, every sprint record's `path` field triggers "undeclared field" errors.

**Fix:** Copy source schemas to `.forge/schemas/` (equivalent to running `/forge:update`). This is a dogfooding-instance data fix, not a plugin schema change.

### Category 2: Missing required fields in event records (backfillable, ~54 errors)

Many legacy events across S01--S09 are missing `endTimestamp`, `durationMinutes`, `model`, `iteration`, or other required fields. Some events (S02-T05) have `eventId: "temp"` placeholder values.

**Fix:** `node forge/tools/validate-store.cjs --fix` backfills all missing required fields and resolves `eventId` mismatches.

### Category 3: Undeclared fields in FORGE-S09 legacy events (~30 remaining errors after --fix)

The `--fix` tool can add missing fields but cannot remove undeclared ones. The following FORGE-S09 event files contain legacy field names that must be manually removed:

| File | Undeclared fields to remove | Missing fields to add |
|---|---|---|
| `sprint-start.json` | `event`, `timestamp`, `tasksToRun` | `taskId: null` |
| `20260416T020000000Z_FORGE-S09_sprint-start.json` | `eventType`, `timestamp`, `taskCount`, `skippedCommitted`, `executionOrder` | `taskId: null` |
| `20260416T020100000Z_FORGE-S09-T03_task-dispatch.json` | `eventType`, `timestamp` | (none -- backfill handles) |
| `20260416T021000000Z_FORGE-S09-T04_task-dispatch.json` | `eventType`, `timestamp` | (none) |
| `20260416T022000000Z_FORGE-S09-T05_task-dispatch.json` | `eventType`, `timestamp` | (none) |
| `20260416T023000000Z_FORGE-S09-T07_task-dispatch.json` | `eventType`, `timestamp` | (none) |
| `20260416T024000000Z_FORGE-S09-T08_task-dispatch.json` | `eventType`, `timestamp` | (none) |
| `plan-sprint-plan.json` (renamed to `FORGE-S09-E001.json`) | `timestamp` | (none) |

**Fix:** Edit each file to remove undeclared fields and add missing `taskId: null` for sprint-level events.

## Approach

1. **Update installed schemas** -- Copy `forge/schemas/*.schema.json` to `.forge/schemas/` to bring installed schemas up to date with plugin source. This resolves 9 sprint "path" errors.
2. **Run automated fix** -- `node forge/tools/validate-store.cjs --fix` to backfill all missing required fields in event records and resolve eventId mismatches.
3. **Manually clean legacy event fields** -- Edit each FORGE-S09 legacy event file listed above to remove undeclared fields and add missing `taskId: null`.
4. **Verify** -- `node forge/tools/validate-store.cjs --dry-run` exits 0.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `.forge/schemas/sprint.schema.json` | Replace with source from `forge/schemas/` | Adds `path`, `goal`, `features` to match plugin source |
| `.forge/schemas/task.schema.json` | Replace with source from `forge/schemas/` | Sync property order with source |
| `.forge/store/events/FORGE-S09/sprint-start.json` | Remove `event`, `timestamp`, `tasksToRun`; add `taskId: null` | Undeclared fields + missing nullable FK |
| `.forge/store/events/FORGE-S09/20260416T020000000Z_FORGE-S09_sprint-start.json` | Remove `eventType`, `timestamp`, `taskCount`, `skippedCommitted`, `executionOrder`; add `taskId: null` | Undeclared fields + missing nullable FK |
| `.forge/store/events/FORGE-S09/20260416T020100000Z_FORGE-S09-T03_task-dispatch.json` | Remove `eventType`, `timestamp` | Undeclared legacy field names |
| `.forge/store/events/FORGE-S09/20260416T021000000Z_FORGE-S09-T04_task-dispatch.json` | Remove `eventType`, `timestamp` | Same |
| `.forge/store/events/FORGE-S09/20260416T022000000Z_FORGE-S09-T05_task-dispatch.json` | Remove `eventType`, `timestamp` | Same |
| `.forge/store/events/FORGE-S09/20260416T023000000Z_FORGE-S09-T07_task-dispatch.json` | Remove `eventType`, `timestamp` | Same |
| `.forge/store/events/FORGE-S09/20260416T024000000Z_FORGE-S09-T08_task-dispatch.json` | Remove `eventType`, `timestamp` | Same |
| `.forge/store/events/FORGE-S09/plan-sprint-plan.json` | Remove `timestamp` | Undeclared legacy field |
| Multiple event files across S01-S08 | Backfilled by `--fix` | Missing required fields auto-filled |

## Plugin Impact Assessment

- **Version bump required?** No -- no changes to `forge/` directory. All modifications are to the dogfooding instance (`.forge/store/`, `.forge/schemas/` installed copy).
- **Migration entry required?** No -- no plugin code changes.
- **Security scan required?** No -- no `forge/` code changes.
- **Schema change?** No -- the sprint schema already has `path` in the plugin source. We are updating the installed copy to match.

## Testing Strategy

- Syntax check: N/A -- no JS/CJS files modified
- Store validation: `node forge/tools/validate-store.cjs --dry-run` must exit 0 with 0 errors
- Manual smoke test: Run `--fix --dry-run` first to preview, then `--fix` to apply

## Acceptance Criteria

- [ ] `node forge/tools/validate-store.cjs --dry-run` reports 0 errors
- [ ] No valid data is lost -- only missing fields are backfilled and undeclared legacy fields are removed
- [ ] All 93 pre-existing errors are resolved
- [ ] Installed schemas match plugin source schemas
- [ ] Sprint-level events have `taskId: null` (valid nullable FK)

## Operational Impact

- **Distribution:** No user action needed -- this is a dogfooding-instance-only fix.
- **Backwards compatibility:** Fully preserved -- no plugin code or schema structure changes.