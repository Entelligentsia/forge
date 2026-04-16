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

If the user chooses to resume: skip to the mapped phase in sdlc-init.md.
If the user chooses to start over: delete `.forge/init-progress.json` (using
`rm -f .forge/init-progress.json`) and show the pre-flight plan normally.

If the file does not exist, or contains invalid JSON, or contains an
unrecognized `lastPhase` value: delete the corrupt file and show the
pre-flight plan normally.

### Progress Output Format

At the start of every phase, emit a banner using this exact format:

```
━━━ Phase N/12 — <Phase Name> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Use full-width em-dashes to reach 65 characters total. All phase numbers are integers 1-12.

### Pre-flight Plan

Before executing Phase 1, emit the following summary block and wait for the user
to confirm or specify a start phase:

```
## Forge Init — <project-name>

12 phases will run in this session:
  1     Discover              — 5 parallel scans → 1 config
  2     Marketplace Skills    — match stack to plugins → 0-3 installs
  3     Knowledge Base        — architecture + domain docs → ~8 docs
  4     Personas              — project-specific agent identities → 3-5 personas
  5     Skills                — role-specific skill sets → 3-5 skill files
  6     Templates             — document formats → 5-8 templates
  7     Workflows             — 16 files generated in parallel → ~1-2 min
  8     Orchestration         — pipeline wiring → 2 workflows
  9     Commands              — slash command wrappers → 5-8 commands
  10    Tools                 — config update + schema copy + hash recording → schemas + config
  11    Smoke Test            — validate and self-correct → manifest + cache
  12    Tomoshibi             — link KB to agent instruction files → CLAUDE.md, AGENTS.md, etc.

Start from Phase 1? [Y] or specify phase: ___
```

If the user specifies a valid phase identifier, skip all earlier phases and begin
there. Valid inputs are: `1` through `12`.
Any other input (including `0`, `13`, or non-numeric text) triggers a re-prompt
with the same list.

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

If the user passes a phase name or number, resume from that phase.

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."
