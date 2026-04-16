# PLAN — FORGE-S07-T01: Schema reconciliation — add goal and features to sprint.schema.json

**Task:** FORGE-S07-T01
**Sprint:** FORGE-S07
**Estimate:** S

---

## Objective

Add the two fields (`goal` and `features`) present in validate-store.cjs's embedded
sprint schema but absent from the standalone `forge/schemas/sprint.schema.json`. This
eliminates the schema drift identified in requirements F4/AC4 and makes the standalone
schema the authoritative definition ahead of T04 (which removes the embedded copies).

## Approach

Add `goal` (string) and `features` (array of strings) to the `properties` block of
`forge/schemas/sprint.schema.json`. The `additionalProperties: false` constraint
remains unchanged. No `required` list change is needed since both fields are optional
in the embedded schema and in actual store data.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/schemas/sprint.schema.json` | Add `goal` and `features` to `properties` | Eliminates drift with embedded schema in validate-store.cjs |

## Plugin Impact Assessment

- **Version bump required?** Yes — schema change affects all installed projects. The version bump is deferred to T09 (release engineering task) which batches all sprint changes into a single 0.9.0 bump.
- **Migration entry required?** Yes — will be created in T09 with `regenerate: []` (schemas are copied by `/forge:update-tools`, not regenerated). The migration notes will mention the new schema fields.
- **Security scan required?** Yes — any change to `forge/` requires a scan. Deferred to T09 which runs the scan at release time.
- **Schema change?** Yes — `sprint.schema.json` gains two new optional properties.

## Testing Strategy

- Syntax check: not applicable (no JS/CJS files modified)
- Store validation: `node forge/tools/validate-store.cjs --dry-run` — must exit with the same result as before (1 error, 2 warnings — the existing error is unrelated to sprint schema)
- Manual verification: compare `forge/schemas/sprint.schema.json` properties against the embedded sprint schema in `validate-store.cjs` (lines 44-64) to confirm all fields now match

## Acceptance Criteria

- [ ] `forge/schemas/sprint.schema.json` declares `goal` as `{ "type": "string" }` under `properties`
- [ ] `forge/schemas/sprint.schema.json` declares `features` as `{ "type": "array", "items": { "type": "string" } }` under `properties`
- [ ] `additionalProperties: false` is still present and unchanged
- [ ] `node forge/tools/validate-store.cjs` exits with the same result as before (no new errors introduced)
- [ ] The `required` array is unchanged (goal and features remain optional)

## Operational Impact

- **Distribution:** No immediate user action required. The standalone schema is not read by any runtime tool yet (validate-store.cjs still uses embedded copies). When T04 refactors validate-store.cjs to read from `.forge/schemas/`, users will need to run `/forge:update-tools` to copy the updated schemas.
- **Backwards compatibility:** Fully preserved. Both new fields are optional. Existing sprint records without `goal` or `features` will validate correctly.