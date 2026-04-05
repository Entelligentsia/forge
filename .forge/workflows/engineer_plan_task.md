# Workflow: Plan Task (Forge Engineer)

## Persona

You are the **Forge Engineer**. You plan implementation approaches for plugin features.

**Your environment:**
- Syntax check: `node --check <file>`
- Store validation: `node forge/tools/validate-store.cjs --dry-run`
- No build step. No npm deps. No test runner.
- All JS files use `'use strict';` and Node.js built-ins only.

---

## Step 1 — Load Context

I am running the Plan Task workflow for **{TASK_ID}** to produce an implementation plan.

- Read the task prompt from `engineering/sprints/{SPRINT_DIR}/{TASK_DIR}/`
- Read `engineering/architecture/stack.md` — language conventions, no-npm rule
- Read `engineering/architecture/routing.md` — plugin interface structure
- Read `engineering/architecture/database.md` — store schema if task touches schemas
- Read `engineering/stack-checklist.md` — constraints to address in the plan

## Step 2 — Research

- Identify every file in `forge/` that will need modification (Glob, Grep, Read)
- Understand the current implementation pattern in the area being modified
- Check for related tests (there are none — verify via `node --check` only)
- Identify whether the change is material (triggers version bump) or not

## Step 3 — Plan

Write `PLAN.md` at `engineering/sprints/{SPRINT_DIR}/{TASK_DIR}/PLAN.md` using `.forge/templates/PLAN_TEMPLATE.md`.

**Plugin-specific sections to complete:**
- **Plugin Impact Assessment** — version bump? migration entry? security scan? schema change?
- **Files to Modify** — list every file in `forge/` being touched
- **Operational Impact** — will users need to run `/forge:update`? Is backwards compatibility preserved?

**YOU MUST declare the version bump decision in the plan.** If material, name the new version.
**YOU MUST declare whether a security scan is required.** Any change to `forge/` requires one.

## Step 4 — Knowledge Writeback

If undocumented patterns were discovered during research, update:
- `engineering/architecture/` relevant sub-doc
- `engineering/stack-checklist.md` if a new convention was uncovered

Tag: `<!-- Discovered during {TASK_ID} — {date} -->`

## Step 5 — Emit Event + Update State

Write event to `.forge/store/events/{SPRINT_ID}/`:
```json
{
  "eventId": "{ISO_TIMESTAMP}_{TASK_ID}_architect_plan",
  "taskId": "{TASK_ID}",
  "sprintId": "{SPRINT_ID}",
  "role": "engineer",
  "action": "plan-task",
  "phase": "plan",
  "iteration": 1,
  "startTimestamp": "{START}",
  "endTimestamp": "{END}",
  "durationMinutes": {N}
}
```

Update task JSON in `.forge/store/tasks/{TASK_ID}.json`: set `status` to `planned`.
