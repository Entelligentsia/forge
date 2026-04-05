# Architect Approval — FORGE-S01-T01

**Status:** Approved

## Distribution Notes

- This is a schema-only change (no executable code modified). The five new optional
  fields are purely additive and do not alter any existing required fields or
  constraints.
- Version bump, migration entry, and security scan are correctly deferred to T08,
  which bundles all FORGE-S01 changes into a single release. This avoids unnecessary
  churn for users who would otherwise need to update multiple times within the sprint.
- Users will receive the updated schema via `/forge:update-tools` after the T08
  version bump. Until then, existing events remain valid and no user action is needed.
- The `additionalProperties: false` constraint is preserved, so validate-store will
  correctly reject malformed events while accepting both old (no token fields) and
  new (with token fields) event records.

## Follow-Up Items

- The five pre-existing validate-store errors (start events with null/missing
  `endTimestamp`, `durationMinutes`, and `model`) should be resolved by T03
  (orchestrator subagent self-reporting). If T03 does not fully address these,
  a bug should be filed.
- The modified `.forge/workflows/orchestrate_task.md` noted in the code review
  (advisory note 3) is not part of this task. It should be tracked and committed
  separately to avoid polluting the T01 changeset.
