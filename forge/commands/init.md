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

### Progress Output Format

At the start of every phase, emit a banner using this exact format:

```
━━━ Phase N/9 — <Phase Name> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Use full-width em-dashes to reach 65 characters total. Phase 1.5 is numbered `1.5`.
Phase 3b is numbered `3b`.

### Pre-flight Plan

Before executing Phase 1, emit the following summary block and wait for the user
to confirm or specify a start phase:

```
## Forge Init — <project-name>

9 phases will run in this session:
  1    Discover              — 5 parallel scans → 1 config
  1.5  Marketplace Skills    — match stack to plugins → 0-3 installs
  2    Knowledge Base        — architecture + domain docs → ~8 docs
  3    Personas              — project-specific agent identities → 3-5 personas
  3b   Skills                — role-specific skill sets → 3-5 skill files
  4    Templates             — document formats → 5-8 templates
  5    Workflows             — atomic workflow files → ~14 files
  6    Orchestration         — pipeline wiring → 2 workflows
  7    Commands              — slash command wrappers → 5-8 commands
  8    Tools                 — JSON schema copy + store validation → 5-8 schemas + tools
  9    Smoke Test            — validate and self-correct → manifest + cache

Start from Phase 1? [Y] or specify phase: ___
```

If the user specifies a valid phase identifier, skip all earlier phases and begin
there. Valid inputs are: `1`, `1.5`, `2`, `3`, `3b`, `4`, `5`, `6`, `7`, `8`, `9`.
Any other input (including `0`, `10`, or non-numeric text) triggers a re-prompt
with the same list.

Read `$FORGE_ROOT/init/sdlc-init.md` — that document is your complete orchestration.
Follow it exactly. It defines 9 phases:

1. **Discover** — scan the project (5 parallel discovery prompts)
2. **Generate Knowledge Base** — architecture + business domain docs
3. **Generate Personas** — project-specific agent identities
4. **Generate Templates** — project-specific document formats
5. **Generate Workflows** — project-specific atomic workflows
6. **Generate Orchestration** — pipeline wiring
7. **Generate Commands** — standalone slash commands in `.claude/commands/`
8. **Generate Tools** — deterministic tools in the project's language
9. **Smoke Test** — validate and self-correct

The current working directory is the target project. All generated artifacts go into
`.forge/`, `engineering/`, and `.claude/commands/` in the project.

## Arguments

$ARGUMENTS

If the user passes a phase name or number, resume from that phase.

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."
