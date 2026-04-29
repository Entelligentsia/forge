# /forge:config

Inspect or change Forge project configuration.

## What it does

Reads and writes `.forge/config.json`. Manages the `mode` field — the only explicit mechanism for promoting a fast-mode install to full mode.

## Invocation

```
/forge:config                # Print full config summary
/forge:config mode           # Print current mode
/forge:config mode full      # Promote fast → full
/forge:config mode fast      # Refused (one-way transition)
```

## Subcommands

### No arguments — summary

Prints the full config summary: mode, version, project name and prefix, all paths, and installed skills. Read-only — never writes to disk.

### `mode` — print current mode

Outputs one of: `fast`, `full`, or `unset` (legacy installs predating the mode field). Read-only.

### `mode full` — promote fast to full

Promotes the project from fast mode to full mode. This is a **one-way transition**.

```mermaid
flowchart LR
    A["fast"] -->|"/forge:config mode full"| B["materialize\nall stubs"]
    B --> C["regenerate\nall artifacts"]
    C --> D["write\nmode: full"]
    D --> E["full"]

    style A fill:#e67e22,color:#fff
    style E fill:#2ecc71,color:#fff
```

The promotion sequence:
1. Read current mode. If already `full`, exit immediately.
2. Run full materialization — fills all stubs and missing artifacts.
3. Run default regeneration — refreshes all artifacts against current meta-definitions.
4. Write `mode: full` to config.

This is the **only code path** that writes `mode: full` after initial install. `regenerate` and `materialize` are mode-neutral — they read mode but never write it.

### `mode fast` — refused

There is no automatic full-to-fast downgrade. The artifacts materialized in full mode are real files with content. Demoting them would delete work without telling the user what was lost.

To reset, use `/forge:remove` then `/forge:init --fast`.

## Related

- [`/forge:materialize`](materialize.md) — fill stubs without changing mode
- [`/forge:regenerate`](regenerate.md) — rebuild generated artifacts