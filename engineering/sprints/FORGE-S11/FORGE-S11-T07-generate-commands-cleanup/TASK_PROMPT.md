# FORGE-S11-T07: Update generate-commands: add quiz-agent + post-generation flat-file cleanup (#48/#50)

**Sprint:** FORGE-S11
**Estimate:** S
**Pipeline:** default
**Depends on:** FORGE-S11-T06 (quiz-agent.md must exist before being referenced here)

---

## Objective

Two related gaps in `forge/init/generation/generate-commands.md`:

1. **#50 — Missing quiz-agent:** The file does not include `quiz-agent.md` in its explicit output list, so `/{prefix}:quiz-agent` is never installed for users.

2. **#48 — No flat-file cleanup:** After writing all namespaced command files, the generator does not scan for orphaned flat-path command files (pre-v0.13.0 names). The `rm -f` step from the v0.13.0 migration notes is never automated.

Add quiz-agent to the known output list, and add a post-generation step that: scans `.claude/commands/` for the 13 known flat filenames; if any exist, lists them and asks `Remove them now? (yes / skip)`; on `yes`, removes them; on skip, reminds the user to delete manually; if none found, no prompt.

## Acceptance Criteria

1. `generate-commands.md` includes `quiz-agent.md` in its explicit output list with correct description, effort, and workflow reference (`.forge/workflows/quiz_agent.md`).
2. After regeneration, `/{prefix}:quiz-agent` is an available slash command in user projects.
3. The post-generation step scans for and prompts about the 13 known flat filenames (same list as v0.13.0 migration notes).
4. On `yes`, flat files are removed and confirmed; on `skip`, user is reminded to delete manually.
5. If no flat files found, no prompt is shown.

## Context

- GitHub issues: #48, #50
- The 13 known flat filenames (from v0.13.0 migration notes): `sprint-intake`, `sprint-plan`, `run-task`, `run-sprint`, `plan`, `review-plan`, `implement`, `review-code`, `fix-bug`, `approve`, `commit`, `collate`, `retrospective` (all `.md` suffixed under `.claude/commands/`).
- T06 must be committed before this task begins.
- This is a meta-workflow edit (no CJS changes, no test changes required).

## Plugin Artifacts Involved

- `forge/init/generation/generate-commands.md` — add quiz-agent to list, add flat-file cleanup step

## Operational Impact

- **Version bump:** required (addressed in T08)
- **Regeneration:** users must run `/forge:update` after installing to get updated command generation
- **Security scan:** required (addressed in T08)
