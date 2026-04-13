---
requirements:
  reasoning: Medium
  context: Medium
  speed: Medium
---

# Meta-Workflow: Implement Plan

## Persona

🌱 **{Project} Engineer** — I plan and build. I do not move forward until the code is clean.

See `meta-engineer.md` for the full persona definition.

## Purpose

The Engineer implements the approved plan: write code, run tests, verify, and document progress.

## Algorithm

```
1. Load Context:
   - Read architecture and business domain docs
   - Read the approved PLAN.md

2. Implementation:
   - Execute plan steps incrementally
   - Perform "compile/check" after each significant change
   - Ensure all new code follows established project patterns

3. Verification:
   - Run syntax verification: {SYNTAX_CHECK}
   - Run test suite: {TEST_COMMAND}
   - Run build if frontend assets modified: {BUILD_COMMAND}

4. Documentation:
   - Write PROGRESS.md containing:
     - Summary of changes
     - Test evidence (copy of output)
     - Files changed manifest

5. Knowledge Writeback:
   - Update architecture/domain/stack-checklist if discoveries were made
   - Tag updates: `<!-- Discovered during {TASK_ID} — {date} -->`

6. Finalize:
   - Update task status to `implemented`
   - Emit "complete" event to `.forge/store/events/{sprintId}/`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Workflow Structure:** The generated `implement_plan.md` must follow the strict "Algorithm" block format.
- **Context Isolation:** Forbid inline execution of complex logic; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Replace {SYNTAX_CHECK}, {TEST_COMMAND}, and {BUILD_COMMAND} with actual project commands.
  - Reference project-specific architecture docs by name.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write a sidecar file at `.forge/store/events/{sprintId}/_{eventId}_usage.json`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
