# Architect Approval — FORGE-S09-T06

🗻 *Forge Architect*

**Status:** Approved

## Distribution Notes

- **Version bump:** 0.9.3 → 0.9.4 — correct for a meta-workflow bug fix (material change per CLAUDE.md criteria).
- **Migration entry:** keyed `"0.9.3"`, `regenerate: ["workflows:architect_sprint_plan"]`, `breaking: false`, `manual: []`. Granular sub-target is accurate — only the sprint-plan workflow is affected.
- **Security scan:** `docs/security/scan-v0.9.4.md` present. 106 files scanned, 0 critical, 2 carry-forward warnings (accepted), SAFE TO USE. Scan ran on post-change state; the changed line is explicitly enumerated as `[INFO]` with no concern.
- **User-facing impact:** After `/forge:update`, users who confirm regeneration of `workflows:architect_sprint_plan` will have their sprint-plan workflow updated with the explicit `engineering/sprints/{sprintId}/SPRINT_PLAN.md` output path, eliminating ambiguous or root-level file placement.

## Operational Notes

- No new installed artifacts, directories, or disk-write sites.
- No changes to hooks, tools, schemas, or the update/migration flow itself.
- Users must run `/forge:update` then confirm `workflows:architect_sprint_plan` regeneration to receive the fix.
- The dogfooding instance's `.forge/workflows/architect_sprint_plan.md` currently omits the SPRINT_PLAN.md step entirely (pre-dates the fix). After this commit is published, running `/forge:regenerate workflows:architect_sprint_plan` in the dogfooding project will bring it in sync. This is a user action, correctly deferred per the two-layer architecture boundary.

## Follow-Up Items

- After this commit lands and is pushed to `main`, run `/forge:regenerate workflows:architect_sprint_plan` in the dogfooding project to update the local `.forge/workflows/architect_sprint_plan.md` to include the explicit SPRINT_PLAN.md path instruction.
- Minor style note (not blocking): the migration `notes` string uses slightly informal phrasing ("Run /forge:update and regenerate…") compared to earlier entries ("Run /forge:update to regenerate…"). Consider standardising wording in a future housekeeping pass.
