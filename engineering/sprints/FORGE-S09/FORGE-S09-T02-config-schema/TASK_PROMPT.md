# FORGE-S09-T02: Config schema — add calibrationBaseline + required-field annotations

**Sprint:** FORGE-S09
**Estimate:** S
**Pipeline:** default

---

## Objective

Extend `forge/sdlc-config.schema.json` to (a) define the `calibrationBaseline` object
required by #34 and (b) ensure required fields are properly annotated so the incomplete
init guard (#35) can validate config completeness against the schema.

## Acceptance Criteria

1. `sdlc-config.schema.json` contains a `calibrationBaseline` property with sub-fields:
   `lastCalibrated` (ISO date string), `version` (string), `masterIndexHash` (SHA-256 string),
   `sprintsCovered` (array of sprint ID strings)
2. `calibrationBaseline` is NOT in the top-level `required` array (it is written after init)
3. All fields that should be present after a complete init are annotated in the schema
   such that `required` arrays at each nesting level are correct
4. Schema validates cleanly against JSON Schema draft 2020-12
5. `node --check` passes on all modified JS/CJS files

## Context

This task is the schema foundation for T03 (init writes calibration baseline) and
T04 (health checks config completeness). Both tasks depend on the schema defining
the right types and required fields.

The `calibrationBaseline` is written by `/forge:init` after persona and skill generation,
NOT at discovery time — hence it should not be in the top-level `required` array.

The incomplete init guard (#35) validates that all `required` fields in the schema are
present and non-empty in the generated `.forge/config.json`. The schema must accurately
represent which fields are truly required for a valid config.

## Plugin Artifacts Involved

- `forge/sdlc-config.schema.json` — the source schema that gets copied to user projects

## Operational Impact

- **Version bump:** required — schema changes affect all installed instances
- **Regeneration:** users must run `/forge:update-tools` to get updated schema copy
- **Security scan:** required — changes to `forge/` files