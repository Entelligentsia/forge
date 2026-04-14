# PLAN — FORGE-S06-T06: Add `path` field to sprint schema

🌱 *Forge Engineer*

**Task:** FORGE-S06-T06
**Sprint:** FORGE-S06
**Estimate:** S

---

## Objective

Add an optional `path` field to the sprint JSON schema, bringing parity with the task and bug schemas which already carry a required `path`. This enables slug-named sprint directories (downstream tasks T07, T08, T09) and consistent path handling across all store entities.

## Approach

1. Add `"path": { "type": "string" }` to `forge/schemas/sprint.schema.json` properties (not in `required` array -- additive, backward compatible).
2. Add the same `"path"` property to the embedded `SCHEMAS.sprint` in `forge/tools/validate-store.cjs`.
3. Add a non-fatal warning in validate-store: when a sprint record lacks `path`, emit a `WARN` line (distinct from `ERROR`) that does not increment `errorsCount`. This preserves backward compatibility with existing stores while signalling the deprecation.
4. Run syntax and store validation checks.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/schemas/sprint.schema.json` | Add `"path": { "type": "string" }` to properties | Canonical schema definition; brings parity with task/bug schemas |
| `forge/tools/validate-store.cjs` | Add `"path"` to embedded sprint schema properties; add `warn()` function and sprint-missing-path check | Embedded schema must stay in sync; warning (not error) preserves backward compat |

## Plugin Impact Assessment

- **Version bump required?** Yes -- schema change to `forge/schemas/sprint.schema.json` and `forge/tools/validate-store.cjs` is material.
- **Migration entry required?** Yes -- `regenerate: []` (schemas are embedded, not user-regenerated).
- **Security scan required?** Yes -- changes touch `forge/` files.
- **Schema change?** Yes -- `sprint.schema.json` gains a new optional property.

## Testing Strategy

- Syntax check: `node --check forge/tools/validate-store.cjs`
- Store validation: `node forge/tools/validate-store.cjs --dry-run`
- Manual verification: existing sprint records without `path` produce a WARN line but exit 0; sprint records with `path` produce no warning.

## Acceptance Criteria

- [ ] `forge/schemas/sprint.schema.json` includes `"path": { "type": "string" }` in properties
- [ ] `forge/schemas/sprint.schema.json` does NOT include `"path"` in the `required` array
- [ ] Embedded `SCHEMAS.sprint` in `forge/tools/validate-store.cjs` includes the `"path"` property
- [ ] `validate-store --dry-run` emits a `WARN` line for each sprint missing `path` but exits 0
- [ ] `validate-store --dry-run` does NOT emit an ERROR for sprints missing `path`
- [ ] `node --check forge/tools/validate-store.cjs` passes
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0

## Operational Impact

- **Distribution:** No user action required. Schemas are embedded in validate-store; `/forge:update` not needed for this change.
- **Backwards compatibility:** Fully backward compatible. `path` is optional; missing `path` produces a warning only, not an error. Existing sprint records continue to validate successfully.