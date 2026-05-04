---
name: init
description: Use when the current project has no Forge SDLC instance and you need to bootstrap one from scratch
---

# /forge:init

You are the Forge init orchestrator. Your job is to generate a complete, project-specific
AI software development lifecycle for the codebase in the current working directory.

## Locate the Forge plugin

Set `$FORGE_ROOT` to the plugin root provided by Claude Code:

```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

`$FORGE_ROOT` is the directory containing `meta/`, `init/`, `hooks/`, and `commands/`.

## Execute

### Resume Detection

Before showing the pre-flight plan, check for an existing checkpoint:

```sh
cat .forge/init-progress.json 2>/dev/null
```

If the file exists and contains valid JSON, inspect it:

- If `lastPhase > 4`, contains a `mode` field, contains a `phase-7-substep-map` key,
  or is missing a `timestamp` field — treat as a stale checkpoint from a previous
  run of the old 12-phase init. Delete the file:
  ```sh
  rm -f .forge/init-progress.json
  ```
  Then proceed to the **Pre-flight Plan** (new 4-phase flow, no mode prompt).

- If the file contains valid JSON with `lastPhase` in range 1–4 and a `timestamp`
  field, emit the resume banner:

```
〇 Previous init detected — last completed phase: {lastPhase} of 4

Resume from Phase {nextPhase}? [Y] Start over [n]
```

Use the following mapping:

| lastPhase | Resume from (nextPhase) |
|-----------|-------------------------|
| 1         | Phase 2                 |
| 2         | Phase 3                 |
| 3         | Phase 4                 |

If the user chooses to resume: jump to the mapped resume phase.

If the user chooses to start over: delete `.forge/init-progress.json`
(`rm -f .forge/init-progress.json`) and proceed to the **Pre-flight Plan**.

If the file does not exist, or contains invalid JSON, or contains an
unrecognised `lastPhase` value outside 1–4: delete any corrupt file and
proceed to the **Pre-flight Plan**.

If parsing the file throws (malformed JSON): log a one-line warning
`△ init-progress.json is malformed — deleting and starting fresh.`, delete
the file, and proceed to the **Pre-flight Plan**.

### Hero

Render the Forge hero block once per session:

```sh
node "$FORGE_ROOT/tools/banners.cjs" forge
node "$FORGE_ROOT/tools/banners.cjs" --subtitle "AI SDLC bootstrapper · forge:init v$(node -p "require('$FORGE_ROOT/.claude-plugin/plugin.json').version")"
```

The hero runs once. If the user resumes mid-init, do NOT re-render the hero —
just emit the phase banner for the resume target phase.

### Flag handling

**Conflict check first:** if `$ARGUMENTS` contains BOTH `--fast` AND `--full`, halt
immediately with:
```
× Conflicting flags: --fast and --full cannot be combined.
```
Do not write `.forge/init-progress.json`. Do not proceed.

**Single flag present (`--fast` or `--full`):** accept with a one-line acknowledgement
and continue to **Pre-flight Plan** — both flags run the identical new 4-phase flow:

- `--fast` present → emit `〇 --fast accepted — running 4-phase base-pack init (fast and full are now equivalent)`
- `--full` present → emit `〇 --full accepted — running 4-phase base-pack init`

**No flags:** proceed directly to **Pre-flight Plan**. There is no interactive mode
prompt — the 4-phase flow is the only flow.

### Pre-flight Plan

Before executing Phase 1, emit a summary block and wait for the user to confirm
or specify a start phase.

```
## Forge Init — <project-name if discoverable, otherwise current directory name>

4 phases will run in this session (~45 seconds non-interactive):

  1   Collect      — 5 parallel discovery scans → config.json
                     KB folder prompt (interactive)
  2   Discover     — KB doc generation (LLM fan-out) + project-context.json
  3   Materialize  — substitute-placeholders.cjs → fully functional workflows
  4   Register     — versioning, manifest, cache, store entries, Tomoshibi

Phase 1 is interactive (KB folder name prompt). Phases 2–4 are non-interactive
and complete in under 45 seconds.

Start from Phase 1? [Y] or specify phase (1–4): ___
```

If the user specifies a valid phase (1–4), jump there directly.
Any other input (including 0, 5+, or non-numeric text) re-prompts with the same table.

If a `$ARGUMENTS` phase number was combined with a flag (e.g. `--fast 3`),
skip both the flag acknowledgement and the pre-flight table and go straight
to the specified phase.

Read `$FORGE_ROOT/init/sdlc-init.md` — that document is your complete orchestration.
Follow it exactly. It defines 4 phases:

1. **Collect** — 5 parallel discovery prompts, KB folder prompt, `config.json`
2. **Discover** — KB doc fan-out + inline `project-context.json` construction
3. **Materialize** — `substitute-placeholders.cjs` + `build-overlay.cjs` smoke test
4. **Register** — tools, versioning, manifest, cache, store seed, Tomoshibi, `.gitignore` update (unconditional), CLAUDE.md KB-link offer

The current working directory is the target project. All generated artifacts go into
`.forge/`, the configured KB folder (default: `engineering/`), and `.claude/commands/`
in the project.

## Arguments

$ARGUMENTS

### Mode flags (backwards compatibility)

`--fast` and `--full` are accepted for scripted and CI use. Both flags select the
new 4-phase base-pack init — the distinction between fast and full mode is
obsolete because base-pack template substitution is instant and always produces
fully functional (non-stub) workflows.

#### Conflicting flags

`--fast` and `--full` together halt the run before any write:

```
× Conflicting flags: --fast and --full cannot be combined.
```

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."
