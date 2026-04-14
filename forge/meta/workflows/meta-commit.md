---
requirements:
  reasoning: Low
  context: Low
  speed: High
---

# 🌱 Meta-Workflow: Commit Task

## Purpose

Seal a completed and approved task by committing its artifacts to the VCS and updating the store.

## Algorithm

```
1. Load Context:
   - Read task manifest
   - Read ARCHITECT_APPROVAL.md

2. Staging:
   - Stage all task-related artifacts: PLAN.md, PROGRESS.md, REVIEW files, and code changes
   - Verify no unrelated files are staged

3. Commit:
   - Create a commit with a message following project conventions
   - Include task ID in the commit message
   - Co-author with "Claude Opus 4.6 <noreply@anthropic.com>"

4. Store Finalization:
   - Update task status to `committed`
   - Update the task's `commit_hash` field in the store

5. Finalize:
   - Emit "complete" event to `.forge/store/events/{sprintId}/`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Workflow Structure:** The generated `commit_task.md` must follow the strict "Algorithm" block format.
- **Context Isolation:** Forbid inline execution of commit operations; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Embed project's commit message conventions.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write a sidecar file at `.forge/store/events/{sprintId}/_{eventId}_usage.json`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
