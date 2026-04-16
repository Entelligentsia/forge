# Architect Approval — FORGE-S09-T07

🗻 *Forge Architect*

**Status:** Approved

## Distribution Notes

Version bumped from 0.9.12 to 0.9.13. New command `forge/commands/add-task.md` shipped. Migration entry: `regenerate: ["commands"]`, `breaking: false`. Security scan: `docs/security/scan-v0.9.13.md` — SAFE TO USE. Users must run `/forge:update` after upgrading to receive the new command.

## Operational Notes

- No deployment changes beyond the new command file.
- No manual steps required — the migration is non-breaking.
- The command is additive and does not modify any existing artifacts.
- Users will see the new `/forge:add-task` command after running `/forge:update`.

## Follow-Up Items

- The `triage-error.js` hook's `FORGE_PATTERNS` list does not yet include `/forge:add-task`. A future task could add it so that add-task errors are triaged. Low priority since the command is unlikely to fail in ways that need bug reporting.
- The command does not currently support adding tasks with a `feature_id` linkage. This can be added as a future enhancement if feature-level task grouping becomes important.