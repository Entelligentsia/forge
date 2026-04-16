# FORGE-S09-T05: Calibrate command — drift detection, categories, surgical patches

**Sprint:** FORGE-S09
**Estimate:** L
**Pipeline:** default

---

## Objective

Create the `/forge:calibrate` command that reads the calibration baseline, detects drift
between the KB and agent definitions, categorizes drift by type, proposes typed surgical
patches as structured migration entries, gates on Architect approval, and writes approved
patches to the calibration history.

## Acceptance Criteria

1. `/forge:calibrate` reports drift categories with specific affected agent definitions:
   - Technical drift (conventions, patterns, schemas) → regenerate Engineer persona,
     Engineer skill, Supervisor skill
   - Business drift (domain models, vocabulary) → regenerate all personas for contextual
     awareness
   - Retrospective iron-law learnings → regenerate the persona of the role that had the gap
   - New acceptance criteria patterns → regenerate PM persona, QA skill
2. Proposed patches are structured migration entries (target, type, patch, optional fields)
   per the #32 format
3. No changes are applied without explicit Architect approval
4. After approval, regenerated agents reflect the current KB state
5. Approved patches are written to `.forge/config.json` calibration history
6. `node --check` passes on all modified JS/CJS files

## Context

Depends on T03 (init writes the calibration baseline that calibrate reads) and T04 (health
reports drift categories that calibrate resolves). This is the capstone feature of the
calibration system — the baseline and detection are upstream, this is the resolution.

The command should follow the existing command pattern: frontmatter with name/description,
then structured steps, then arguments and error handling sections.

Reference `.forge/templates/PLAN_TEMPLATE.md` for the plan template format.

## Plugin Artifacts Involved

- `forge/commands/calibrate.md` — new command file

## Operational Impact

- **Version bump:** required — new command shipped to all users
- **Regeneration:** users must run `/forge:update` to get the new command
- **Security scan:** required — new `forge/` file