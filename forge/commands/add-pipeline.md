---
description: Use when you want to add or update a named pipeline in .forge/config.json so the orchestrator can route tasks to specialized agent commands
---

# /forge:add-pipeline

Add or update a named pipeline entry in `.forge/config.json`.

## Locate tools

```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

Resolve the `manage-config` tool path:
```
MANAGE_CONFIG: !`ls engineering/tools/manage-config.* 2>/dev/null | head -1`
```

If `MANAGE_CONFIG` is empty, stop and tell the user:
> "The manage-config tool has not been generated yet. Run `/forge:init` (phase 8)
> or `/forge:regenerate` with `tools` argument to generate it first."

## Arguments

$ARGUMENTS

Parse arguments to extract:
- `PIPELINE_NAME` — the pipeline key (e.g., `measure-conversion`). Required.
- `--remove` flag — if present, remove the named pipeline instead of adding.
- `--list` flag — if present, list all configured pipelines and exit.

If `PIPELINE_NAME` is missing and neither flag is set, ask the user for the name
before continuing.

## List mode (`--list`)

```sh
[ -n "$MANAGE_CONFIG" ] && $MANAGE_CONFIG list-pipelines || echo "manage-config tool not found — run /forge:init or /forge:update-tools first."
```

Exit after printing — do not modify config.

## Remove mode (`--remove PIPELINE_NAME`)

1. Check for tasks that reference this pipeline:
   ```sh
   grep -rl '"pipeline": "PIPELINE_NAME"' .forge/store/tasks/ 2>/dev/null
   ```
   If any are found, list them and warn the user that those tasks will fail at
   orchestration time. Ask for explicit confirmation before continuing.

2. Remove the pipeline:
   ```sh
   [ -n "$MANAGE_CONFIG" ] && $MANAGE_CONFIG pipeline remove PIPELINE_NAME
   ```
   The tool exits 1 if the name does not exist — surface that error directly.

## Add / update mode

### Step 1 — Collect pipeline definition

If the user's arguments contain a full pipeline description (phases listed inline),
parse it. Otherwise, ask the user for:

1. **Description** — one sentence describing which task types should use this
   pipeline. This is what the sprint planner uses to auto-assign `task.pipeline`.
   Required for all pipelines except `default`.

2. **Phases** — one phase per line in the format:
   ```
   <command>  <role>  [model]  [maxIterations]
   ```
   Valid roles: `plan`, `review-plan`, `implement`, `review-code`, `approve`, `commit`

   Collect phases until the user signals done (empty line or "done").

### Step 2 — Validate (before touching config)

Check each phase before invoking the tool:
- If any `review-*` role is the **first** phase in the pipeline, warn the user:
  > "A review phase with no preceding phase will cause the orchestrator to
  > escalate immediately on first revision request — is this intended?"
- If `PIPELINE_NAME` is `default`, acknowledge it will override the hardcoded
  default pipeline for all tasks without a `pipeline` field.

Check whether the pipeline already exists:
```sh
[ -n "$MANAGE_CONFIG" ] && $MANAGE_CONFIG get pipelines.PIPELINE_NAME 2>/dev/null || true
```
If output is non-empty, tell the user and ask whether to overwrite or abort.

### Step 3 — Preview

Construct the phases JSON array from the collected input and print the entry
as it will appear in `config.json`:

```json
"<PIPELINE_NAME>": {
  "description": "...",
  "phases": [...]
}
```

Ask the user to confirm before writing.

### Step 4 — Write

Invoke the tool to write atomically:
```sh
[ -n "$MANAGE_CONFIG" ] && $MANAGE_CONFIG pipeline add PIPELINE_NAME --description "DESCRIPTION" --phases 'PHASES_JSON'
```

The tool validates the phases against the schema and preserves all other config
fields exactly — key order, indentation, and unrelated sections are untouched.
If the tool exits non-zero, surface its error output and stop.

### Step 5 — Post-write guidance

Print:

```
Pipeline "<PIPELINE_NAME>" added to .forge/config.json.

Next steps:
1. Ensure the commands listed as phases exist as slash commands in .claude/commands/.
2. Run /forge:regenerate to wire pipeline routing into the generated orchestrator.
   (Existing orchestrate_task.md files do not pick up new pipelines automatically.)
3. To assign this pipeline to a task, set "pipeline": "<PIPELINE_NAME>" in the
   task's .forge/store/tasks/<TASK_ID>.json, or let the sprint planner assign it
   automatically during the next /sprint-plan run.
```

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."
