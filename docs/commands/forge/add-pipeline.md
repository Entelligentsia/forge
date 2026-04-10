# /forge:add-pipeline

**Category:** Forge plugin command  
**Run from:** Any Forge-initialised project directory

---

## Purpose

Adds, updates, removes, or lists named pipeline definitions in `.forge/config.json`. All JSON reads and writes are delegated to the `manage-config` deterministic tool — the config file is never edited directly by the LLM.

Use this when you have a recurring specialised task type that the default pipeline handles poorly. See [Customising workflows](../../customising-workflows.md) for the full context.

---

## Invocation

```bash
/forge:add-pipeline api-client-sync          # add or update a pipeline
/forge:add-pipeline --list                   # list all configured pipelines
/forge:add-pipeline --remove api-client-sync # remove a pipeline
```

---

## Add / update mode

### Step 1 — Collect pipeline definition

The command prompts for:

1. **Description** — one sentence describing which task types should use this pipeline. The sprint planner matches this against task descriptions during `/sprint-plan` to auto-assign the pipeline.

2. **Phases** — one phase per line:
   ```
   <command>  <role>  [model]  [maxIterations]
   ```
   Valid roles: `plan`, `review-plan`, `implement`, `review-code`, `validate`, `approve`, `commit`

### Step 2 — Validate

Before touching the config file:

| Check | Failure behaviour |
|---|---|
| Each phase `role` is a valid enum value | Reject and re-prompt |
| `command` is non-empty | Reject and re-prompt |
| First phase is a `review-*` role | Warn: review with no preceding phase escalates immediately on first revision |
| Pipeline name already exists | Ask whether to overwrite or abort |
| Pipeline name is `default` | Warn: `default` is Forge-managed and updated by migrations. To customise the default flow, create a named pipeline as a copy instead — e.g. `/forge:add-pipeline my-default` — and assign it to tasks via their `pipeline` field. Editing `default` directly means your changes will be overwritten on the next migration that updates the default pipeline. |

### Step 3 — Preview and confirm

Prints the entry as it will appear in `config.json` and asks for confirmation before writing.

### Step 4 — Write

Delegates to `engineering/tools/manage-config`:

```
manage-config pipeline add <name> --description "..." --phases '[...]'
```

The tool validates the phases against the schema, writes atomically (temp file → rename), and preserves all other config fields exactly — key order, indentation, and unrelated sections are untouched.

### Step 5 — Post-write guidance

```
Pipeline "api-client-sync" added to .forge/config.json.

Next steps:
1. Ensure the commands listed as phases exist in .claude/commands/
2. Run /forge:regenerate workflows to wire pipeline routing into the orchestrator
3. Tasks are assigned this pipeline explicitly (in the JSON manifest) or automatically
   by the sprint planner when descriptions match during /sprint-plan
```

---

## List mode

```bash
/forge:add-pipeline --list
```

Calls `manage-config list-pipelines`. Prints a table:

```
Name              Description                                    Phases
default           (hardcoded)                                    6
api-client-sync   Regenerates typed API clients from OpenAPI     4
```

---

## Remove mode

```bash
/forge:add-pipeline --remove api-client-sync
```

1. Scans `.forge/store/tasks/` for any task with `"pipeline": "api-client-sync"` — lists them as affected.
2. Asks for explicit confirmation.
3. Calls `manage-config pipeline remove api-client-sync`.

Tasks that reference a removed pipeline will fail at orchestration time with an escalation (not a silent fallback).

---

## Tool dependency

Requires `engineering/tools/manage-config` to exist. If not yet generated:

```
The manage-config tool has not been generated yet.
Run /forge:init (phase 8) or /forge:regenerate tools to generate it first.
```

---

## After adding a pipeline

```bash
/forge:regenerate workflows   # wire routing into the generated orchestrator
```

The orchestrator is only updated on explicit regeneration — adding a pipeline to `config.json` alone is not sufficient.

---

## Related commands

| Command | Purpose |
|---|---|
| [`/forge:regenerate workflows`](regenerate.md) | Wire new pipeline into the orchestrator |
| [`/run-task`](../task-pipeline/run-task.md) | See how pipelines are resolved at task execution time |
