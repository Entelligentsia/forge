# FORGE-S09-T07: Add-task mid-sprint command

**Sprint:** FORGE-S09
**Estimate:** M
**Pipeline:** default

---

## Objective

Create a `/forge:add-task` command that allows adding tasks to an existing sprint mid-flight.
The command runs a mini intake at task scope, determines the correct sprint, assigns the next
sequential task ID, creates the task directory + TASK_PROMPT.md, writes the task JSON to the
store, updates the sprint JSON, and runs collate.

## Acceptance Criteria

1. `/forge:add-task` creates a properly slotted task with store entry, directory, and
   TASK_PROMPT.md
2. The mini-intake captures enough detail for immediate implementation: requirements,
   acceptance criteria, and estimate
3. Tasks can be added to any sprint (not just the current one)
4. The command assigns the next sequential task ID within the target sprint
5. Sprint JSON is updated with the new task ID in the `taskIds` array
6. Collate runs successfully after task addition
7. `node --check` passes on all modified JS/CJS files

## Context

The mini-intake should reuse the sprint-intake interview pattern at task scope — a proven
structure. The command uses the store custodian for all store writes.

Reference `.forge/templates/TASK_PROMPT_TEMPLATE.md` for the task prompt format.
Reference `.forge/schemas/task.schema.json` for the task record format.
Reference `.forge/schemas/sprint.schema.json` for the sprint record format.

## Plugin Artifacts Involved

- `forge/commands/add-task.md` — new command file

## Operational Impact

- **Version bump:** required — new command shipped to all users
- **Regeneration:** users must run `/forge:update` to get the new command
- **Security scan:** required — new `forge/` file