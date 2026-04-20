# PLAN — FORGE-S12-T01: Calibrate baseline auto-initialization — remove dead end

🌱 *Forge Engineer*

**Task:** FORGE-S12-T01
**Sprint:** FORGE-S12
**Estimate:** S

---

## Objective

Replace the dead end in `/forge:calibrate` Step 2 — which exits with "run `/forge:init`" when `calibrationBaseline` is absent — with auto-initialization logic that computes the initial baseline (MASTER_INDEX.md hash + completed sprint IDs) and writes it to `.forge/config.json`, then reports success and exits. This mirrors the behavior already implemented in `/forge:init` Phase 5/6-b and Step 7-fast-b.

## Approach

The calibration baseline computation algorithm already exists in two places within the codebase:
1. `forge/init/sdlc-init.md` Step 5/6-b (lines 499-517) and Step 7-fast-b (lines 586-605)
2. `forge/commands/calibrate.md` Step 8 (lines 184-239) — re-compute baseline after drift correction

The fix replaces the Step 2 early-exit block in `calibrate.md` with auto-initialization:
- Read `calibrationBaseline` from config
- If absent: compute the baseline using the same algorithm (hash MASTER_INDEX.md, list completed sprint IDs, get date and version), write it to config, emit "Baseline established", and exit
- If present: proceed to Step 3 as before (drift detection)

This is a single-file change to `forge/commands/calibrate.md` Step 2 only.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/commands/calibrate.md` | Replace Step 2 dead-end with auto-initialization logic | Removes the dead end; mirrors init Phase 5 behavior |

## Plugin Impact Assessment

- **Version bump required?** Yes — changes distributed command behavior (users who run `/forge:calibrate` without a baseline will get a different outcome)
- **Migration entry required?** Yes — `regenerate: ["commands"]` (users need updated calibrate command)
- **Security scan required?** Yes — changes `forge/`
- **Schema change?** No — `calibrationBaseline` schema already exists; no new fields

## Testing Strategy

- Syntax check: `node --check` on any modified JS/CJS files (none expected — command file is Markdown)
- Store validation: `node forge/tools/validate-store.cjs --dry-run` (no schema change, but confirm no regressions)
- Manual smoke test: On a project with no `calibrationBaseline` in config, run `/forge:calibrate` and verify it writes the baseline and reports success instead of dead-ending. On a project with an existing baseline, verify drift detection still works normally.
- Full test suite: `node --test forge/tools/__tests__/*.test.cjs`

## Acceptance Criteria

- [ ] `/forge:calibrate` on a project with no `calibrationBaseline` writes the initial baseline and reports success
- [ ] `/forge:calibrate` on a project with an existing baseline still performs drift detection (no regression)
- [ ] Step 2 no longer contains the dead-end "run `/forge:init`" message for missing baseline
- [ ] The auto-initialization algorithm matches init Phase 5/6-b (same hash computation, same sprint-ID listing, same config write pattern)
- [ ] All existing tests pass: `node --test forge/tools/__tests__/*.test.cjs`

## Operational Impact

- **Distribution:** Users must run `/forge:update` to get the updated calibrate command
- **Backwards compatibility:** Fully backwards-compatible — existing baselines are unaffected; the only behavioral change is that missing baselines are now auto-initialized instead of causing a dead end