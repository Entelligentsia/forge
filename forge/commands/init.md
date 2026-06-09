---
name: init
description: Use when the current project has no Forge SDLC instance and you need to bootstrap one from scratch. Use --migrate to migrate an existing store to Forge format (replaces the removed /forge:migrate command).
---

# /forge:init

You are the Forge init orchestrator. Your job is to generate a complete, project-specific
AI software development lifecycle for the codebase in the current working directory.

## Locate the Forge plugin

Set `$FORGE_ROOT` to the plugin root provided by Claude Code:

```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT:-$(pwd)/.forge}"`
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

`--fast` and `--full` are accepted as no-ops for backwards compatibility with
scripts and CI pipelines. Both flags proceed with the standard 4-phase base-pack
init. The fast/full distinction was removed in v0.40.0.

**`--migrate` flag:** When `$ARGUMENTS` contains `--migrate`, run the store migration
workflow instead of the standard init. This is the v1.0 replacement for the removed
`/forge:migrate` command.

1. Check that `.forge/config.json` exists. If it does not, stop and tell the user:
   > "Forge has not been initialised in this project. Run `/forge:init` first, then come back to `/forge:init --migrate`."

2. Check for `--structural` sub-flag in `$ARGUMENTS`:
   - If present, load and run the structural migration workflow:
     Read `"$FORGE_ROOT/meta/workflows/meta-migrate.md"` and follow it.
   - If absent, run the standard store schema migration (Steps 1–7 of the former `migrate.md`):
     Read `"$FORGE_ROOT/meta/workflows/meta-migrate.md"` and follow it, passing
     `--store-schema` so it runs the schema migration path (Steps 2–7).

3. If `--dry-run` is also present, pass it through so the migration runs Steps 1–4
   only (no writes).

4. Do NOT proceed to the Pre-flight Plan when `--migrate` is present.

**Proceed directly to Pre-flight Plan** for all other invocations. There is no interactive mode prompt —
the 4-phase flow is the only flow.

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

If a `$ARGUMENTS` phase number is provided (e.g. `3`), skip the pre-flight
table and go straight to the specified phase.

Before dispatching, gather the following values interactively:

**KB Folder Prompt:**

```
What should your engineering knowledge base folder be named?
  Default: engineering

KB folder name [engineering]: ___
```

If the user provides a custom name, write it:
```sh
node "$FORGE_ROOT/tools/manage-config.cjs" set paths.engineering "{name}"
```
Set `kbFolder` to the chosen name (default: `"engineering"`).

**CLAUDE.md Offer:**

```sh
ls CLAUDE.md AGENTS.md CLAUDE.local.md .cursorrules 2>/dev/null
```

If NONE of those files exist, ask:
```
No CLAUDE.md / AGENTS.md found. Create a minimal CLAUDE.md with Forge KB links? [Y/n]: ___
```
Set `createClaudeMd = true` (default Y) or `false`.
If any file exists, set `createClaudeMd = false` (skip silently).

**Timestamp:** `isoTimestamp = new Date().toISOString()`

Execute the workflow:

```
workflow('wfl:init', {
  forgeRoot: FORGE_ROOT,
  kbFolder,
  startPhase,
  createClaudeMd,
  isoTimestamp,
  rawArguments: $ARGUMENTS
})
```

If the Workflow tool is unavailable, halt immediately with the following message:

> The Workflow tool is required to run `/forge:init`. This Claude Code build does not
> support the Workflow tool. Upgrade Claude Code and try again.
>
> (Alternatively, run `4ge init claude .` again to re-scaffold, then upgrade Claude Code.)

Do NOT fall back to reading `sdlc-init.md` or any other document — Iron Law 5.

**Post-workflow:** on `result.ok === true`, render closing banners (use `banners.cjs forge`
and `--subtitle "灯 SDLC ready…"`), emit the welcome block, present the marketplace-skills
offer from `result.skillMatches` (install accepted skills via `manage-config.cjs set
installedSkills.{id} true`), invoke `forge:refresh-kb-links` via the Skill tool, and
print the final report (KB doc count, workflow count, command count, accepted/skipped skills).

On `result.ok === false`: surface `result.failure` as formatted JSON and offer
`/forge:report-bug`.

The current working directory is the target project. All generated artifacts go into
`.forge/`, the configured KB folder (default: `engineering/`), and `.claude/commands/`
in the project.

## Arguments

$ARGUMENTS

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."
