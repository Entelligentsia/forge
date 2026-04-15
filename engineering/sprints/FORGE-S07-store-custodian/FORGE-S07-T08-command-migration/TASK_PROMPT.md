# FORGE-S07-T08: Update migrate.md command — replace direct store writes with custodian references

**Sprint:** FORGE-S07
**Estimate:** S
**Pipeline:** default

---

## Objective

Update `forge/commands/migrate.md` to replace any instructions that tell the LLM
to read and write store JSON files directly (via Read/Write/Edit tools) with
instructions to use the store custodian skill (`/forge:store write <entity>`) for
each migrated record write.

## Acceptance Criteria

1. `forge/commands/migrate.md` is updated so that the migration write step reads:
   "Apply each migration via `/forge:store write <entity> '{updated-json}'`"
   instead of "Read JSON, apply mapping, write file back with JSON.stringify"
2. The read step (reading the existing store files to determine what needs migrating)
   may still use Read tool or `/forge:store read` — either is acceptable
3. `grep '.forge/store' forge/commands/migrate.md` returns zero direct write-path
   instructions after the change
4. The command still reads as a clear, step-by-step migration guide

## Context

Requirements R6, AC1. See `docs/requirements/store-custodian.md` Section R6,
"Command changes" table.

Note: `update.md` is explicitly OUT OF SCOPE — it writes `.forge/update-check-cache.json`
which is outside `.forge/store/` and not subject to the custodian.

## Plugin Artifacts Involved

- `forge/commands/migrate.md` — update migration write instructions

## Operational Impact

- **Version bump:** Required (included in T09)
- **Regeneration:** `commands` — users must run `/forge:update` to get the updated
  migrate command
- **Security scan:** Required (included in T09)
