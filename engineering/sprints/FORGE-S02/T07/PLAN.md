# PLAN — FORGE-S02-T07: meta-sprint-intake + meta-sprint-plan — feature linkage and feature_id propagation

🌱 *Forge Engineer*

**Task:** FORGE-S02-T07
**Sprint:** FORGE-S02
**Estimate:** M

---

## Objective

Update two meta-workflow files (`meta-sprint-intake.md` and `meta-sprint-plan.md`) to integrate the new Feature tier into the sprint lifecycle. Intake will now prompt the user to link the sprint to an existing feature or create a new one, recording this in `SPRINT_REQUIREMENTS.md`. Plan will propagate this `feature_id` from requirements into the generated sprint and task manifests.

## Approach

1.  **`forge/meta/workflows/meta-sprint-intake.md`**:
    *   Add a new sub-step to "Step 3 — Scope".
    *   Instructions will ask the Architect to prompt the user: "Which Feature does this sprint advance?".
    *   Provide logic for listing existing features from `.forge/store/features/`, or defining a new one if it's a new capability.
    *   Specify that `SPRINT_REQUIREMENTS.md` must include a new **Feature** field populated with the feature link or `null`.
2.  **`forge/meta/workflows/meta-sprint-plan.md`**:
    *   Update "Step 2 — Define Tasks" to include `feature_id` (from `SPRINT_REQUIREMENTS.md`) for each task.
    *   Update "Step 4 — Create Sprint Manifest" to propagate `feature_id` to both the sprint JSON and task JSON records. Mention that this will be formalised via schemas in T03.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/meta/workflows/meta-sprint-intake.md` | Add Feature prompt in Scope step and Feature field in SPRINT_REQUIREMENTS.md | Woven into the sprint intake lifecycle. |
| `forge/meta/workflows/meta-sprint-plan.md` | Propagate `feature_id` from SPRINT_REQUIREMENTS to Sprint and Task JSON generation | Required for referential tracking of features. |

## Plugin Impact Assessment

- **Version bump required?** No — deferred to T10.
- **Migration entry required?** Yes — users must run `/forge:update` after upgrading (documented in T10).
- **Security scan required?** Yes — covered in T10.
- **Schema change?** No — handled by T03.

## Testing Strategy

- Syntax check: N/A (Markdown only)
- Store validation: N/A (Markdown only)
- Manual verification: Read through both workflow files to ensure natural phrasing and clear instruction sets.

## Acceptance Criteria

- [x] `meta-sprint-intake.md` Step 3 asks "Which Feature does this sprint advance?" and handles `.forge/store/features/` fetching/creation.
- [x] `meta-sprint-intake.md` records feature link or null in `SPRINT_REQUIREMENTS.md`.
- [x] `meta-sprint-plan.md` Step 2 lists `feature_id` as part of task definition.
- [x] `meta-sprint-plan.md` Step 4 propagates `feature_id` to sprint and task JSON manifests.
- [x] Both files maintain the existing meta-workflow format and logic for standalone sprints.

## Operational Impact

- **Distribution:** Users must run `/forge:update` to generate the project-level `sprint-intake.md` and `sprint-plan.md` workflows.
- **Backwards compatibility:** Yes, `feature_id: null` is perfectly valid.
