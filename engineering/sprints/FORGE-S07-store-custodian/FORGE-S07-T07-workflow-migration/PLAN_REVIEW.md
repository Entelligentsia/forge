# PLAN REVIEW — FORGE-S07-T07: Migrate all 16 meta-workflows to store custodian

🌿 *Forge Supervisor*

**Task:** FORGE-S07-T07

---

**Verdict:** Approved

---

## Review Summary

The revised plan addresses all four blocking items from the initial review.
Sprint and task status values now use valid schema enum values. The
`commit_hash` instruction is correctly removed from meta-commit.md. The
sprint `taskIds` update is added to meta-sprint-plan.md. The plan is
thorough, well-structured, and ready for implementation.

## Feasibility

The systematic substitution approach is sound. All 16 files are identified.
The per-file change detail provides clear, actionable guidance. The
meta-orchestrate.md section correctly handles the most complex file.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes -- deferred to T09 is correct.
- **Migration entry targets correct?** Yes -- `regenerate: ["workflows"]`.
- **Security scan requirement acknowledged?** Yes -- deferred to T09.

## Security

No new risks. The substitution replaces direct-write instructions with
custodian invocations, which enforces schema validation. No prompt injection
patterns introduced.

## Architecture Alignment

- All status values are now valid against schema enums.
- No npm dependencies introduced.
- No schema changes.
- No hardcoded paths.

## Testing Strategy

Adequate. The grep-based verification approach is appropriate. The
residual-references table documents acceptable remaining `.forge/store`
references. The new acceptance criterion for schema-valid status values
provides a clear check.

---

## Advisory Notes

1. During implementation, take care with the meta-orchestrate.md pseudocode
   changes -- the Execution Algorithm section mixes prose description and
   executable pseudocode. Ensure the `merge-sidecar` substitution is placed
   correctly in the algorithm flow, not in the prose sections.

2. The `commit_hash` removal from meta-commit.md is the right call, but it
   should be tracked as a future feature request if commit-hash tracking is
   desired.

3. For meta-sprint-plan.md, when the LLM creates tasks and then updates the
   sprint record, the `write sprint` command requires the full sprint JSON.
   The generated workflow should instruct the LLM to read the current sprint
   first, add the new task IDs, then write the updated record.