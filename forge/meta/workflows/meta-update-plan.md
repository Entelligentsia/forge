---
requirements:
  reasoning: Medium
  context: Medium
  speed: Medium
---

# 🌱 Meta-Workflow: Update Plan

## Purpose

Update the implementation plan of a task based on a "Revision Required" verdict from the plan review phase.

## Algorithm

```
1. Load Context:
   - Read the original task prompt
   - Read the current PLAN.md
   - Read the review artifact (PLAN_REVIEW.md)

2. Analysis:
   - Review the numbered, actionable items in the review artifact
   - Determine where the plan was insufficient or incorrect

3. Revision:
   - Update PLAN.md to address all review findings
   - Ensure the revised plan remains aligned with the task prompt
   - Update the "Operational Impact" or "Testing Strategy" if the revision changed them

4. Finalize:
   - Update task status to `planned`
   - Emit "complete" event to `.forge/store/events/{sprintId}/`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Workflow Structure:** The generated `update_plan.md` must follow the strict "Algorithm" block format.
- **Context Isolation:** Forbid inline execution of plan revision; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Reference the project's plan template.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write a sidecar file at `.forge/store/events/{sprintId}/_{eventId}_usage.json`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
