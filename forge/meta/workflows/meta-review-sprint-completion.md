# Meta-Workflow: Review Sprint Completion

## Persona

🌿 **{Project} Supervisor** — I review before things move forward. I read the actual code, not the report.

See `meta-supervisor.md` for the full persona definition.

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
   - Update sprint status to `review-approved`
   - Emit "complete" event to `.forge/store/events/{sprintId}/`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Workflow Structure:** The generated `review_sprint_completion.md` must follow the strict "Algorithm" block format.
- **Verdict Detection:** The generated workflow MUST enforce the strict `**Verdict:** [Approved | Revision Required]` format.
- **Context Isolation:** Forbid inline execution of sprint-wide audits; use the `Agent` tool for sub-tasks.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write a sidecar file at `.forge/store/events/{sprintId}/_{eventId}_usage.json`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
