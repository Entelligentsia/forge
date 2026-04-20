# PLAN — FORGE-S12-T05: Sprint Planning Store-Write Verification Loop

## Objective

Add a store-write verification loop to `forge/meta/workflows/meta-sprint-plan.md` so that agents executing the sprint-plan workflow verify every store write succeeds. If a PreToolUse hook or `store-cli` rejects a write due to a schema violation, the agent must parse the error, correct the JSON, and retry — halting all further progress until the write is confirmed successful.

## Problem

When agents execute `architect_sprint_plan.md`, they perform multiple store writes:

- Create tasks via `/forge:store write task '{task-json}'`
- Update sprint via `/forge:store write sprint '{updated-sprint-json}'`
- Update status via `/forge:store update-status sprint {sprintId} status active`
- Emit events via `/forge:store emit {sprintId} '{event-json}'`

If any write fails (schema violation caught by the PreToolUse hook or `store-cli` validation), the workflow has no retry instruction. The agent may continue to the next step, producing an incomplete sprint plan with missing tasks, a sprint record with stale `taskIds`, or events with invalid timestamps.

The orchestrate_task.md already has a "Write-Boundary Contract" section, but the sprint-plan workflow is a separate workflow executed independently — it needs its own verification instructions.

## Changes

### 1. Add "Store-Write Verification" section to `meta-sprint-plan.md`

Add a new top-level section after "Iron Laws" that establishes the verification principle:

- Every store write MUST succeed before proceeding
- On failure: parse the error, correct the JSON, retry
- Maximum 3 retries before escalation
- FORGE_SKIP_WRITE_VALIDATION is for operator repair only — agents MUST NOT use it

### 2. Update Algorithm steps in `meta-sprint-plan.md`

Modify steps 4 and 7 (the store-write steps) to include inline retry instructions referencing the Store-Write Verification section.

### 3. Add Generation Instruction

Add a generation instruction requiring the generated workflow to include the Store-Write Verification section verbatim.

## Files Changed

| File | Change |
|------|--------|
| `forge/meta/workflows/meta-sprint-plan.md` | Add Store-Write Verification section, update Algorithm steps 4 and 7, add Generation Instruction |

## Acceptance Criteria

1. The meta-workflow includes a "Store-Write Verification" section that specifies the parse-correct-retry pattern
2. Algorithm steps 4 and 7 reference the verification loop at each store-write point
3. Generation Instructions require the verification section in generated workflows
4. Existing tests still pass (`node --test forge/tools/__tests__/*.test.cjs`)
5. The workflow content is consistent with the Write-Boundary Contract in orchestrate_task.md

## Risk Assessment

- **Low risk**: This is a documentation/workflow content change, not executable code
- **No breaking changes**: The verification loop is additive — existing behavior is unchanged
- **No version bump required**: Workflow content changes propagate on `/forge:regenerate`

## Implementation Order

1. Read the current meta-sprint-plan.md
2. Add the Store-Write Verification section after Iron Laws
3. Update Algorithm steps 4 and 7 with inline retry references
4. Add the Generation Instruction
5. Run tests to verify nothing is broken