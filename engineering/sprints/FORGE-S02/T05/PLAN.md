# PLAN — FORGE-S02-T05: validate-store.cjs — referential integrity for feature_id on tasks and sprints

🌱 *Forge Engineer*

**Task:** FORGE-S02-T05
**Sprint:** FORGE-S02
**Estimate:** M

---

## Objective

This plan details the updates to `forge/tools/validate-store.cjs` required to enforce referential integrity for `feature_id` across task and sprint records. It will verify that any non-null `feature_id` references a valid feature ID present within `.forge/store/features/`. Additionally, the tool will gracefully handle legacy environments without a `features/` directory and will offer a `--fix` mechanism to nullify orphaned `feature_id` references.

## Approach

1.  **Feature ID Collection**: In Pass 1 of `validate-store.cjs`, add a block to list JSON files in `.forge/store/features/` (if the directory exists). Check and collect `featureId` from each record into a `featureIds` `Set`.
2.  **Backfill / Fix Support**: Update the `--fix` mode to nullify any unresolvable `feature_id` in tasks and sprints. This will be implemented by actively checking `feature_id` referential integrity during the store loading phase and setting it to `null` if the reference is unknown under `--fix` mode. Wait, `--fix` usually backfills missing fields. The instructions say: `--fix mode: if a task or sprint carries an unresolvable feature_id and --fix is passed, clear it to null and log the action`. I will add a referential integrity fix step. Since referential checks happen in Pass 2 currently (for `sprintId` on tasks, `similarBugs` on bugs), I can add a `fixReferentialIssue()` helper, or simply update Pass 2 to modify the stored object and overwrite the file if FIX_MODE is true and it's a `feature_id` violation. Alternatively, do it in Pass 1? Pass 1 collects all IDs. I must do the referential fixes *after* Pass 1 (since all features must be loaded before tasks can validate their `feature_id`). So in Pass 2, if `FIX_MODE` is enabled, and `feature_id` is invalid, fix it, log it, and rewrite the file. If not FIX_MODE, throw error.
   Wait, Pass 2 currently doesn't modify records. I will update Pass 2 to re-read and modify, or hold the records in memory if needed. Let me update Pass 2 to rewrite `file` if `FIX_MODE` is true when `feature_id` is missing.
3.  **Nullable FK Exemptions**: Since `feature_id` is nullable, records that do not contain it or explicitly specify `null` will bypass this referential check.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/validate-store.cjs` | Add feature ID extraction, Pass 2 referential check, pass 2 fix mode for `feature_id` nullification. Top-level exception handler. | Enforce features tier referential integrity. |

## Plugin Impact Assessment

- **Version bump required?** No — deferred to T10 as per prompt constraints.
- **Migration entry required?** No — deferred to T10.
- **Security scan required?** Yes — deferred to T10 but mandatory for `forge/` changes.
- **Schema change?** No — handled in T03.

## Testing Strategy

- Syntax check: `node --check forge/tools/validate-store.cjs`
- Store validation: `node forge/tools/validate-store.cjs --dry-run` to ensure backward compatibility and functionality across the local repo.
- Manual smoke test: Temporarily add a bad `feature_id` to a task to verify validation catches it, then run `--fix` to verify it removes it.

## Acceptance Criteria

- [ ] `validate-store.cjs` loads features into a known-features `Set`.
- [ ] Tasks and Sprints missing `feature_id` or with `null` pass validation.
- [ ] Sprints/Tasks referencing non-existent features fail validation.
- [ ] Blank/missing `features/` directory degrades gracefully without failure.
- [ ] `--fix` removes dangling `feature_id`s in tasks/sprints and logs the change.
- [ ] `node --check forge/tools/validate-store.cjs` passes.
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0 on current existing project state.
- [ ] Top-level exception handler is present in `validate-store.cjs`.

## Operational Impact

- **Distribution:** Users will run `/forge:update` at T10 to fetch this utility.
- **Backwards compatibility:** Full. Existing implementations without `features/` run safely.
