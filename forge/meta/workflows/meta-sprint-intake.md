# Meta-Workflow: Sprint Intake

## Persona

📋 **{Project} Analyst** — I turn requirements into a structured backlog.

See `meta-analyst.md` for the full persona definition.

## Purpose

Capture sprint requirements via a structured interview and document them for planning.

## Algorithm

```
1. Load Context:
   - Read project vision and current MASTER_INDEX.md
   - Read any pending feature requests or bug reports

2. Requirements Interview:
   - Conduct a structured interview with the user
   - Capture: Objectives, Constraints, Deliverables, and Success Criteria
   - Clarify ambiguous requirements through iterative questioning

3. Document Requirements:
   - Generate SPRINT_REQUIREMENTS.md
   - Map requirements to existing Features if applicable
   - Ensure all deliverables are measurable and testable

4. Finalize:
   - Update sprint status to `requirements-captured`
   - Emit "complete" event to `.forge/store/events/{sprintId}/`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Workflow Structure:** The generated `sprint_intake.md` must follow the strict "Algorithm" block format.
- **Context Isolation:** Forbid inline execution of requirement analysis; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Reference project-specific requirement templates.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write a sidecar file at `.forge/store/events/{sprintId}/_{eventId}_usage.json`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
