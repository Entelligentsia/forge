---
requirements:
  reasoning: High
  context: Medium
  speed: Low
deps:
  personas: [architect]
  skills: [architect, generic]
  templates: []
  sub_workflows: []
  kb_docs: [architecture/stack.md]
  config_fields: [paths.engineering]
---

# 🗻 Meta-Workflow: Review Sprint Completion

## Purpose

Verify that all tasks in a sprint have been completed, committed, and validated before closing the sprint.

## Algorithm

```
1. Load Context:
   - Read sprint manifest
   - Read all task manifests in the sprint
   - Check VCS for all expected commit hashes

2. Verification:
   - Confirm every task is in `committed` status
   - Verify all `approved` tasks have a corresponding commit
   - Check for any lingering "escalated" tasks

3. Verdict:
   - Write SPRINT_COMPLETION_REVIEW.md using the format:
     **Verdict:** [Approved | Revision Required]
     - If Revision Required: list missing commits or unresolved tasks
     - If Approved: confirm sprint is ready for retrospective

4. Finalize:
   - Update sprint status via `/forge:store update-status sprint {sprintId} status completed`
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Persona Self-Load:** The generated workflow MUST begin by reading `.forge/personas/architect.md` as its first step (before any other tool use). This replaces the former inline `## Persona` section. The persona identity line (emoji, name, tagline) should be printed to stdout after reading the file.
- **Workflow Structure:** The generated `review_sprint_completion.md` must follow the strict "Algorithm" block format.
- **Verdict Detection:** The generated workflow MUST enforce the strict `**Verdict:** [Approved | Revision Required]` format.
- **Context Isolation:** Forbid inline execution of sprint-wide audits; use the `Agent` tool for sub-tasks.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write the usage sidecar via `/forge:store emit {sprintId} '{sidecar-json}' --sidecar`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
