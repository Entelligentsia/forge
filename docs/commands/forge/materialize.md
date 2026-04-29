# /forge:materialize

Fill missing or stubbed Forge scaffolding without overwriting pristine files.

## What it does

Materializes deferred artifacts from fast-mode stubs. Unlike `/forge:regenerate` (which rebuilds regardless), materialize only fills what is missing or stubbed. It leaves user-modified files untouched.

Materialize is **mode-neutral** — it never writes the `mode` field in config. Promotion from fast to full is owned by `/forge:config mode full`.

## Invocation

```
/forge:materialize              # Full warm-up — all stubs + missing
/forge:materialize --all         # Same as no args
/forge:materialize workflows plan_task   # Single workflow's closure
/forge:materialize workflows:plan_task   # Colon form
```

## What happens

### Full warm-up (no arguments)

1. Checks the structure manifest for all expected workflow files.
2. Identifies stubs (files starting with `<!-- FORGE FAST-MODE STUB`) and missing files.
3. Computes the union closure across all stubs and missing workflows.
4. Materializes all stubs and missing files in one pass using the lazy-materialize rulebook.
5. Rebuilds the persona pack and architecture context pack.
6. Reports completion. If `mode` is still `fast`, suggests `/forge:config mode full`.

### Single workflow

1. Reads the lazy-materialize rulebook for the specified workflow.
2. Materializes the workflow's full closure (the workflow itself plus any personas, skills, or templates it depends on).
3. Does not change config mode.

## When to use

- After `/forge:init --fast` when you need a specific workflow.
- Before running a workflow that is still a stub (Forge does this automatically on first use).
- When you want all stubs filled but are not ready to commit to full mode.

## Related

- [`/forge:config`](config.md) — promote fast to full mode
- [`/forge:regenerate`](regenerate.md) — rebuild all generated artifacts
- [`/forge:init`](init.md) — initial project bootstrap