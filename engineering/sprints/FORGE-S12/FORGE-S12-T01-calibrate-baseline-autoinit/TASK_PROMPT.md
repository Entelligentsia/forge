# FORGE-S12-T01: Calibrate baseline auto-initialization — remove dead end

**Sprint:** FORGE-S12
**Estimate:** S
**Pipeline:** default

---

## Objective

Remove the dead end in `/forge:calibrate` when `calibrationBaseline` is absent from `.forge/config.json`. Instead of exiting with "run `/forge:init`", the command should compute the current `MASTER_INDEX.md` hash, gather completed sprint IDs, and write the initial baseline — then report "〇 Baseline established" and exit. This mirrors the behavior already implemented in `/forge:init` Phase 5.

## Acceptance Criteria

1. `/forge:calibrate` on a project with no `calibrationBaseline` writes the initial baseline and reports success
2. `/forge:health` check 2 still detects a missing baseline and recommends calibration
3. Running `/forge:calibrate` after `/forge:health` no longer produces a dead end
4. Existing projects with a baseline are unaffected (no regression in drift detection)
5. `node --check` passes on all modified JS/CJS files
6. All existing tests pass: `node --test forge/tools/__tests__/*.test.cjs`

## Context

- GitHub issue #60 — `/forge:calibrate` baseline auto-initialization
- The baseline computation algorithm is already in `forge/init/sdlc-init.md` (Phase 5, lines ~501/516) as an inline Node.js one-liner
- The same computation exists in `forge/commands/calibrate.md` Step 8 (re-compute baseline after drift correction)
- The dead end is in `forge/commands/calibrate.md` Step 2 — it reads `calibrationBaseline` and exits early if absent
- S11-T05 already backfilled `calibrationBaseline` in fast-mode init/update; this task completes the fix by making calibrate self-sufficient

## Plugin Artifacts Involved

- `forge/commands/calibrate.md` — primary change (command layer)

## Operational Impact

- **Version bump:** Required — changes distributed command behavior
- **Regeneration:** Users must run `/forge:update` to regenerate the calibrate command
- **Security scan:** Required — changes `forge/`

## Plan Template

Follow `.forge/templates/PLAN_TEMPLATE.md` for the plan phase.