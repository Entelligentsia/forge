---
requirements:
  reasoning: High
  context: Medium
  speed: Low
---

# 🌱 Workflow: Plan Task (Forge Engineer)

## Persona

🌱 **Forge Engineer** — I plan what will be built before any code is written.

**Your environment:**
- Syntax check: `node --check <file>`
- Store validation: `node forge/tools/validate-store.cjs --dry-run`
- No build step. No npm deps. No test runner.
- All JS files use `'use strict';` and Node.js built-ins only (`fs`, `path`, `os`, `https`).

---

I am running the Plan Task workflow for **{TASK_ID}** to produce an implementation plan.

## Step 1 — Load Context

- Read the task prompt from `engineering/sprints/{SPRINT_DIR}/{TASK_DIR}/`
- Read `engineering/architecture/INDEX.md` for the architecture map
- Read `engineering/architecture/stack.md` — language conventions, no-npm rule, hook/tool idioms
- Read `engineering/architecture/routing.md` — plugin interface structure (commands, hooks, tools)
- Read `engineering/architecture/database.md` — JSON store schema if the task touches `forge/schemas/`
- Read `engineering/architecture/deployment.md` — distribution model, version bump policy
- Read `engineering/architecture/processes.md` — material-change criteria
- Read `engineering/business-domain/INDEX.md` and `entity-model.md` — Sprint / Task / Bug / Event shapes
- Read `engineering/stack-checklist.md` — constraints every plan must address

## Step 2 — Research

- Identify every file in `forge/` that will need modification (Glob, Grep, Read)
- Understand the current implementation pattern in the area being modified
- Check for related tests (there are none — verify via `node --check` only)
- Identify whether the change is **material** (triggers version bump) or not:
  - Bug fixes to any command, hook, tool spec, or workflow → material
  - Tool-spec changes that alter generated tool behaviour → material
  - Command-file changes that alter behaviour → material
  - Hook changes → material
  - Schema changes to `.forge/store/` or `.forge/config.json` → material
  - Docs-only changes → NOT material

## Step 3 — Plan

Write `PLAN.md` at `engineering/sprints/{SPRINT_DIR}/{TASK_DIR}/PLAN.md` using
`.forge/templates/PLAN_TEMPLATE.md`.

**Plugin-specific sections to complete:**

- **Plugin Impact Assessment** — version bump? migration entry? security scan? schema change?
- **Files to Modify** — list every file in `forge/` being touched
- **Operational Impact** — will users need to run `/forge:update`? Is backwards compatibility preserved?
- **Verification Plan** — exact `node --check` commands and (if schema changed) `validate-store --dry-run`
- **Acceptance Criteria** — observable outcomes the Supervisor can verify

**YOU MUST declare the version bump decision in the plan.** If material, name the new version.
**YOU MUST declare whether a security scan is required.** Any change to `forge/` requires one.
**YOU MUST declare the migration entry** if material (with `regenerate` list and `breaking` flag).

## Step 4 — Knowledge Writeback

If undocumented patterns were discovered during research, update:
- `engineering/architecture/` relevant sub-doc (with `[?]` tag for supervisor confirmation)
- `engineering/stack-checklist.md` if a new convention was uncovered

Tag inline: `<!-- Discovered during {TASK_ID} — {date} -->`

## Step 5 — Emit Event + Update State

Write event to `.forge/store/events/{SPRINT_ID}/{eventId}.json`:

```json
{
  "eventId": "{ISO_TIMESTAMP}_{TASK_ID}_plan_plan-task",
  "taskId": "{TASK_ID}",
  "sprintId": "{SPRINT_ID}",
  "role": "plan",
  "action": "plan-task",
  "phase": "plan",
  "iteration": 1,
  "startTimestamp": "{START}",
  "endTimestamp": "{END}",
  "durationMinutes": {N},
  "model": "{full_model_id}"
}
```

Update `.forge/store/tasks/{TASK_ID}.json`: set `status` to `planned`.
