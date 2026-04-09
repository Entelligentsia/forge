# FORGE-S02-T03: JSON schemas — add feature.schema.json; add nullable feature_id to sprint and task schemas

**Sprint:** FORGE-S02
**Estimate:** S
**Pipeline:** default

---

## Objective

Materialise the Feature entity as a machine-readable JSON Schema and extend
the existing sprint and task schemas with an optional, nullable `feature_id`
field. This unlocks the downstream tool work (T04 seed-store, T05
validate-store, T06 collate) and must land before any of them begin.

## Acceptance Criteria

1. `forge/schemas/feature.schema.json` exists, validating a Feature store record
   as described in `forge/meta/store-schema/feature.schema.md` (T02).
   Required fields: `id`, `title`, `status`, `created_at`.
   Optional fields: `description`, `requirements`, `sprints`, `tasks`, `updated_at`.
2. `forge/schemas/sprint.schema.json` gains `"feature_id": { "type": ["string", "null"] }`
   in its `properties` — **not** in `required`. `additionalProperties: false` is preserved.
3. `forge/schemas/task.schema.json` gains `"feature_id": { "type": ["string", "null"] }`
   in its `properties` — **not** in `required`. `additionalProperties: false` is preserved.
4. `node forge/tools/validate-store.cjs --dry-run` exits 0 against the existing
   store (no existing records reference `feature_id`, so they must pass).
5. `node --check` passes on any JS modified (none expected for this task — JSON only).

## Context

- Depends on T02 (`feature.schema.md`) being complete before writing the JSON Schema.
- The schema files in `forge/schemas/` are the machine-readable counterpart to
  the human-readable `forge/meta/store-schema/*.schema.md` files.
- Backwards-compatibility constraint: `feature_id` is additive and nullable.
  No existing required fields may be renamed, removed, or have their type changed.
- New feature store records will live at `.forge/store/features/FEAT-NNN.json`
  in target projects.

## Plugin Artifacts Involved

- **[NEW]** `forge/schemas/feature.schema.json`
- **[MODIFY]** `forge/schemas/sprint.schema.json` — add nullable `feature_id`
- **[MODIFY]** `forge/schemas/task.schema.json` — add nullable `feature_id`

## Operational Impact

- **Version bump:** Not required for this task — deferred to T10.
- **Regeneration:** Users will need to run `/forge:update` at T10 to receive
  the new schema files.
- **Security scan:** Required at T10 (covers all `forge/` changes).
