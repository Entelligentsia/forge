# /forge:add-pipeline

**Category:** Forge plugin command
**Run from:** Any Forge-initialised project directory

---

## Purpose

Conversational pipeline manager. Adds, customizes, views, or removes named pipeline definitions in `.forge/config.json`. Guides you through creating custom commands when a pipeline needs a phase that doesn't exist yet.

Use this when you have a recurring specialised task type that the default pipeline handles poorly. See [Customising workflows](../../customising-workflows.md) for the full context.

---

## Invocation

```bash
/forge:add-pipeline                    # conversational — pick a mode
/forge:add-pipeline api-client-sync    # add or edit a named pipeline
/forge:add-pipeline --list             # view configured pipelines
/forge:add-pipeline --remove name      # remove a pipeline
```

---

## Modes

The pipeline manager has four modes:

| Mode | What it does |
|------|-------------|
| **1. Add** | Create a new pipeline, phase by phase |
| **2. Customize** | Edit an existing pipeline — override phases, change models, reorder |
| **3. View** | List and inspect configured pipelines |
| **4. Remove** | Delete a pipeline from config |

When you run `/forge:add-pipeline` without arguments, the manager asks which mode you want. With a pipeline name, it jumps to Add mode pre-filled. With `--list`, it jumps to View. With `--remove`, it jumps to Remove.

---

## Add mode

### Step 1 — Understand the use case

The manager asks what kind of tasks this pipeline should handle. From your description, it suggests a pipeline name.

### Step 2 — Phase-by-phase walkthrough

Shows the standard Forge phases as a starting point:

| # | Phase role | Default command | Default model |
|---|-----------|----------------|--------------|
| 1 | plan | `plan` | sonnet |
| 2 | review-plan | `review-plan` | opus |
| 3 | implement | `implement` | sonnet |
| 4 | review-code | `review-code` | opus |
| 5 | validate | `validate` | opus |
| 6 | approve | `approve` | opus |
| 7 | commit | `commit` | haiku |

For each phase, you can:
- **Keep it** as the default
- **Override** it with a different command (custom or built-in)
- **Change the model** (haiku, sonnet, opus)
- **Skip it** entirely (remove from pipeline)
- **Add a new phase** at a specific position

If a custom command doesn't exist yet, the manager guides you through creating it (see Custom Command Creation below).

### Step 3 — Check for existing pipeline

If a pipeline with the same name already exists, asks whether to replace, edit, or pick a different name.

### Step 4 — Preview and confirm

Displays the full pipeline as it will be saved. You can approve, edit further, or cancel.

---

## Customize mode

Select an existing pipeline, then choose what to change:

| Intent | Action |
|--------|--------|
| Stricter review, same role | Custom command with tighter instructions |
| Faster / cheaper phase | Lower the model (sonnet → haiku) |
| Domain-specific validation | New custom command |
| Skip a phase entirely | Remove it from the phase list |
| Different agent persona | New custom command |
| Reorder phases | Specify new sequence; verify revision loops stay intact |

---

## View mode

Lists all configured pipelines and their phase counts. Drill into a specific pipeline to see full phase details.

---

## Remove mode

Checks for tasks that reference the pipeline being removed. Shows affected tasks and asks for confirmation. Tasks referencing a removed pipeline fall back to the default pipeline at runtime.

---

## Custom Command Creation

When a phase needs a command that doesn't exist yet, the manager creates it interactively:

1. **What should it do?** — behavior description
2. **What persona should it have?** — agent character and constraints
3. **What artifact does it produce?** — e.g., `SCHEMA_REVIEW.md`

From your answers, the manager:
- Picks a persona symbol based on the phase role (🌱 plan/implement, 🌿 review, ⛰️ approve, etc.)
- Creates the command file using `.forge/templates/CUSTOM_COMMAND_TEMPLATE.md` as scaffold
- Sets the phase's `workflow` field so the orchestrator can read it directly

Custom commands are created in `engineering/commands/` (or wherever `paths.customCommands` points).

---

## Validation

Before writing, the manager checks:

| Check | Failure behaviour |
|-------|-----------------|
| Each phase `role` is a valid enum value | Reject and re-prompt |
| `command` is non-empty | Reject and re-prompt |
| Pipeline name already exists | Ask whether to overwrite or abort |
| Pipeline name is `default` | Warn: `default` is Forge-managed. Create a named copy instead. |

All config writes are delegated to `manage-config` — the config file is never edited directly by the LLM.

---

## After adding a pipeline

```bash
/forge:regenerate workflows
```

The orchestrator is only updated on explicit regeneration — adding a pipeline to `config.json` alone is not sufficient.

---

## Tool dependency

Requires `engineering/tools/manage-config` to exist. If not yet generated:

```
The manage-config tool has not been generated yet.
Run /forge:init (phase 10) or /forge:regenerate tools to generate it first.
```

---

## Related commands

| Command | Purpose |
|---|---|
| [`/forge:regenerate workflows`](regenerate.md) | Wire new pipeline into the orchestrator |
| [`/forge:materialize`](materialize.md) | Materialize stubs if in fast mode |
| [`/run-task`](../task-pipeline/run-task.md) | See how pipelines are resolved at task execution time |