---
requirements:
  reasoning: High
  context: Medium
  speed: Low
---

# 🗻 Workflow: Sprint Plan (Forge Architect)

## Persona Self-Load

As first action (before any other tool use), read `.forge/personas/architect.md`
and print the opening identity line to stdout.

🗻 **Forge Architect** — I hold the shape of the whole. I break requirements into tasks that can actually be built.

## Iron Law

**YOU MUST NOT plan tasks without a completed `SPRINT_REQUIREMENTS.md`.**
If it does not exist at `engineering/sprints/{SPRINT_ID}/SPRINT_REQUIREMENTS.md`,
stop and direct the user to run `/sprint-intake` first.

---

I am running the Sprint Plan workflow for **{SPRINT_ID}**.

## Step 1 — Load Context

- Read `engineering/sprints/{SPRINT_DIR}/SPRINT_REQUIREMENTS.md` — PRIMARY INPUT
- Read `engineering/MASTER_INDEX.md` — current project state
- Read the previous sprint's `RETROSPECTIVE.md` (if it exists) for carry-over context
- Read `engineering/architecture/routing.md` — understand which files belong to which layer (hook, tool, command, schema, meta-workflow)
- Read `engineering/business-domain/entity-model.md` — for task scoping around store entities
- Read `forge/.claude-plugin/plugin.json` and `forge/migrations.json` — current version and migration chain

## Step 2 — Define Tasks

For each task determine:

- **Title and description** — one line, scoped to one logical layer
- **Estimate:** `S` (<1h), `M` (1–3h), `L` (3–6h), `XL` (>6h)
- **Dependencies** on other tasks in this sprint
- **Layer:** hook / tool / command / schema / meta-workflow / docs
- **Files in `forge/`** being touched — used to assess version-bump and migration needs
- **Materiality:** does the change require a version bump?
- **Security scan required:** any change to `forge/` requires one
- **`feature_id`** — propagated from `SPRINT_REQUIREMENTS.md` (nullable; `null` for standalone sprints)

**Task-scoping rules (Forge-specific):**

- **One logical layer per task.** One hook, one tool, one command, one schema change, or one meta-workflow — not a mix.
- **Tasks that ship together must be linked as dependencies.** A schema change and the tool update that uses it MUST be in the same dependency chain.
- **Security scan is a sub-step of the implementation task**, not a separate task.
- **Version bump + migration entry is a sub-step of the implementation task**, not a separate task.
- **Cross-task conflicts** (e.g. two tasks that both edit the same command file) must be resolved by adding a dependency.

## Step 3 — Build Dependency Graph

- Define dependencies as edges (directed: `T01 → T02` means T02 depends on T01)
- Validate: **no circular dependencies**
- Compute wave structure for parallel execution (tasks with no inter-wave edges can run in parallel)

## Step 4 — Create Store Records

Write sprint JSON to `.forge/store/sprints/FORGE-S{NN}.json` following `.forge/schemas/sprint.schema.json`:

```json
{
  "sprintId": "FORGE-S{NN}",
  "feature_id": "{FEAT-NNN or null}",
  "title": "{Sprint Title}",
  "status": "planning",
  "taskIds": ["FORGE-S{NN}-T01", "FORGE-S{NN}-T02", ...],
  "executionMode": "sequential",
  "createdAt": "{ISO}"
}
```

Write task JSONs to `.forge/store/tasks/FORGE-S{NN}-T{NN}.json` following
`.forge/schemas/task.schema.json`:

```json
{
  "taskId": "FORGE-S{NN}-T{NN}",
  "feature_id": "{FEAT-NNN or null}",
  "sprintId": "FORGE-S{NN}",
  "title": "{Title}",
  "status": "planned",
  "path": "forge/{primary-file}",
  "estimate": "S|M|L|XL",
  "dependencies": ["FORGE-S{NN}-T{NN}", ...],
  "pipeline": "default"
}
```

**Pipeline selection:** if `config.pipelines` defines named pipelines and a task matches one (by description or output), set `task.pipeline` to that name. When uncertain, omit the field — the orchestrator will use the default pipeline.

Create task artifact directories: `engineering/sprints/{SPRINT_DIR}/{TASK_DIR}/`

## Step 5 — Generate Task Prompts

For each task, write a task prompt using `.forge/templates/TASK_PROMPT_TEMPLATE.md`
at `engineering/sprints/{SPRINT_DIR}/{TASK_DIR}/TASK_PROMPT.md`.

The prompt must reference:
- The specific files in `forge/` to modify
- The plan template at `.forge/templates/PLAN_TEMPLATE.md`
- Whether a version bump / migration / security scan is expected

## Step 6 — Collate

Run the runtime-read collate command:

```bash
FORGE_ROOT=$(node -e "console.log(require('./.forge/config.json').paths.forgeRoot)")
node "$FORGE_ROOT/tools/collate.cjs"
```

Or — since this repository is Forge itself — use the in-tree tool:

```bash
node forge/tools/collate.cjs
```

This updates `engineering/MASTER_INDEX.md` with the new sprint and tasks.

## Step 7 — Emit Event + Update State

Write an event to `.forge/store/events/{SPRINT_ID}/` with `role: "plan"`, `action: "sprint-plan"`.
Update sprint JSON: set `status` to `active`.
