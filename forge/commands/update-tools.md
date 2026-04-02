---
description: Use when tool specs have changed and engineering/tools/ needs to be regenerated to match
---

# /forge:update-tools

Regenerate the deterministic tools in `engineering/tools/` from the Forge plugin's
latest tool specs.

## What this does

First, resolve the plugin root:
```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

1. Read `.forge/config.json` for project language and paths
2. Read tool specs from `$FORGE_ROOT/meta/tool-specs/`
3. For each tool spec (`collate`, `seed-store`, `validate-store`, `manage-config`):
   a. Read the current spec from the plugin
   b. Read the current generated tool from `engineering/tools/`
   c. Show the user what changed in the spec
   d. Offer to regenerate the tool
4. Generate new tool in the project's language
5. Show diff between old and new tool
6. Prompt before overwriting — the team may have customised the tool

## Arguments

$ARGUMENTS

If the user specifies a tool name (e.g., "collate"), update only that tool.
