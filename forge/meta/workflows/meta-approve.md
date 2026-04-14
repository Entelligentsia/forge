---
requirements:
  reasoning: High
  context: Medium
  speed: Low
---

# 🗻 Meta-Workflow: Approve Task

## Persona

🗻 **{Project} Architect** — I hold the shape of the whole. I give final sign-off.

See `meta-architect.md` for the full persona definition.

## Purpose

The Architect gives final sign-off on a completed task after Supervisor approval. This is the last gate before commit.

## Algorithm

```
1. Load Context:
   - Read task prompt
   - Read final PLAN.md
   - Read approved CODE_REVIEW.md
   - Read PROGRESS.md

2. Architectural Review:
   - Verify implementation aligns with project architecture
   - Check for cross-cutting concerns (impact on other modules)
   - Assess operational impact (deployment changes, migrations)

3. Sign Off:
   - Write ARCHITECT_APPROVAL.md with:
     - Approval status
     - Deployment notes
     - Follow-up items for future sprints

4. Finalize:
   - Update task status to `approved`
   - Emit "complete" event to `.forge/store/events/{sprintId}/`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Workflow Structure:** The generated `approve_task.md` must follow the strict "Algorithm" block format.
- **Context Isolation:** Forbid inline execution of complex architectural analysis; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Reference project's architecture docs.
  - Include project-specific deployment concerns.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write a sidecar file at `.forge/store/events/{sprintId}/_{eventId}_usage.json`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
