# FORGE-S09-T09: Release engineering — version bump, migration, security scan

**Sprint:** FORGE-S09
**Estimate:** S
**Pipeline:** default

---

## Objective

Cap the sprint with a version bump, migration entry, and security scan. This task collects
all material changes from T01–T07 and produces the final release artifact.

## Acceptance Criteria

1. `forge/.claude-plugin/plugin.json` version is bumped from 0.9.2 to the next version
2. `forge/migrations.json` has a new entry with:
   - `from`: "0.9.2"
   - `version`: new version
   - `notes`: human-readable summary of all changes
   - `regenerate`: list of targets users must regenerate
   - `breaking`: false
   - `manual`: empty array
3. Security scan report saved to `docs/security/scan-v{VERSION}.md`
4. README security table updated with new row
5. `node --check` passes on all modified JS/CJS files
6. `node forge/tools/validate-store.cjs --dry-run` exits 0

## Context

This task depends on all material tasks (T01–T07) completing first. It should be the last
task in the sprint execution order.

The migration `regenerate` list should include at minimum:
- `commands` (init.md, health.md, calibrate.md, add-task.md all changed or new)
- `workflows` (meta-sprint-plan.md changed)

Regeneration targets for schemas are handled via `tools` if `forge:update-tools` is needed,
or may be included in `commands` if the update command handles schema copies.

## Plugin Artifacts Involved

- `forge/.claude-plugin/plugin.json` — version bump
- `forge/migrations.json` — migration chain entry
- `docs/security/scan-v{VERSION}.md` — security scan report
- `README.md` — security table row

## Operational Impact

- **Version bump:** this IS the version bump task
- **Regeneration:** users must run `/forge:update` after installing the new version
- **Security scan:** required — run `/security-watchdog:scan-plugin forge:forge --source-path forge/`