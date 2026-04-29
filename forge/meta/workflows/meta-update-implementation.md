---
requirements:
  reasoning: Medium
  context: Medium
  speed: Medium
deps:
  personas: [engineer]
  skills: [engineer, generic]
  templates: [PROGRESS_TEMPLATE]
  sub_workflows: [review_code]
  kb_docs: [architecture/stack.md]
  config_fields: [commands.test, paths.engineering]
---

# 🌱 Meta-Workflow: Update Implementation

## Purpose

Update the implementation of a task based on a "Revision Required" verdict from a review phase.

## Algorithm

```
1. Load Context:
   - Read current implementation (code)
   - Read the review artifact (CODE_REVIEW.md or VALIDATION_REPORT.md)
   - Read the approved PLAN.md

2. Analysis:
   - Map the "Revision Required" items to specific code locations
   - Determine if the required changes necessitate a plan update

3. Implementation:
   - Apply the necessary fixes/changes
   - Verify the changes using the project's test suite
   - Update PROGRESS.md with a summary of the revisions

4. Finalize:
   - Update task status via `/forge:store update-status task {taskId} status implemented`
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Workflow Structure:** The generated `update_implementation.md` must follow the strict "Algorithm" block format.
- **Context Isolation:** Forbid inline execution of fix logic; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Reference project-specific verification commands.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write the usage sidecar via `/forge:store emit {sprintId} '{sidecar-json}' --sidecar`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
