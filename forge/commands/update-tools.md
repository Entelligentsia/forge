---
description: Use when you want to update the tools in engineering/tools/ and .forge/schemas/ to match the currently installed Forge plugin version
---

# /forge:update-tools

Copy the pre-built tools and schemas from the installed Forge plugin into this project.

Run this after upgrading the Forge plugin to get the latest tool versions,
or if `engineering/tools/` is missing or corrupted.

## Locate the plugin

```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

Read `.forge/config.json` for `paths.tools` (default: `engineering/tools`).

## Arguments

$ARGUMENTS

If the user specifies a tool name (e.g., `collate`), copy only that tool.
Otherwise copy all four tools and all schemas.

## Steps

### 1 — Show what will change

For each tool to be updated, show a diff between the current file in
`{paths.tools}/` and the source in `$FORGE_ROOT/tools/`.

If the files are identical, skip with: `collate.cjs — already up to date`

### 2 — Prompt before overwriting

If any diffs are non-empty, ask:
> "Update N tool(s)? [Y/n]"

If the user declines, exit without changes.

### 3 — Copy tools

Copy from `$FORGE_ROOT/tools/` to `{paths.tools}/`.
Make each file executable (`chmod +x`).

### 4 — Copy schemas (unless --tools-only)

Copy all four files from `$FORGE_ROOT/schemas/` to `.forge/schemas/`.

### 5 — Verify

Run:
```
node {paths.tools}/validate-store.cjs --dry-run
```

Report the result. Exit 0 on success, 1 on failure.

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."
