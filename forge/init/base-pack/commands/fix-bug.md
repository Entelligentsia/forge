---
name: fix-bug
description: Triage, diagnose, and fix a bug
---

# /{{PREFIX}}:fix-bug

Read the fix-bug workflow and follow it.

## Locate the Forge plugin

```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

## Execute

workflow('wfl:fix-bug', $ARGUMENTS)

## Arguments

$ARGUMENTS