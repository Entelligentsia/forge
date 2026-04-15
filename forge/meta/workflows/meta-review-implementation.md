---
requirements:
  reasoning: High
  context: Medium
  speed: Low
---

# 🌿 Meta-Workflow: Review Implementation

## Purpose

The Supervisor reviews the Engineer's implementation for correctness, quality, and compliance with the approved plan.

## Iron Law

YOU MUST evaluate the code against the approved PLAN.md and the original task prompt. Do not accept "it works" as a substitute for "it is correct and maintainable."

## Algorithm

```
1. Load Context:
   - Read task prompt
   - Read approved PLAN.md
   - Read the implementation (code changes)
   - Read PROGRESS.md

2. Review:
   - Verify all plan steps were executed
   - Review code for quality, security, and architecture alignment
   - Verify test evidence in PROGRESS.md is authentic and complete

3. Verdict:
   - Write CODE_REVIEW.md using the format:
     **Verdict:** [Approved | Revision Required]
     - If Revision Required: provide numbered, actionable items
     - If Approved: provide any advisory notes

4. Knowledge Writeback:
   - Update stack-checklist.md if new patterns or pitfalls were discovered

5. Finalize:
   - Update task status via `/forge:store update-status task {taskId} status review-approved` (if Approved) or `/forge:store update-status task {taskId} status code-revision-required` (if Revision Required)
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Workflow Structure:** The generated `review_implementation.md` must follow the strict "Algorithm" block format.
- **Verdict Detection:** The generated workflow MUST enforce the strict `**Verdict:** [Approved | Revision Required]` format.
- **Context Isolation:** Forbid inline execution of complex code review logic; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Embed project-specific code quality standards and linting rules.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write the usage sidecar via `/forge:store emit {sprintId} '{sidecar-json}' --sidecar`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
