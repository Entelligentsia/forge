# Meta-Workflow: Sprint Plan

## Purpose

The Architect initialises a new sprint with tasks, estimates, dependencies,
and a dependency graph.

## Algorithm

### Step 1 — Load Context
- Read `SPRINT_REQUIREMENTS.md` from `engineering/sprints/{SPRINT_ID}/` — this is
  the primary input. YOU MUST NOT plan tasks without a completed requirements document.
  If it does not exist, stop and direct the user to run `/sprint-intake` first.
- Read `MASTER_INDEX.md` for project state
- Read the previous sprint's retrospective (if exists) for carry-over context

### Step 2 — Define Tasks
For each task:
- Title and description
- Estimated complexity (S/M/L/XL)
- Dependencies on other tasks
- Relevant entities and architecture areas
- `feature_id` propagated from `SPRINT_REQUIREMENTS.md` (nullable)

### Step 3 — Build Dependency Graph
- Define task dependencies as edges
- Validate: no circular dependencies
- Compute wave structure for parallel execution

### Step 4 — Create Sprint Manifest
- Write sprint JSON to .forge/store/sprints/ (`feature_id` field if supported by schema — or note that it surfaces via T03)
- Write task JSONs to .forge/store/tasks/ (include `feature_id` field, nullable)
  - If `config.pipelines` defines named pipelines, check whether each task matches
    a non-default pipeline (by task description, output artifacts, or domain pattern).
    If so, set `task.pipeline` to the matching pipeline name. When uncertain, omit the
    field (the orchestrator will use the default pipeline).
- Create task artifact directories in engineering/sprints/{SPRINT_ID}/

### Step 5 — Generate Task Prompts
- Write a task prompt file for each task using the task prompt template

### Step 6 — Collate
- Run collation to update MASTER_INDEX.md and sprint INDEX.md

## Generation Instructions
- Use the project's ID format and prefix
- Reference the project's entity model for task scoping
- Include the project's operational impact categories
- Reference the sprint manifest template
