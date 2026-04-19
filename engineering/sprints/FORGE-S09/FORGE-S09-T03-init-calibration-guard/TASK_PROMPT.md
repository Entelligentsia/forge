# FORGE-S09-T03: Init — calibration baseline write + incomplete init guard

**Sprint:** FORGE-S09
**Estimate:** M
**Pipeline:** default

---

## Objective

Add two features to the `/forge:init` command flow:
1. After generating personas and skills, write a `calibrationBaseline` object to
   `.forge/config.json` (#34)
2. After generating personas and skills, verify all required config fields are present
   and non-empty before writing; halt and prompt for missing values instead of writing
   a partial config (#35)

## Acceptance Criteria

1. After `/forge:init`, `.forge/config.json` contains a `calibrationBaseline` object with:
   - `lastCalibrated` — ISO date of when init wrote the baseline
   - `version` — plugin version from `$FORGE_ROOT/.claude-plugin/plugin.json`
   - `masterIndexHash` — SHA-256 of `engineering/MASTER_INDEX.md`
   - `sprintsCovered` — list of completed sprint IDs at init time (typically empty for new init)
2. If any required config field (per `sdlc-config.schema.json`) is missing or empty after
   persona/skill generation, `/forge:init` halts and prompts for the missing values
3. An eager model (Gemma, etc.) cannot produce a partial config — missing fields are caught
4. `node --check` passes on all modified JS/CJS files

## Context

Depends on T01 (phase renumbering — the init flow must use new integer phase numbers) and
T02 (schema must define `calibrationBaseline` and required fields before we can reference them).

The `masterIndexHash` should hash semantic content lines only (strip whitespace/comments) to
avoid false drift from formatting changes — per the sprint risk mitigation.

## Plugin Artifacts Involved

- `forge/commands/init.md` — add calibration baseline step and completeness check
- `forge/init/sdlc-init.md` — add steps to the relevant phase(s)

## Operational Impact

- **Version bump:** required — changes to command and init files affect user-facing behavior
- **Regeneration:** users must run `/forge:update` to get updated init command
- **Security scan:** required — changes to `forge/` files