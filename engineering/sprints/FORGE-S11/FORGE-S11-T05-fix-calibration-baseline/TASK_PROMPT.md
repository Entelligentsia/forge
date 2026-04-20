# FORGE-S11-T05: Fix calibrationBaseline missing from fast-mode init and update (#55)

**Sprint:** FORGE-S11
**Estimate:** M
**Pipeline:** default

---

## Objective

`/forge:init --fast` jumps from Phase 3 directly to Phase 7-fast, bypassing Phases 5 and 6-b where `calibrationBaseline` is written into `config.json`. As a result, fast-mode projects lack a `calibrationBaseline` and `/forge:calibrate` aborts with "no calibrationBaseline". Additionally, `/forge:update` runs do not refresh it even after successful artifact materialization.

Fix: add a `calibrationBaseline` write step in the fast-mode init path (after Phase 7-fast stub writes), and add a refresh step in the update command after successful materialization.

## Acceptance Criteria

1. After `/forge:init --fast`, `config.json` contains a valid `calibrationBaseline` object with fields: `lastCalibrated`, `version`, `masterIndexHash`, `sprintsCovered`.
2. After a successful `/forge:update` run that changes materialized artifacts, `calibrationBaseline` is refreshed in `config.json`.
3. `/forge:calibrate` runs to completion without "no calibrationBaseline" abort for fast-mode projects.
4. The fast-mode init phase numbering is NOT changed — insert the baseline write as a sub-step of the existing Phase 7-fast, not as a new numbered phase.

## Context

- GitHub issue: #55
- Primary file: `forge/init/sdlc-init.md` — add calibration baseline write in Phase 7-fast (after stub writes complete).
- Secondary file: the update command (check `forge/commands/update.md` or the update meta-workflow) — add baseline refresh after successful materialization.
- Read both files in full before editing. The insert must be surgical — no phase renumbering.

## Plugin Artifacts Involved

- `forge/init/sdlc-init.md` — add calibrationBaseline write in fast-mode path
- `forge/commands/update.md` (or the relevant update workflow) — add calibrationBaseline refresh

## Operational Impact

- **Version bump:** required (addressed in T08)
- **Regeneration:** users must run `/forge:update` (workflows target) to get the updated init/update flows
- **Security scan:** required (addressed in T08)
