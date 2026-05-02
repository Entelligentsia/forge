---
name: enhance
description: Run the enhancement agent to fill placeholders, propose persona enrichments, or detect drift
---

# /forge:enhance

Run the Enhancement Agent to improve installed `.forge/` structural elements. The agent
operates in three modes selected by the `--phase` flag.

## Locate the Forge plugin

```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

Read `$FORGE_ROOT/meta/workflows/meta-enhance.md` and follow it. Pass `$ARGUMENTS` through
so the workflow receives the phase flag and any other options.

## Arguments

$ARGUMENTS

| Flag | Purpose |
|------|---------|
| `--phase 1` | Auto-apply: fill unsubstituted `{{KEY}}` placeholders using codebase signals (post-init mode) |
| `--phase 2` | Propose diffs: scan sprint artifacts and friction events; propose persona/skill enrichments for user review |
| `--phase 3` | Drift detection: full codebase vs structural-element comparison; propose targeted patches |
| `--auto`    | Synonym for `--phase 1` — used by the post-init hook (T09) |

Default: `--phase 3` when no flag is provided.

## On error

If the enhancement workflow is not found at `$FORGE_ROOT/meta/workflows/meta-enhance.md`,
emit:

> △ meta-enhance.md not found — your installed Forge version may predate the enhancement agent. Run `/forge:update` to upgrade.
