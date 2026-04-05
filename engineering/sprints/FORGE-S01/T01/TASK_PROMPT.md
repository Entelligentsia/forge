# FORGE-S01-T01: Event schema — add optional token fields

**Sprint:** FORGE-S01
**Estimate:** S
**Pipeline:** default

---

## Objective

Extend the event schema to support optional token usage fields so that phase-level
token consumption can be recorded alongside existing timing and model data.

## Acceptance Criteria

1. `forge/schemas/event.schema.json` includes five new optional properties:
   - `inputTokens` (integer, minimum 0)
   - `outputTokens` (integer, minimum 0)
   - `cacheReadTokens` (integer, minimum 0)
   - `cacheWriteTokens` (integer, minimum 0)
   - `estimatedCostUSD` (number, minimum 0)
2. None of the new fields appear in the `required` array (backward-compatible)
3. `node --check` is not applicable (JSON file)
4. Existing events without token fields remain valid against the updated schema

## Context

This is the foundation task for FORGE-S01. All other tasks in this sprint depend
on these schema fields existing. The schema lives in `forge/schemas/` (distributed
with the plugin) and is copied to `.forge/schemas/` in each project during init.

## Plugin Artifacts Involved

- `forge/schemas/event.schema.json` — the canonical schema definition

## Operational Impact

- **Version bump:** Required (bundled with T08 at sprint end)
- **Regeneration:** Users must run `/forge:update-tools` to get the updated schema
- **Security scan:** Not required (schema-only change, no executable code)
