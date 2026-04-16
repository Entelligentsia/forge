# Architect Approval — FORGE-S06-T02

Forge Architect

**Status:** Approved

## Distribution Notes

- Version bumped from 0.7.6 to 0.7.7 in `forge/.claude-plugin/plugin.json`
- Migration entry in `forge/migrations.json`: `0.7.6 -> 0.7.7`, `breaking: false`, `regenerate: [{target: "workflows", type: "functional"}]`
- Security scan report at `docs/security/scan-v0.7.7.md`: 102 files, 0 critical, 1 warning (justified), verdict SAFE TO USE
- README Security Scan History table updated with v0.7.7 row

## Operational Notes

- Users must run `/forge:update` after upgrading to v0.7.7 to regenerate all workflows. This removes inline `## Persona` sections from generated workflows and adds `Persona Self-Load` instructions to standalone command workflows.
- No manual steps required. The migration's `regenerate: ["workflows"]` target handles the transition automatically.
- The `check-update.js` hook is not affected by this change.

## Follow-Up Items

1. The `.forge/personas/` dogfooding directory still uses role-based filenames (approve.md, commit.md). After `/forge:update` regenerates workflows, the Self-Load instructions will reference noun-based filenames (architect.md, bug-fixer.md). The dogfooding instance's personas should be regenerated to match.
2. The `meta-orchestrate.md` Capability Table uses legacy model names (claude-3-opus, claude-3-5-sonnet, claude-3-haiku) while the generated orchestrate workflow uses short names (opus, sonnet, haiku). This pre-existing inconsistency should be addressed in a future task.