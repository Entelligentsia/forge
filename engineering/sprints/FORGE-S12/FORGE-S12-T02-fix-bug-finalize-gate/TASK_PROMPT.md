# FORGE-S12-T02: Fix-bug Finalize phase gate — collate must succeed before bug closes

**Sprint:** FORGE-S12
**Estimate:** S
**Pipeline:** default

---

## Objective

Add a Finalize phase gate to the fix-bug workflow that checks for INDEX.md existence in the bug directory before allowing the workflow to mark the bug as `resolved`. Collate must succeed; the bug cannot close without it. This prevents bugs from reaching `resolved` status without their knowledge-base artifacts being up to date.

## Acceptance Criteria

1. Running the fix-bug workflow end-to-end produces INDEX.md and updates MASTER_INDEX.md — Finalize gate blocks otherwise
2. The Finalize gate checks for `{bugDir}/INDEX.md` existence before allowing `resolved` status
3. If INDEX.md is missing, the workflow runs collate and re-checks before proceeding
4. Existing fix-bug workflows that already produce INDEX.md are unaffected
5. `node --check` passes on all modified JS/CJS files
6. All existing tests pass: `node --test forge/tools/__tests__/*.test.cjs`

## Context

- GitHub issue #61 — Fix-bug Finalize phase gate
- The fix-bug meta-workflow is at `forge/meta/workflows/meta-fix-bug.md`
- The Close stage (stage 5) currently updates bug status to `fixed`/`verified` and writes `resolvedAt` — no collate gate exists
- Collate is the tool that generates INDEX.md files from the JSON store: `node forge/tools/collate.cjs`
- After regeneration, users get the updated workflow at `.forge/workflows/fix_bug.md`

## Plugin Artifacts Involved

- `forge/meta/workflows/meta-fix-bug.md` — primary change (meta-workflow layer)

## Operational Impact

- **Version bump:** Required — changes distributed workflow behavior
- **Regeneration:** Users must run `/forge:update` to regenerate workflows
- **Security scan:** Required — changes `forge/`

## Plan Template

Follow `.forge/templates/PLAN_TEMPLATE.md` for the plan phase.