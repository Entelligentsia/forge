# PLAN — FORGE-S01-T01: Event schema — add optional token fields

**Task:** FORGE-S01-T01
**Sprint:** FORGE-S01
**Estimate:** S

---

## Objective

Extend `forge/schemas/event.schema.json` to include five optional properties for
recording per-phase token consumption and estimated cost. The change is purely
additive — no existing required fields are touched and no existing event records
become invalid. This is the foundational schema change that all other FORGE-S01
tasks build on.

## Approach

The schema already uses `"additionalProperties": false`, which means we must
explicitly declare every property we want to permit. The five new fields
(`inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`,
`estimatedCostUSD`) are added to the `"properties"` object with appropriate types
and `minimum` constraints. They are intentionally **not** added to the `"required"`
array, preserving backward compatibility with all existing event records.

The mirrored copy at `.forge/schemas/event.schema.json` (used for live validation
in the current project) must also be updated so that `validate-store.cjs --dry-run`
continues to pass — because the orchestrator is already writing start events that
omit the new fields.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/schemas/event.schema.json` | Add five optional token fields to `properties` | Canonical plugin schema — distributed to every project |
| `.forge/schemas/event.schema.json` | Mirror the same change | Local schema used by validate-store.cjs in this repo |

## Plugin Impact Assessment

- **Version bump required?** Yes — bundled with T08 at sprint end. Schema change is
  material (distributed to every installed project). New version will be `0.4.0`
  (sprint-level feature group).
- **Migration entry required?** Yes — `regenerate: ["tools"]` so users run
  `/forge:update-tools` to receive the updated schema. Bundled in T08.
- **Security scan required?** Yes — any change to `forge/` requires a scan.
  Bundled in T08 (schema-only change; scan risk is effectively zero, but the
  process is mandatory).
- **Schema change?** Yes — `forge/schemas/event.schema.json`.

## Testing Strategy

- `node --check` — not applicable (JSON file, not JS)
- Store validation: `node forge/tools/validate-store.cjs --dry-run` must exit 0
  after both copies of the schema are updated (verifies existing events in
  `.forge/store/events/` remain valid)

## Acceptance Criteria

- [ ] `forge/schemas/event.schema.json` has `inputTokens`, `outputTokens`,
  `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD` in `properties`
- [ ] All five new fields use `"type": "integer"` or `"type": "number"` with
  `"minimum": 0` as specified in the task prompt
- [ ] None of the five new fields appear in the `required` array
- [ ] `"additionalProperties": false` is preserved
- [ ] `.forge/schemas/event.schema.json` mirrors the same change
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0

## Operational Impact

- **Distribution:** Users must run `/forge:update-tools` after the T08 version bump
  to receive the updated schema in their project's `.forge/schemas/`. Existing
  events without token fields remain valid (fields are optional).
- **Backwards compatibility:** Fully preserved. Old events validate fine; new events
  may include or omit the token fields.
