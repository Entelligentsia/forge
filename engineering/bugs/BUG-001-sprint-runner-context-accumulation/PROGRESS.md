# PROGRESS — BUG-001: Sprint runner accumulates context across tasks

**Bug:** BUG-001
**Sprint:** (standalone bug fix)

---

## Summary

The sprint runner (`run_sprint.md`) and task orchestrator (`orchestrate_task.md`) both
invoked phase slash commands inline — in the same conversation context as the orchestrator.
This accumulated context across every phase of every task, violating Forge's design
principle of keeping context light and nimble.

Fixed by replacing all `invoke_slash_command` calls with `spawn_subagent` (Agent tool)
calls. Each phase now runs in a fresh context window; the orchestrator reads results from
disk artifacts after each subagent returns. Also fixed `run_sprint.md` to delegate entire
task pipelines to per-task subagents (rather than duplicating the phase loop inline), and
updated the source template `meta-orchestrate.md` and `generate-orchestration.md` so new
installs via `/forge:init` get the correct pattern.

## Syntax Check Results

No JS/CJS files were modified — only `.md` workflow and meta files.

## Store Validation Results

No schemas changed — validation not required.

## Files Changed

| File | Change |
|---|---|
| `forge/meta/workflows/meta-orchestrate.md` | Added Context Isolation section; replaced `invoke_slash_command` → `spawn_subagent`; updated Generation Instructions |
| `forge/init/generation/generate-orchestration.md` | Added explicit subagent instruction for generated orchestrate_task.md |
| `.forge/workflows/orchestrate_task.md` | Added Context Isolation section; replaced `invoke_slash_command` → `spawn_subagent` |
| `.forge/workflows/run_sprint.md` | Replaced duplicated phase loop with per-task subagent delegation to `orchestrate_task.md` |
| `forge/.claude-plugin/plugin.json` | Version bump 0.3.10 → 0.3.11 |
| `forge/migrations.json` | Added 0.3.10 → 0.3.11 migration entry |
| `.forge/store/bugs/BUG-001.json` | Bug record created and marked fixed |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| Phase invocations use Agent tool subagents | ✅ Pass | All `invoke_slash_command` replaced in both workflows |
| Orchestrator context stays minimal between phases | ✅ Pass | Each subagent starts fresh, reads from disk |
| `run_sprint.md` no longer duplicates phase loop | ✅ Pass | Delegates to `orchestrate_task.md` via subagent |
| Source template (`meta-orchestrate.md`) updated | ✅ Pass | New installs will get correct pattern |
| `generate-orchestration.md` updated | ✅ Pass | Agent tool instruction added |
| `node --check` passes | ✅ Pass | No JS files changed |
| `validate-store --dry-run` exits 0 | ✅ Pass | No schemas changed |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` (0.3.10 → 0.3.11)
- [x] Migration entry added to `forge/migrations.json`
- [ ] Security scan run and report committed — required before push (`/security-watchdog:scan-plugin forge:forge`)

## Knowledge Updates

None — pattern already implied by Context Isolation principle; now made explicit in
the meta-workflow source.

## Notes

Users who already have Forge installed should run `/forge:update` then `/forge:regenerate workflows`
to get the fixed `orchestrate_task.md` and `run_sprint.md` in their projects. This is
covered by the migration entry `regenerate: ["workflows"]`.
