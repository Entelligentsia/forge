# Architect Approval — FORGE-S06-T10

🗻 *Forge Architect*

**Status:** Approved

## Distribution Notes

Version bumped from `0.7.11` to `0.8.0`. Migration entry keyed `"0.7.11"` correctly summarises all Sprint S06 changes. The `regenerate: ["workflows", "personas"]` targets are correct — workflows had `## Persona` sections removed (T02) and personas are now a default regenerate target (T03). Users running `/forge:update` after upgrading to `0.8.0` will be prompted to regenerate both targets.

`breaking: false` is correct — no manual steps are required. The sprint schema `path` field added in T06 is optional, the slug-aware directory discovery in T07/T08/T09 is backward compatible, and the other changes are workflow/persona generation improvements that require regeneration but not manual intervention.

Security scan report `docs/security/scan-v0.8.0.md` is present and clean: 102 files scanned, 0 critical findings, 2 pre-existing accepted warnings. No regression from prior scans.

## Operational Notes

Users upgrading from `< 0.8.0` should run `/forge:update` to apply the migration. The update command will show `regenerate: ["workflows", "personas"]` and prompt to run `/forge:regenerate workflows` and `/forge:regenerate personas`. This ensures:
1. Project workflows no longer contain inline `## Persona` sections
2. Persona files use noun-based filenames (`engineer.md`, `supervisor.md`, etc.)

No new installed artifacts, directories, or disk-write sites introduced by this task.

## Follow-Up Items

The 109 pre-existing validate-store errors from S04/S05 legacy events remain unresolved. These are tracked under BUG-004 and should be addressed by running `validate-store --fix` in a dedicated task. They do not affect the correctness of this release.
