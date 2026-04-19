# Architect Approval — FORGE-S05-T08

⛰️ *Forge Architect*

**Status:** Approved

## Distribution Notes

The version is bumped from `0.7.0` to `0.7.1`. This is a material change to the meta-workflows that governs how tasks are orchestrated and how folders are named. A migration entry has been added to `forge/migrations.json` with `regenerate: ["workflows"]`. The security scan for v0.7.0 is present and clean; since this task only modifies meta-workflow Markdown files, no new security risks are introduced.

## Operational Notes

Users will need to run `/forge:update` after installing v0.7.1 to regenerate their project-specific workflows. This will enable the "Current Working Context" absolute path injection in subagent prompts and the `ID-description` folder naming convention for future sprints/tasks.

## Follow-Up Items

None.
