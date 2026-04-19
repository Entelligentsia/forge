# FORGE-S06-T10: Release engineering — version bump, migration, security scan

**Sprint:** FORGE-S06
**Estimate:** S
**Pipeline:** default

---

## Objective

Bump Forge version from 0.7.2 to 0.8.0, add migration entry to `migrations.json`, run security scan, and update README security table. This is the final release task for FORGE-S06.

## Acceptance Criteria

1. `forge/.claude-plugin/plugin.json` version bumped to `0.8.0`
2. `forge/migrations.json` has a new entry keyed by `"0.7.2"` with:
   - `"version": "0.8.0"`
   - `"notes"` summarizing the sprint changes
   - `"regenerate": ["workflows", "personas"]` (users must regenerate workflows and personas)
   - `"breaking": false` (no manual steps required)
   - `"manual": []`
3. Security scan run via `/security-watchdog:scan-plugin forge:forge --source-path forge/`
4. Full scan report saved to `docs/security/scan-v0.8.0.md`
5. README Security table updated with new row
6. `node forge/tools/validate-store.cjs --dry-run` exits 0
7. All files end with a trailing newline

## Context

This sprint makes several material changes:
- Orchestrator persona lookup now uses noun-based filenames
- Meta-workflows no longer have inline `## Persona` sections
- `/forge:regenerate` defaults now include `personas`
- Ghost event file bug fixed in store.cjs/validate-store.cjs
- False breaking-change confirmation suppressed in forge:update
- Sprint schema gains `path` field
- slug-named directory discovery added to seed-store, collate, validate-store

The migration entry needs `regenerate: ["workflows", "personas"]` because:
- Workflows: `## Persona` sections removed, persona loading changed
- Personas: default regenerate now includes personas; existing persona files may need to be regenerated with noun-based naming

## Plugin Artifacts Involved

- `forge/.claude-plugin/plugin.json`
- `forge/migrations.json`
- `docs/security/scan-v0.8.0.md` (new)
- `README.md` (security table update)

## Operational Impact

- **Version bump:** this IS the version bump task
- **Regeneration:** N/A
- **Security scan:** required (this task runs it)