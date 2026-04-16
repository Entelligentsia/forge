# PLAN REVIEW — FORGE-S07-T01: Schema reconciliation — add goal and features to sprint.schema.json

**Task:** FORGE-S07-T01

---

**Verdict:** Approved

---

## Review Summary

The plan is correctly scoped and addresses all five acceptance criteria from the
task prompt. The only file modified is `forge/schemas/sprint.schema.json`, adding
two optional properties (`goal`, `features`) that already exist in the embedded
schema in validate-store.cjs. Version bump and security scan deferral to T09 is
explicitly authorized by the task prompt.

## Feasibility

The approach is straightforward: add two optional properties to an existing JSON
Schema file. No code changes, no new files, no behavioral changes. The single
file targeted is correct — `forge/schemas/sprint.schema.json` is the only file
that needs reconciliation. The task prompt explicitly confirms no task schema
change is required (feature_id already present).

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — schema change is material. Deferral
  to T09 is authorized by the task prompt's operational impact section.
- **Migration entry targets correct?** N/A — deferred to T09. Plan correctly notes
  `regenerate: []` (schemas are copied by `/forge:update-tools`, not regenerated).
- **Security scan requirement acknowledged?** Yes — deferred to T09 as authorized
  by the task prompt.

## Security

No new security risks. The change adds two optional fields to a JSON Schema file.
No Markdown content, no hooks, no tools, no external calls. The security scan
deferred to T09 is acceptable per the task prompt.

## Architecture Alignment

- Follows existing patterns: JSON Schema file modification only.
- `additionalProperties: false` is explicitly preserved in the plan.
- No hardcoded paths (not applicable — only a schema file).
- No npm dependencies introduced.

## Testing Strategy

Adequate for the change type:
- Syntax check: correctly noted as not applicable (no JS/CJS files modified)
- `validate-store --dry-run` included to confirm no regression
- Manual comparison against embedded schema mentioned

The plan could be slightly improved by noting the exact expected validate-store
output (1 error on existing event, 2 warnings on non-existent paths) to give
the implementation phase a precise pass/fail baseline, but this is advisory.

---

## If Approved

### Advisory Notes

1. **Property placement:** When adding `goal` and `features`, consider placing
   them in a logical position (e.g., `goal` near `title`/`description`, `features`
   near `feature_id`) rather than appending at the end. JSON Schema does not
   care about property order, but human readability benefits from logical grouping.

2. **Baseline capture:** Before implementation, capture the exact `validate-store
   --dry-run` output. The current baseline is 1 error (missing `iteration` on
   FORGE-S07/EVT-S07-PLAN-001) and 2 warnings (non-existent paths for T05/T06).
   After the schema change, the error and warning counts must be identical.