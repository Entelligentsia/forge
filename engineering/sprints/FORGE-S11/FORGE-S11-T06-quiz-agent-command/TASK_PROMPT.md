# FORGE-S11-T06: Create quiz-agent slash command file (#50)

**Sprint:** FORGE-S11
**Estimate:** S
**Pipeline:** default

---

## Objective

`forge/commands/quiz-agent.md` does not exist. The `quiz_agent.md` workflow is generated for user projects (via `meta-quiz-agent.md`), but there is no corresponding slash command file to make it invocable as `/{prefix}:quiz-agent`. Create the command file following the standard Forge command template.

## Acceptance Criteria

1. `forge/commands/quiz-agent.md` exists and follows the standard command template format (description, effort frontmatter; reads the quiz_agent workflow; passes through args).
2. The file is consistent with other commands in `forge/commands/` (e.g., `plan.md`, `fix-bug.md`) in structure and frontmatter fields.
3. `node --check` is not applicable (MD file), but syntax/formatting must be correct.

## Context

- GitHub issue: #50
- Look at existing `forge/commands/plan.md`, `forge/commands/fix-bug.md`, or `forge/commands/run-task.md` as reference templates.
- The workflow this command invokes is `.forge/workflows/quiz_agent.md` (in user projects).
- This task must complete before T07, which adds quiz-agent to `generate-commands.md`.

## Plugin Artifacts Involved

- `forge/commands/quiz-agent.md` — new file

## Operational Impact

- **Version bump:** required (addressed in T08)
- **Regeneration:** users must run `/forge:update` (commands target) to get the new command
- **Security scan:** required (addressed in T08)
