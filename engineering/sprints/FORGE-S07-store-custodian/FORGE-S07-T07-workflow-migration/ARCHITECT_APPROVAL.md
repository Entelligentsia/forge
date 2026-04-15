# Architect Approval — FORGE-S07-T07

🗻 *Forge Architect*

**Status:** Approved

## Distribution Notes

- Version bump deferred to T09 (Release Engineering). This is correct -- the
  16 meta-workflow changes are material (alter generated workflow behaviour),
  but T09 consolidates the version bump, migration entry, and security scan for
  the entire sprint.
- Migration entry will require `regenerate: ["workflows"]` so users receive the
  updated workflows after running `/forge:update`.
- No security scan report is needed for T07 specifically -- it will be
  generated in T09 covering all sprint changes.
- User-facing impact: after upgrading to the version that includes this change,
  generated workflows will instruct the LLM to use `/forge:store` for all store
  mutations instead of direct file writes. This is transparent to users -- the
  store mutations produce identical results.

## Operational Notes

- Users must run `/forge:update` after installing the new version to regenerate
  their `.forge/workflows/` from the updated meta-workflows.
- Three sprint status values were corrected to match the schema: `requirements-captured`
  is now `planning`, `planned` (sprint) is now `active`, `review-approved` (sprint)
  is now `completed`. Projects with existing store data using the old values may
  need to run `update-status --force` to correct them, but this is an existing
  inconsistency that the custodian now prevents from recurring.
- The `commit_hash` field was removed from meta-commit.md's store finalization
  step because the field does not exist in the task schema. This instruction
  was already producing invalid data; the custodian now enforces this correctly.

## Follow-Up Items

1. **`commit_hash` schema addition:** If commit-hash tracking is desired, the
   field should be added to `forge/schemas/task.schema.json` in a future sprint,
   after which the meta-commit.md can be updated to use `/forge:store write task`
   to record the hash.

2. **Read instruction migration:** Several meta-workflows still reference
   `.forge/store/` paths for read instructions (e.g., meta-orchestrate.md line 68,
   meta-collate.md line 24, meta-fix-bug.md line 41). These could be migrated to
   `/forge:store read` in a future task for consistency, but this is not required
   by the current acceptance criteria.