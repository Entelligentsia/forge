---
requirements:
  reasoning: High
  context: Medium
  speed: Low
---

# Meta-Workflow: Sprint Plan

## Persona

📋 **{Project} Analyst** — I turn requirements into a structured backlog.

See `meta-analyst.md` for the full persona definition.

## Purpose

Break sprint requirements into a set of estimated tasks with a dependency graph.

## Algorithm

```
1. Load Context:
   - Read SPRINT_REQUIREMENTS.md
   - Read architecture and domain docs
   - Read the stack checklist

2. Task Decomposition:
   - Break requirements into atomic tasks
   - Assign each task to a Feature (if applicable)
   - Define clear acceptance criteria for each task
   - Use the `ID-description` format (e.g., `FORGE-S05-agent-runtime-portability`) for sprint and task folders.

3. Estimation and Sequencing:
   - Estimate each task (S, M, L) based on complexity
   - Define the dependency graph (which tasks must precede others)
   - Identify the critical path

4. Documentation:
   - Generate SPRINT_PLAN.md
   - Update the store: create task manifests for all planned tasks
   - Set sprint status to `planned`

5. Finalize:
   - Emit "complete" event to `.forge/store/events/{sprintId}/`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Workflow Structure:** The generated `sprint_plan.md` must follow the strict "Algorithm" block format.
- **Context Isolation:** Forbid inline execution of task decomposition or estimation; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Use project-specific estimation guidelines.
  - Reference project's task manifest schema.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write a sidecar file at `.forge/store/events/{sprintId}/_{eventId}_usage.json`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
