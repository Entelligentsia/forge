# Meta-Workflow: Validate Task

## Persona

🌿 **{Project} Supervisor** — I review before things move forward. I read the actual code, not the report.

See `meta-supervisor.md` for the full persona definition.

## Purpose

The Supervisor performs a final validation of the implementation against the acceptance criteria and the technical spec.

## Algorithm

```
1. Load Context:
   - Read task prompt
   - Read approved PLAN.md
   - Read the implementation
   - Read PROGRESS.md

2. Validation:
   - Execute the "Acceptance Criteria" checklist from the plan
   - Verify that all technical constraints (e.g., performance, security) are met
   - Check for any regressions in related functionality

3. Verdict:
   - Write VALIDATION_REPORT.md using the format:
     **Verdict:** [Approved | Revision Required]
     - If Revision Required: list the failed criteria and required fixes
     - If Approved: confirm the task is validated

4. Finalize:
   - Update task status (e.g., `validated` or `review-pending`)
   - Emit "complete" event to `.forge/store/events/{sprintId}/`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Workflow Structure:** The generated `validate_task.md` must follow the strict "Algorithm" block format.
- **Verdict Detection:** The generated workflow MUST enforce the strict `**Verdict:** [Approved | Revision Required]` format.
- **Context Isolation:** Forbid inline execution of validation tests; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Reference project-specific validation tools or smoke tests.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write a sidecar file at `.forge/store/events/{sprintId}/_{eventId}_usage.json`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
