# PROGRESS — FORGE-S08-T04: Update step banners and explicit sequencing

*Forge Engineer*

**Task:** FORGE-S08-T04
**Sprint:** FORGE-S08

---

## Summary

Added structured progress output to `/forge:update` by inserting a Progress Output Format section, step banners at the top of all 6 steps, and an explicit regeneration order table in Step 4. The banner format is consistent with the T01 pattern in `init.md` (using `━━━ Step N/6` instead of `━━━ Phase N/9`).

## Syntax Check Results

No JS/CJS files were modified. Only Markdown was changed.

## Store Validation Results

No schemas were modified. N/A.

## Files Changed

| File | Change |
|---|---|
| `forge/commands/update.md` | Added Progress Output Format section (after Model-alias pre-check, before Step 1); added `Emit:` banner instruction at the top of Steps 1, 2A, 2B, 3, 4, 5, and 6; added Regeneration order table with 6 targets in Step 4 |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `forge/commands/update.md` contains a "Progress Output Format" section | Pass | Section inserted between Model-alias pre-check and Step 1 |
| Each of Steps 1, 2A, 2B, 3, 4, 5, 6 has an emit instruction for its banner | Pass | All 7 banner emit instructions added (2A and 2B both use "Step 2/6" with different names) |
| Step 4 contains a sequencing table listing the correct order of regeneration targets | Pass | Table has 6 rows: tools, workflows, templates, personas, commands, knowledge-base |
| The sequencing table notes that `commands` must follow `workflows` | Pass | "Must run after `workflows`" in the Can run after column |
| The table notes that only targets present in the aggregated result are executed | Pass | "Only execute targets that appear in the aggregated result -- skip absent ones." |

## Plugin Checklist

- [ ] Version bumped in `forge/.claude-plugin/plugin.json` -- deferred to T06
- [ ] Migration entry added to `forge/migrations.json` -- deferred to T06
- [ ] Security scan run and report committed -- deferred to T06

## Knowledge Updates

None required.

## Notes

The plan's advisory note about section placement was followed: Progress Output Format was placed after the Model-alias auto-suppression pre-check section and before Step 1, not directly after Locate plugin root. This provides better document flow (preamble sections, then numbered steps).