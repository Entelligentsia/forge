# FORGE-S01-T08: Version bump, migration entry, and security scan

**Sprint:** FORGE-S01
**Estimate:** S
**Pipeline:** default

---

## Objective

Bump the plugin version, add a migration entry documenting the token tracking
feature, and run the security scan per CLAUDE.md policy.

## Acceptance Criteria

1. `forge/.claude-plugin/plugin.json` version bumped to `0.4.0` (minor bump — new feature)
2. `forge/migrations.json` has a new entry:
   - `from`: `0.3.15`
   - `version`: `0.4.0`
   - `notes`: "Token usage tracking — events capture per-phase token counts, COST_REPORT.md generated during collation, retrospective includes cost analysis"
   - `regenerate`: `["tools", "workflows"]`
   - `breaking`: `false`
   - `manual`: `[]`
3. Security scan run via `/security-watchdog:scan-plugin` on `forge/` source directory
4. Scan report saved to `docs/security/scan-v0.4.0.md`
5. Security scan history table in `README.md` updated with new row
6. `node --check` passes on all modified JS/CJS files (run lint command from config)

## Context

Depends on all other tasks (T01–T07) being complete. This is the release gate.

Per CLAUDE.md: every material change requires a version bump, migration entry,
and security scan. The scan must target the source directory (`forge/`), not the
plugin cache.

## Plugin Artifacts Involved

- `forge/.claude-plugin/plugin.json` — version field
- `forge/migrations.json` — migration chain
- `docs/security/scan-v0.4.0.md` — security report
- `README.md` — security scan history table

## Operational Impact

- **Version bump:** This IS the version bump task
- **Regeneration:** Users run `/forge:update` which reads the migration entry
- **Security scan:** Required — this task performs it
