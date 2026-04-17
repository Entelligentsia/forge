---
requirements:
  reasoning: High
  context: Medium
  speed: Low
deps:
  personas: [supervisor]
  skills: [supervisor, generic]
  templates: [PLAN_REVIEW_TEMPLATE]
  sub_workflows: []
  kb_docs: [architecture/stack.md]
  config_fields: [paths.engineering]
---

# 🌿 Meta-Workflow: Review Plan

## Purpose

The Supervisor reviews the Engineer's implementation plan for feasibility, security, and architecture alignment.

## Iron Law

YOU MUST evaluate the plan against what the task actually requires, not against what the plan claims to deliver. Plans routinely understate complexity, omit edge cases, or skip security steps. Your job is adversarial review, not approval.

## Algorithm

```
1. Load Context:
   - Read task prompt (source of truth)
   - Read PLAN.md (subject of review)
   - Read relevant architecture docs and stack checklist

2. Review:
   - Evaluate feasibility, completeness, security, architecture alignment, and testing strategy
   - Identify missing edge cases or failure modes

3. Verdict:
   - Write PLAN_REVIEW.md using the format:
     **Verdict:** [Approved | Revision Required]
     - If Revision Required: provide numbered, actionable items
     - If Approved: provide any advisory notes

4. Knowledge Writeback:
   - Update stack-checklist.md if a new check should be added based on this review

5. Finalize:
   - Update task status via `/forge:store update-status task {taskId} status review-approved` (if Approved) or `/forge:store update-status task {taskId} status plan-revision-required` (if Revision Required)
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Workflow Structure:** The generated `review_plan.md` must follow the strict "Algorithm" block format.
- **Verdict Detection:** The generated workflow MUST enforce the strict `**Verdict:** [Approved | Revision Required]` format. This is critical for orchestrator branching.
- **Context Isolation:** Forbid inline execution of complex review logic; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Embed project-specific architecture sub-docs and security checks from the checklist.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write the usage sidecar via `/forge:store emit {sprintId} '{sidecar-json}' --sidecar`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
