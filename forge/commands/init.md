---
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
