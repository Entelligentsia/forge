# FORGE-S07-T01: Schema reconciliation — add goal and features to sprint.schema.json

**Sprint:** FORGE-S07
**Estimate:** S
**Pipeline:** default

---

## Objective

Make `forge/schemas/sprint.schema.json` the authoritative schema by adding the
two fields currently present in the embedded validate-store.cjs schema but absent
from the standalone file: `goal` (string) and `features` (array of strings).
This eliminates the schema drift documented in F4 and AC4 of the requirements.

## Acceptance Criteria

1. `forge/schemas/sprint.schema.json` declares `goal` as `{ "type": "string" }` under `properties`
2. `forge/schemas/sprint.schema.json` declares `features` as `{ "type": "array", "items": { "type": "string" } }` under `properties`
3. `additionalProperties: false` is still present and unchanged
4. `node --check forge/tools/validate-store.cjs` passes (no syntax errors introduced)
5. Running `node forge/tools/validate-store.cjs` against the dogfooding store exits with the same result as before (no new errors introduced by the schema change)

## Context

The requirements document (`docs/requirements/store-custodian.md`) section F4 and AC4
identify that the embedded sprint schema in `validate-store.cjs` has `goal` and `features`
fields that are absent from `forge/schemas/sprint.schema.json`. Since this sprint (FORGE-S07)
will make the standalone schemas the single source of truth (R2), the schemas must first
be reconciled before validate-store.cjs is refactored to read them.

The embedded schema in `validate-store.cjs` (around line 51–64) shows:
- `goal`: `{ "type": "string" }`
- `features`: `{ "type": "array", "items": { "type": "string" } }`

The `feature_id` field is already present in `forge/schemas/sprint.schema.json` — no
change needed for that field. Task schema already has `feature_id` — no task schema
change required.

## Plugin Artifacts Involved

- `forge/schemas/sprint.schema.json` — add `goal` and `features` to `properties`

## Operational Impact

- **Version bump:** Required — schema change affects all installed projects (included in T09 release task)
- **Regeneration:** None required (schema files are copied by `/forge:update-tools`, not regenerated)
- **Security scan:** Required (any change to `forge/` is scanned as part of T09)
