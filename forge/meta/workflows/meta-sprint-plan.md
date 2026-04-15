---
requirements:
  reasoning: High
  context: Medium
  speed: Low
---

# 🗻 Meta-Workflow: Sprint Plan

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
   - Create each task via `/forge:store write task '{task-json}'`
   - Update the sprint record with all new task IDs via `/forge:store write sprint '{updated-sprint-json}'` (the sprint JSON must include the complete `taskIds` array with all newly created task IDs)
   - For each task, create its task folder and write TASK_PROMPT.md:
     * Folder: `engineering/sprints/{sprintId}/{taskId}/`
     * File: `TASK_PROMPT.md` — populate from `.forge/templates/TASK_PROMPT_TEMPLATE.md`
       filling in title, objective, acceptance criteria, entities, DSL/CLI changes, and operational impact
   - Update sprint status via `/forge:store update-status sprint {sprintId} status active`

5. Finalize:
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see Generation Instructions)
```

## Anti-Pattern Guard

The generated workflow MUST include the following section verbatim, placed immediately
after the Purpose heading and before the Algorithm block:

```
## Iron Laws

- YOU MUST NOT write any code, pseudocode, or implementation sketch.
- YOU MUST NOT produce a plan of your own before reading this workflow.
- YOU MUST follow the Algorithm below step by step. Reading it is not optional.
- If you have already read SPRINT_REQUIREMENTS.md and feel ready to decompose tasks:
  stop. Return to step 1 of the Algorithm and proceed from there.
```

## Generation Instructions

- **Persona Self-Load:** The generated workflow MUST begin by reading `.forge/personas/architect.md` as its first step (before any other tool use). This replaces the former inline `## Persona` section. The persona identity line (emoji, name, tagline) should be printed to stdout after reading the file.
- **Workflow Structure:** The generated `sprint_plan.md` must follow the strict "Algorithm" block format.
- **Context Isolation:** Forbid inline execution of task decomposition or estimation; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Use project-specific estimation guidelines.
  - Reference project's task manifest schema.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write the usage sidecar via `/forge:store emit {sprintId} '{sidecar-json}' --sidecar`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
