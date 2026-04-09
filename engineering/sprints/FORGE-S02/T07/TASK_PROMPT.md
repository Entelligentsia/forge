# FORGE-S02-T07: meta-sprint-intake + meta-sprint-plan — feature linkage and feature_id propagation

**Sprint:** FORGE-S02
**Estimate:** M
**Pipeline:** default

---

## Objective

Update two meta-workflow files so that the Feature tier is woven into the
sprint lifecycle. The intake workflow must ask "which Feature does this sprint
advance?" and link the sprint to an existing feature (or create a new one).
The plan workflow must propagate `feature_id` to all generated task manifests.

## Acceptance Criteria

1. `forge/meta/workflows/meta-sprint-intake.md` — Step 3 (Scope) gains a
   new sub-step:
   - Ask: **"Which Feature does this sprint advance?"**
   - If the project has existing features in `.forge/store/features/`, list them
     by ID and title and prompt for selection.
   - If none exist, or if the sprint starts a brand-new capability, prompt the
     user to define a new Feature (id `FEAT-NNN`, title, one-sentence description)
     and write it to `.forge/store/features/FEAT-NNN.json`.
   - The feature link (or `null` if the sprint is standalone) is recorded in
     `SPRINT_REQUIREMENTS.md` under a new **Feature** field.
2. `forge/meta/workflows/meta-sprint-plan.md` — Step 2 (Define Tasks) and
   Step 4 (Create Store Records) gain instructions to propagate `feature_id`
   (from `SPRINT_REQUIREMENTS.md`) to:
   - The sprint manifest (`feature_id` field if supported by schema — or note
     that it surfaces via T03).
   - Each generated task JSON (`feature_id` field, nullable).
3. Both files follow the existing meta-workflow format (Purpose, Iron Law if
   applicable, Algorithm, Generation Instructions sections).
4. No changes to how non-Feature sprints are handled — `feature_id: null` is
   acceptable and must not trigger warnings during intake.

## Context

- Depends on T02 (`feature.schema.md`) for the Feature data model to reference.
- Depends on T03 (JSON schemas) for the `feature_id` field on sprint/task
  manifests to be valid.
- The generated (project-level) workflow files are regenerated from these
  meta-workflows via `/forge:update` — so changing the meta-workflow files here
  is correct; the project-level files update on the next `/forge:update` run.
- The sprint requirements note: "sprint-intake is updated to ask which Feature
  this sprint advances" and "sprint-plan propagates feature_id to generated tasks."

## Plugin Artifacts Involved

- **[MODIFY]** `forge/meta/workflows/meta-sprint-intake.md`
- **[MODIFY]** `forge/meta/workflows/meta-sprint-plan.md`

## Operational Impact

- **Version bump:** Not required for this task — deferred to T10.
- **Regeneration:** Users must run `/forge:update` after upgrading to get
  the updated `sprint-intake` and `sprint-plan` workflows. Migration notes
  in T10 must say so explicitly.
- **Security scan:** Required at T10 (covers all `forge/` changes).
