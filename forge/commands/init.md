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

If the file exists and contains a valid `lastPhase` value, emit:

```
〇 Previous init detected — last completed phase: {lastPhase}

Resume from Phase {nextPhase}? [Y] Start over [n]
```

Use the following phase-to-resume mapping:

| lastPhase | Resume from (nextPhase) |
|-----------|-------------------------|
| 1         | Phase 2                 |
| 2         | Phase 3                 |
| 3         | Phase 4                 |
| 4         | Phase 5                 |
| 5         | Phase 6                 |
| 6         | Phase 7                 |
| 7         | Phase 8                 |
| 8         | Phase 9                 |
| 9         | Phase 10                |
| 10        | Phase 11                |
| 11        | Phase 12                |

If the user chooses to resume: read the stored mode from
`.forge/init-progress.json` (fallback chain: `init-progress.json` `mode` →
`.forge/config.json` `mode` → `"full"`), then run the **Stored-mode sub-prompt**
below before jumping to the mapped resume phase.

If the user chooses to start over: delete `.forge/init-progress.json` (using
`rm -f .forge/init-progress.json`) and proceed to **Mode Selection** below.

If the file does not exist, or contains invalid JSON, or contains an
unrecognized `lastPhase` value: delete the corrupt file and proceed to
**Mode Selection** below.

#### Stored-mode sub-prompt (resume only)

After confirming resume, emit (substituting the stored mode):

```
〇 Previous init used: <stored-mode> mode

Continue in <stored-mode> mode? [Y] Or switch: [1] Fast / [2] Full
```

Input handling:
- Empty / `Y` / `y` → keep stored mode.
- `1` / `fast` → switch to Fast mode.
- `2` / `full` → switch to Full mode.
- Anything else → re-emit the sub-prompt.

If the user switches modes, update the `mode` field in
`.forge/init-progress.json` while preserving every other field
(`lastPhase`, `timestamp`, `phase7`, etc.):

```sh
node -e "const fs=require('fs'),f='.forge/init-progress.json'; const o=JSON.parse(fs.readFileSync(f,'utf8')); o.mode='<new-mode>'; fs.writeFileSync(f,JSON.stringify(o,null,2)+'\n')"
```

Then, **only if `.forge/config.json` already exists** (i.e. Phase 1 has run),
also update it:

```sh
node "$FORGE_ROOT/tools/manage-config.cjs" set mode <new-mode>
```

If `config.json` does not yet exist, do not call `manage-config.cjs set` —
Phase 1 will read the chosen mode from `init-progress.json` and write it then.

Switch warnings (emit exactly once when the mode flips):
- **Fast → Full:** `△ Switching to full will regenerate the skipped phases (4, 5, 6, 8) on this run.`
- **Full → Fast:** `△ Existing full-mode artifacts remain on disk. Future phases will honour fast-mode behaviour (stubs, skipped phases).`

After mode confirmation, jump to the mapped resume phase. If the resume
phase is skipped in the chosen mode, emit:

```
△ Phase {N} is skipped in {mode} mode. Advancing to the next active phase: Phase {M}.
```

Then jump to the next active phase. The fast-mode phase map is:
`1, 2, 3 (skeleton), 7 (stubs), 9, 10, 11, 12`. Phases `4, 5, 6, 8` are
skipped in fast mode.

### Hero

Before Mode Selection, render the Forge hero block once per session:

```sh
node "$FORGE_ROOT/tools/banners.cjs" forge
node "$FORGE_ROOT/tools/banners.cjs" --subtitle "AI SDLC bootstrapper · forge:init v$(node -p "require('$FORGE_ROOT/.claude-plugin/plugin.json').version")"
```

The hero runs once. If the user starts over after a checkpoint, render
the hero again (fresh session feel). If the user resumes mid-init, do
NOT re-render the hero — just emit the badge for the resume target
phase.

### Mode Selection

Before showing the pre-flight plan, choose the init mode.

**Flag override:** if `$ARGUMENTS` contains `--fast` or `--full` (but not both),
skip the prompt entirely. Emit the matching one-line ack and proceed straight
to the **Pre-flight Plan** with the chosen mode:

- `--fast` present → `〇 Fast mode selected (via --fast flag)`
- `--full` present → `〇 Full mode selected (via --full flag)`

**Conflict:** if `$ARGUMENTS` contains BOTH `--fast` AND `--full`, halt
immediately with `× Conflicting flags: --fast and --full cannot be combined.`
Do not write `.forge/init-progress.json`. Do not proceed.

**Otherwise**, emit the banner and prompt the user:

```
━━━ Init Mode ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Forge can bootstrap your SDLC in two modes:

  [1] Fast  — scaffold + lazy materialisation (KB skeleton + 16
             workflow stubs that self-materialise on first use). ~30s.
             〇 Best for: most projects. Heavy generation is deferred
                to first workflow invocation (~1–2 min per workflow).

  [2] Full  — generate everything now (KB docs, personas, skills,
             templates, workflows, orchestration). ~10–15 min.
             〇 Best for: offline work, evaluating end-to-end output.

Which mode? [1] Fast / [2] Full  (default: 1): ___
```

Input handling:
- `1`, `fast`, empty (Enter) → Fast mode.
- `2`, `full` → Full mode.
- Anything else → re-emit the banner above and re-prompt. No silent fallback.

**Persist the chosen mode pre-Phase-1.** As soon as a valid choice is made
(whether from the prompt or a flag), write a stub progress record:

```sh
mkdir -p .forge
cat > .forge/init-progress.json <<JSON
{ "lastPhase": 0, "mode": "<MODE>" }
JSON
```

