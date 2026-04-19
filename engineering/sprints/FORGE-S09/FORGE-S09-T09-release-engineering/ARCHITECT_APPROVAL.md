# Architect Approval — FORGE-S09-T09

🗻 *Forge Architect*

**Status:** Approved

## Distribution Notes

Version bumped from 0.9.13 to 0.9.14 in `forge/.claude-plugin/plugin.json`. Migration entry added to `forge/migrations.json` (key `"0.9.13"`, version `"0.9.14"`) with `regenerate: ["commands", "workflows", "personas"]`, `breaking: false`, `manual: []`. The migration notes provide a comprehensive summary of all FORGE-S09 material changes: init renumbering, config schema, init guard, health checks, calibrate command, sprint-plan path fix, add-task command, BUG-008/009 fixes, and banner library.

Security scan report present at `docs/security/scan-v0.9.14.md` -- 113 files scanned, 0 critical, 1 warning (accepted -- version-check HTTPS call), 2 info. Verdict: SAFE TO USE.

## Operational Notes

After installing 0.9.14, users must run `/forge:update` to propagate changes. The regeneration targets are:
- **commands** -- init.md, health.md, calibrate.md, add-task.md all changed or new during the sprint
- **workflows** -- meta-sprint-plan.md and orchestrate_task.md changed during the sprint
- **personas** -- banner library integration required persona regeneration

No manual steps required. No breaking changes.

## Follow-Up Items

1. Pre-existing validate-store errors (10 total from legacy `task-dispatch.json` event file using old `eventType`/`timestamp` fields) should be cleaned up in a future bug-fix task.
2. The dogfooding project's `.forge/` working tree has uncommitted changes from the sprint -- a collate run (`/collate`) should be performed to update MASTER_INDEX.md and sprint COST_REPORTs before the sprint retrospective.