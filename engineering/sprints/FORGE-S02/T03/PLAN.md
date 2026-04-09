# PLAN — FORGE-S02-T03: JSON schemas

🌱 *Forge Engineer*

**Task:** FORGE-S02-T03
**Sprint:** FORGE-S02
**Estimate:** S

---

## Objective

Materialise the Feature entity as a machine-readable JSON Schema and extend the existing sprint and task schemas with an optional, nullable `feature_id` field.

## Approach

Create a new JSON schema for `feature` based on the requirements described in `forge/meta/store-schema/feature.schema.md`. Append the optional `feature_id` attribute to both `sprint.schema.json` and `task.schema.json` to allow referential link building downstream.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `.forge/schemas/feature.schema.json` | Create | Feature entity schema |
| `.forge/schemas/sprint.schema.json` | Modify | Add nullable feature_id |
| `.forge/schemas/task.schema.json` | Modify | Add nullable feature_id |

## Plugin Impact Assessment

- **Version bump required?** No — deferred to T10.
- **Migration entry required?** No — backwards compatible additive change.
- **Security scan required?** Yes — deferred to T10.
- **Schema change?** Yes — feature, sprint, and task schemas.

## Testing Strategy

- Syntax check: `node --check <modified files>`
- Store validation: `node forge/tools/validate-store.cjs --dry-run`

## Acceptance Criteria

- [x] .forge/schemas/feature.schema.json exists
- [x] .forge/schemas/sprint.schema.json gains feature_id
- [x] .forge/schemas/task.schema.json gains feature_id
- [x] node forge/tools/validate-store.cjs --dry-run exits 0

## Operational Impact

- **Distribution:** Users will need to run `/forge:update` at T10
- **Backwards compatibility:** Preserved, feature_id is additive and nullable
