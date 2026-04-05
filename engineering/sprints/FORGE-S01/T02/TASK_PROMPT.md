# FORGE-S01-T02: validate-store — handle new event token fields

**Sprint:** FORGE-S01
**Estimate:** S
**Pipeline:** default

---

## Objective

Update `validate-store.cjs` so that events with the new optional token fields
pass validation (correct types, minimum values) and events without them also pass.

## Acceptance Criteria

1. Events with valid token fields (integer ≥ 0 for token counts, number ≥ 0 for cost) pass
2. Events without any token fields pass (backward-compatible)
3. Events with invalid token fields (negative values, wrong types) fail with clear error messages
4. `node --check forge/tools/validate-store.cjs` exits 0
5. `node forge/tools/validate-store.cjs --dry-run` exits 0 against existing store

## Context

Depends on T01 (schema extension). The validator already reads the schema from
`.forge/schemas/event.schema.json` and validates types and minimums from schema
properties. The new optional fields should be handled by the existing generic
validation logic — verify this is the case and add any missing coverage.

## Plugin Artifacts Involved

- `forge/tools/validate-store.cjs` — the store integrity checker

## Operational Impact

- **Version bump:** Required (bundled with T08)
- **Regeneration:** Users must run `/forge:update-tools` to get the updated validator
- **Security scan:** Not required for this task alone