`<MODE>` is the literal string `full` or `fast`. `sdlc-init.md` reads this
file at its Fast-mode detection step and Phase 1 propagates the value into
`.forge/config.json`.

### Progress Output Format

At the start of every phase, emit a banner using this exact format:

```
━━━ Phase N/12 — <Phase Name> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Use full-width em-dashes to reach 65 characters total. All phase numbers are integers 1-12.

### Pre-flight Plan

Before executing Phase 1, emit a mode-specific summary block and wait for the
user to confirm or specify a start phase. The block depends on the mode chosen
in **Mode Selection**.

#### Full mode

```
## Forge Init — <project-name>  [Full mode]

12 phases will run in this session (~10–15 min):
  1   Discover            — 5 parallel scans → 1 config
  2   Marketplace Skills  — match stack to plugins → 0-3 installs
  3   Knowledge Base      — architecture + domain docs → ~8 docs
  4   Personas            — project-specific agent identities → 3-5 personas
  5   Skills              — role-specific skill sets → 3-5 skill files
  6   Templates           — document formats → 5-8 templates
  7   Workflows           — 16 files generated in parallel → ~1-2 min
  8   Orchestration       — pipeline wiring → 2 workflows
  9   Commands            — slash command wrappers → 5-8 commands
  10  Tools               — config update + schema copy + hash recording
  11  Smoke Test          — validate and self-correct → manifest + cache
  12  Tomoshibi           — link KB to agent instruction files

Start from Phase 1? [Y] or specify phase: ___
```

#### Fast mode

```
## Forge Init — <project-name>  [Fast mode ~30s]

12 phases — 7 run now, 5 deferred to first workflow use:
  1   Discover            [runs]     5 parallel scans → 1 config
  2   Marketplace Skills  [runs]     match stack to plugins
  3   Knowledge Base      [skeleton] MASTER_INDEX + empty dirs
  4   Personas            [deferred] materialised on first use
  5   Skills              [deferred] materialised on first use
  6   Templates           [deferred] materialised on first use
  7   Workflows           [stubs]    16 self-materialising stubs
  8   Orchestration       [deferred] materialised on first use
  9   Commands            [runs]     slash command wrappers
  10  Tools               [runs]     schema copy + hash recording
  11  Smoke Test          [runs]     fast-mode invariant checks
  12  Tomoshibi           [runs]     link KB to agent files

△ First use of any generated command triggers ~1-2 min of on-demand
  materialisation for that workflow and its dependencies.

Start from Phase 1? [Y] or specify phase: ___
```

If the user specifies a valid phase identifier, skip all earlier phases and begin
there. Valid inputs are: `1` through `12`.
Any other input (including `0`, `13`, or non-numeric text) triggers a re-prompt
with the same list.

If a `$ARGUMENTS` mode flag was combined with a phase number (e.g. `--fast 5`),
skip both the mode prompt and the pre-flight table — go straight to the
specified phase under the chosen mode.

Read `$FORGE_ROOT/init/sdlc-init.md` — that document is your complete orchestration.
Follow it exactly. It defines 12 phases:

1. **Discover** — scan the project (5 parallel discovery prompts)
2. **Marketplace Skills** — match stack to plugins → 0-3 installs
3. **Generate Knowledge Base** — architecture + business domain docs
4. **Generate Personas** — project-specific agent identities
5. **Generate Skills** — role-specific skill sets
6. **Generate Templates** — project-specific document formats
7. **Generate Workflows** — project-specific atomic workflows
8. **Generate Orchestration** — pipeline wiring
9. **Generate Commands** — standalone slash commands in `.claude/commands/`
10. **Generate Tools** — deterministic tools in the project's language
11. **Smoke Test** — validate and self-correct
12. **Tomoshibi** — link KB to agent instruction files

The current working directory is the target project. All generated artifacts go into
`.forge/`, the configured KB folder (default: `engineering/`), and `.claude/commands/`
in the project.

## Arguments

$ARGUMENTS

### Mode flags

By default `/forge:init` is interactive — see **Mode Selection** above.
For scripted or CI runs, two flags suppress the prompt:

- `--full` — run in full mode without prompting.
- `--fast` — run in fast mode without prompting.

Both flags are non-interactive escape hatches; the interactive prompt remains
the default and surfaces both modes to first-time users.

#### Fast mode

When fast mode is active (via prompt choice or `--fast`):
- Phases 1, 2, 9, 10, 11, 12 run fully.
- Phase 3 writes a KB skeleton only (no LLM doc generation).
- Phases 4, 5, 6, 8 are skipped entirely.
- Phase 7 writes stub workflow files that self-materialise on first use.
- Phase 11 validates fast-mode invariants (stubs present, commands present, schema present).

Fast mode completes in ~30s (plus Phase 2 user interaction). Heavy LLM generation
is deferred to first use by each workflow's self-ensure boilerplate.

Use `/forge:materialize` to warm up scaffolding explicitly, or let each command
trigger its own materialisation automatically on first invocation.

#### Conflicting flags

`--fast` and `--full` together halt the run before any write:

```
× Conflicting flags: --fast and --full cannot be combined.
```

#### Combining mode flags with a phase number

Mode flags compose with a phase argument. `--fast 5` selects fast mode (skipping
both the mode prompt and the pre-flight table) and jumps directly to Phase 5
under the fast-mode phase map.

If the user passes only a phase name or number (no mode flag), the mode prompt
still runs first; the user picks a mode, then init resumes at the specified phase.

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."
