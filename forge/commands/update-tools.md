---
description: Use when you want to refresh .forge/schemas/ to match the currently installed Forge plugin version
---

# /forge:update-tools

Refresh the JSON schemas in `.forge/schemas/` from the installed Forge plugin.

Forge tools (`collate.cjs`, `manage-config.cjs`, etc.) ship with the plugin and
are invoked directly from `$FORGE_ROOT/tools/` — they are not copied to the project.
This command only manages schemas.

## Locate the plugin

```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

## Steps

### 1 — Copy schemas

Copy all four files from `$FORGE_ROOT/schemas/` to `.forge/schemas/`.
Create `.forge/schemas/` if it does not exist.

| Source | Destination |
|--------|-------------|
| `$FORGE_ROOT/schemas/task.schema.json` | `.forge/schemas/task.schema.json` |
| `$FORGE_ROOT/schemas/event.schema.json` | `.forge/schemas/event.schema.json` |
| `$FORGE_ROOT/schemas/sprint.schema.json` | `.forge/schemas/sprint.schema.json` |
| `$FORGE_ROOT/schemas/bug.schema.json` | `.forge/schemas/bug.schema.json` |

### 2 — Verify

```sh
node "$FORGE_ROOT/tools/validate-store.cjs" --dry-run
```

Print `〇 Schemas updated and store validation passed.` on success.
Print `× Validation failed — {output}` on non-zero exit.

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."
