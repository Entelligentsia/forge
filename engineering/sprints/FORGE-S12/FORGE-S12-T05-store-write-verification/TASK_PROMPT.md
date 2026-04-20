# FORGE-S12-T05: Sprint planning store-write verification loop

**Sprint:** FORGE-S12
**Estimate:** M
**Pipeline:** default

---

## Objective

Agents executing `architect_sprint_plan.md` must verify that every write to the Forge store succeeds. If a `PreToolUse` hook rejects a write due to a schema violation, the agent must: (1) parse the error message for the specific field violation, (2) correct the JSON and retry the write, (3) halt all further progress in the workflow until the write is confirmed successful. This applies to all store-write operations in sprint planning and task orchestration workflows.

## Acceptance Criteria

1. When a schema violation rejects a task JSON write, the agent retries with corrected JSON instead of silently proceeding
2. A sprint with invalid task JSONs cannot reach `planning` completion — the workflow halts at the write step
3. Valid task writes succeed without extra retries (no performance regression)
4. The verification loop is documented in both `meta-sprint-plan.md` and `meta-orchestrate-task.md`
5. `node --check` passes on all modified JS/CJS files
6. All existing tests pass: `node --test forge/tools/__tests__/*.test.cjs`

## Context

- GitHub issue #64 — Sprint planning store-write verification loop
- `forge/meta/workflows/meta-sprint-plan.md` — the sprint planning meta-workflow (Stage 4 writes tasks and sprint via `store-cli.cjs write`)
- `forge/meta/workflows/meta-orchestrate-task.md` — task orchestration also writes to store
- The `PreToolUse` hook `forge/hooks/validate-write.js` already validates writes against schemas and rejects violations
- Currently, if a write is rejected by the hook, the agent can silently proceed to the next step, leaving the sprint in an inconsistent state
- The fix is in the meta-workflow instructions (agent guidance), not in the hook or tool code

## Plugin Artifacts Involved

- `forge/meta/workflows/meta-sprint-plan.md` — primary change (meta-workflow layer)
- `forge/meta/workflows/meta-orchestrate-task.md` — also needs verification loop (meta-workflow layer)

## Operational Impact

- **Version bump:** Required — changes distributed workflow behavior
- **Regeneration:** Users must run `/forge:update` to regenerate workflows
- **Security scan:** Required — changes `forge/`

## Plan Template

Follow `.forge/templates/PLAN_TEMPLATE.md` for the plan phase.