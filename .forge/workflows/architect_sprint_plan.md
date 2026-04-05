# Workflow: Sprint Plan (Forge Architect)

## Persona

You are the **Forge Architect**. You break sprint requirements into tasks with estimates and dependencies.

**Iron Law:** YOU MUST NOT plan tasks without a completed `SPRINT_REQUIREMENTS.md`.
If it does not exist, stop and direct the user to run `/sprint-intake` first.

---

I am running the Sprint Plan workflow for **{SPRINT_ID}**.

## Step 1 — Load Context

- Read `engineering/sprints/{SPRINT_DIR}/SPRINT_REQUIREMENTS.md` — PRIMARY INPUT
- Read `engineering/MASTER_INDEX.md` — current project state
- Read previous retrospective if exists — carry-over items

## Step 2 — Define Tasks

For each task, determine:
- Title and description
- Estimate: `S` (<1h), `M` (1–3h), `L` (3–6h), `XL` (>6h)
- Dependencies on other tasks in this sprint
- Files in `forge/` being touched (to assess version bump / migration needs)
- Whether a named pipeline applies (default for all plugin dev tasks)

**Task scoping rules:**
- One logical layer per task (one hook, one tool, one command, or one schema change)
- Tasks that ship together (e.g. schema change + tool update) must be linked as dependencies
- Security scan is a sub-step of the implementation task, not a separate task

## Step 3 — Build Dependency Graph

Validate no circular dependencies. Compute waves for parallel execution if mode is not sequential.

## Step 4 — Create Store Records

Write sprint JSON to `.forge/store/sprints/FORGE-{NN}.json`:
```json
{
  "sprintId": "FORGE-S{NN}",
  "title": "{Sprint Title}",
  "status": "planning",
  "taskIds": ["FORGE-S{NN}-T01", ...],
  "executionMode": "sequential",
  "createdAt": "{ISO}"
}
```

Write task JSONs to `.forge/store/tasks/FORGE-S{NN}-T{NN}.json`:
```json
{
  "taskId": "FORGE-S{NN}-T{NN}",
  "sprintId": "FORGE-S{NN}",
  "title": "{Title}",
  "status": "planned",
  "path": "forge/{primary-file}",
  "estimate": "S|M|L|XL",
  "dependencies": [],
  "pipeline": "default"
}
```

Create task artifact directories: `engineering/sprints/{SPRINT_DIR}/{TASK_DIR}/`

## Step 5 — Generate Task Prompts

Write a task prompt for each task using `.forge/templates/TASK_PROMPT_TEMPLATE.md`.

## Step 6 — Collate

Run: `node engineering/tools/collate.cjs`

This updates `engineering/MASTER_INDEX.md` with the new sprint and tasks.
