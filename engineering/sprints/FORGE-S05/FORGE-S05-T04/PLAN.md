# PLAN — FORGE-S05-T04: Workflow purification

🌱 *Forge Engineer*

**Task:** FORGE-S05-T04
**Sprint:** FORGE-S05
**Estimate:** M

---

## Objective

Purify the meta-workflow definitions in `forge/meta/workflows/` to ensure they are strictly "orchestrator-ready." This means removing prose-based guides and ensuring every workflow generates a true orchestrator (chained Agent tool calls, verdict detection, revision loops) as mandated by the "Iron Laws" in `meta-orchestrate.md` and the fix for BUG-005.

## Approach

1. **Audit all meta-workflows**: Review every file in `forge/meta/workflows/` against the requirements in `meta-orchestrate.md`.
2. **Identify "Guide-like" patterns**: Locate workflows that describe steps as a human-readable list rather than a machine-executable state machine.
3. **Refactor to Orchestrator Pattern**:
    - Ensure each workflow defines a clear sequence of phases.
    - Explicitly mandate the use of the `Agent` tool for phase execution (no inline execution).
    - Define explicit "Verdict Detection" mechanisms for review phases.
    - Ensure the "Token Self-Reporting" (sidecar merge) requirement is embedded in the generation instructions.
4. **Standardize Generation Instructions**: Update the "Generation Instructions" section of each meta-workflow to include mandatory constraints on model assignment, context isolation, and event emission.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/meta/workflows/meta-plan-task.md` | Refactor algorithm and generation instructions to align with orchestrator pattern | Ensure the generated `plan_task.md` is a true state machine |
| `forge/meta/workflows/meta-implement.md` | Refactor algorithm and generation instructions to align with orchestrator pattern | Ensure the generated `implement_plan.md` is a true state machine |
| `forge/meta/workflows/meta-approve.md` | Refactor algorithm and generation instructions to align with orchestrator pattern | Ensure the generated `approve_task.md` is a true state machine |
| `forge/meta/workflows/meta-review-plan.md` | Refactor to ensure strict verdict reporting (`**Verdict:** Approved/Revision Required`) | Required for orchestrator branching |
| `forge/meta/workflows/meta-review-implementation.md` | Refactor to ensure strict verdict reporting | Required for orchestrator branching |
| `forge/meta/workflows/meta-validate.md` | Refactor to ensure strict verdict reporting | Required for orchestrator branching |
| `forge/meta/workflows/meta-commit.md` | Refactor for orchestrator alignment | Consistency across the pipeline |
| `forge/meta/workflows/meta-fix-bug.md` | Refactor for orchestrator alignment | Ensure bug-fixing follows the same rigorous state machine |
| `forge/meta/workflows/meta-retrospective.md` | Refactor for orchestrator alignment | Consistency |
| `forge/meta/workflows/meta-sprint-intake.md` | Refactor for orchestrator alignment | Consistency |
| `forge/meta/workflows/meta-sprint-plan.md` | Refactor for orchestrator alignment | Consistency |
| `forge/meta/workflows/meta-update-implementation.md` | Refactor for orchestrator alignment | Consistency |
| `forge/meta/workflows/meta-update-plan.md` | Refactor for orchestrator alignment | Consistency |
| `forge/meta/workflows/meta-collate.md` | Refactor for orchestrator alignment | Consistency |

## Plugin Impact Assessment

- **Version bump required?** Yes — This is a material change to workflows that alters the behavior of generated artifacts. New version: `0.6.14`
- **Migration entry required?** Yes — `regenerate: ["workflows"]`. Users must run `/forge:update` to purify their local workflows.
- **Security scan required?** Yes — Changes to `forge/` require a security scan.
- **Schema change?** No.

## Testing Strategy

- Syntax check: `node --check` (not applicable to .md files, but I will verify no broken references).
- Manual verification: Review the refactored `.md` files to ensure they no longer contain "guide" language and instead use "algorithm" and "generation instructions" that enforce the `Agent` tool pattern.
- Store validation: `node forge/tools/validate-store.cjs --dry-run` (no schema change, but good for baseline).

## Acceptance Criteria

- [ ] All files in `forge/meta/workflows/` follow the "Algorithm $\rightarrow$ Generation Instructions" structure.
- [ ] All review workflows explicitly mandate the `**Verdict:**` format.
- [ ] All workflows explicitly forbid inline execution and require the `Agent` tool.
- [ ] All workflows include instructions for token sidecar reporting.
- [ ] No "guide-like" prose remains in the algorithm sections.

## Operational Impact

- **Distribution:** Users will need to run `/forge:update` after the plugin update to regenerate their local workflows from the purified meta-definitions.
- **Backwards compatibility:** High. Existing local workflows will continue to work until regenerated, but new ones will be significantly more robust and context-efficient.
