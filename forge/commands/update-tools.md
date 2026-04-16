---
name: update-tools
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

Copy all JSON Schema files from `$FORGE_ROOT/schemas/` to `.forge/schemas/`.
Create `.forge/schemas/` if it does not exist.

```sh
mkdir -p .forge/schemas
cp "$FORGE_ROOT/schemas/"*.schema.json .forge/schemas/
```

### 2 — Record hashes

Record each copied schema file in the generation manifest so health checks
can detect modifications:

```sh
for f in .forge/schemas/*.schema.json; do
  node "$FORGE_ROOT/tools/generation-manifest.cjs" record "$f"
done
```

### 3 — Verify

```sh
node "$FORGE_ROOT/tools/validate-store.cjs" --dry-run
```

Print `〇 Schemas updated and store validation passed.` on success.
Print `× Validation failed — {output}` on non-zero exit.

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."
