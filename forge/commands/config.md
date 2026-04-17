---
name: config
description: Inspect or change Forge project configuration. Owns the mode field — the explicit verb for promoting a fast-mode install to full.
---

# /forge:config

Read or change `.forge/config.json` values that are user-facing decisions
(currently: `mode`). Other config keys remain managed by their respective
commands (e.g. `paths.forgeRoot` is refreshed by `/forge:update`).

## Locate the Forge plugin

```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

Read `.forge/config.json`. If it does not exist, stop and emit:

```
× .forge/config.json not found. Run /forge:init first.
```

Then exit. (`manage-config.cjs` already prints this same message on missing
config, so the user-visible behaviour is consistent if you only invoke the
tool.)

## Arguments

$ARGUMENTS

Parse the argument:

```
/forge:config                    # Print summary of .forge/config.json
/forge:config mode               # Print current mode
/forge:config mode full          # Promote fast → full
/forge:config mode fast          # Refused (one-way transition)
```

The command shape is reserved for future expansion (e.g. `/forge:config kb
<path>`, `/forge:config paths <key> <value>`). Only the subcommands above
are implemented today.

---

## Visual

For all subcommands, open with a single `north` badge (config = bearings):

```sh
node "$FORGE_ROOT/tools/banners.cjs" --badge north
```

Subcommands that change state (`mode full`) also render a `forge` badge
inside the promotion sequence; subcommands that are read-only just print
the summary after the badge.

`banners.cjs` strips ANSI in `NO_COLOR` / non-tty / `--plain` contexts.

---

## Subcommand: `/forge:config` (no args) — summary

Read `.forge/config.json`. Emit a summary block:

```
━━━ Forge Configuration ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  mode:        {mode | "unset"}
  version:     {version}
  project:     {project.name} ({project.prefix})

  Paths
    engineering:   {paths.engineering}
    store:         {paths.store}
    workflows:     {paths.workflows}
    commands:      {paths.commands}
    templates:     {paths.templates}
    forgeRoot:     {paths.forgeRoot}

  Installed skills ({installedSkills.length})
    {one per line}
```

Use these tool invocations:

```sh
node "$FORGE_ROOT/tools/manage-config.cjs" get mode 2>/dev/null || echo "unset"
node "$FORGE_ROOT/tools/manage-config.cjs" get version
node "$FORGE_ROOT/tools/manage-config.cjs" get project
node "$FORGE_ROOT/tools/manage-config.cjs" get paths
node "$FORGE_ROOT/tools/manage-config.cjs" get installedSkills 2>/dev/null
```

This subcommand is **read-only** — it never writes to disk.

---

## Subcommand: `/forge:config mode` — print current mode

Read the `mode` field. Print one of:

```
fast
full
unset
```

Use:
```sh
node "$FORGE_ROOT/tools/manage-config.cjs" get mode 2>/dev/null || echo "unset"
```

Read-only.

---

## Subcommand: `/forge:config mode full` — promote fast → full

Promote the project from fast mode to full mode. This is a one-way
transition: it materialises every deferred artifact and refreshes everything
that was already materialised, then writes `mode: full`.

### Promotion sequence

1. **Read current mode**:
   ```sh
   CURRENT_MODE=$(node "$FORGE_ROOT/tools/manage-config.cjs" get mode 2>/dev/null || echo "unset")
   ```

2. **Short-circuit if already full**:
   - If `CURRENT_MODE == "full"`: emit `〇 Already in full mode. Nothing to do.` and exit 0.
   - If `CURRENT_MODE == "unset"`: treat as `full` (the project predates the
     mode field — it is already a full install). Emit
     `〇 mode is unset (legacy full install). Writing mode: full.`, then jump
     to Step 5 (skip materialize + regenerate, just write the field).

3. **Emit promotion banner** (forge badge + em-dash separator):
   ```sh
   node "$FORGE_ROOT/tools/banners.cjs" --badge forge
   ```
   ```
   ━━━ Promoting to Full Mode ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

4. **Run materialize-all**: read `$FORGE_ROOT/commands/materialize.md` and
   follow the **Full warm-up** branch (no arguments). This fills any
   missing or stubbed personas, skills, templates, and workflows.

   This step is intentionally invoked by reading the rulebook — do not
   inline its logic. If materialize errors, surface the error and stop;
   do not write `mode: full`.

5. **Run default regenerate**: read `$FORGE_ROOT/commands/regenerate.md`
   and follow the **Default (no argument)** branch. With everything now
   materialised, every artifact gets refreshed against the current
   meta-definitions.

   If regenerate errors, surface the error and stop; do not write
   `mode: full`.

6. **Write `mode: full`**:
   ```sh
   node "$FORGE_ROOT/tools/manage-config.cjs" set mode full
   ```

7. **Emit completion**:
   ```
   〇 Promoted to full mode.
   ```

### Invariant

This is the only code path in the Forge plugin that writes `mode: full`
after initial install. `regenerate` and `materialize` are
mode-neutral — they read mode but never write it.

---

## Subcommand: `/forge:config mode fast` — refused

Read the current mode.

- If `CURRENT_MODE == "fast"` (or `unset`): emit
  `〇 Already in fast mode.` and exit 0.
- Otherwise: emit and exit non-zero (status 1):
  ```
  × Cannot downgrade full → fast. Use /forge:remove and re-init to reset.
  ```

There is no automatic full → fast transition — the artefacts that were
materialised in full mode are real files with content; "demoting" them
would mean deleting work without telling the user what was lost. The
remove-and-re-init path is the explicit, observable way to reset.

---

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."
