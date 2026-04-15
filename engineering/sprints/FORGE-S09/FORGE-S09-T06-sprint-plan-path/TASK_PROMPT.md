# FORGE-S09-T06: SPRINT_PLAN.md output path in meta-sprint-plan

**Sprint:** FORGE-S09
**Estimate:** S
**Pipeline:** default

---

## Objective

Fix `forge/meta/workflows/meta-sprint-plan.md` Step 5 to specify the output path as
`engineering/sprints/{sprintId}/SPRINT_PLAN.md` explicitly, so that running `/sprint-plan`
places the file inside the sprint directory instead of at an unspecified location.

## Acceptance Criteria

1. Running `/sprint-plan` places SPRINT_PLAN.md inside the sprint directory, not at the
   project root
2. The meta-workflow's Step 5 (or equivalent) explicitly states the output path
   `engineering/sprints/{sprintId}/SPRINT_PLAN.md`
3. `node --check` passes on all modified JS/CJS files

## Context

This is a straightforward fix to the meta-sprint-plan.md workflow. Currently Step 5 says
"Generate SPRINT_PLAN.md" with no path specification, leading to ambiguity.

## Plugin Artifacts Involved

- `forge/meta/workflows/meta-sprint-plan.md` — fix Step 5 output path

## Operational Impact

- **Version bump:** required — meta-workflow changes affect generated workflows
- **Regeneration:** users must run `/forge:update` then `/forge:regenerate workflows` to
  get the updated sprint-plan workflow
- **Security scan:** required — changes to `forge/` files