---
requirements:
  reasoning: Medium
  context: Medium
  speed: Medium
audience: subagent
phase: update-plan
context:
  architecture: false
  prior_summaries: delta
  persona: summary
  master_index: false
  diff_mode: false
deps:
  personas: [architect]
  skills: [architect, generic]
  templates: [PLAN_TEMPLATE]
  sub_workflows: [review_plan]
  kb_docs: [architecture/stack.md]
  config_fields: [paths.engineering]
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
   - Update task status via `/forge:store update-status task {taskId} status planned`
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Workflow Structure:** The generated `update_plan.md` must follow the strict "Algorithm" block format.
- **Context Isolation:** Forbid inline execution of plan revision; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Reference the project's plan template.
- **Token Reporting:** See `_fragments/finalize.md` — wire via `file_ref:`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
