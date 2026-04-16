# FORGE-S04-T06: Release engineering for FORGE-S04

**Sprint:** FORGE-S04
**Estimate:** S
**Pipeline:** default

---

## Objective

Finalize the release for FORGE-S04 by bumping the plugin version, adding the migration entry, and conducting a security scan of the `forge/` directory.

## Acceptance Criteria

1. Version incremented in `forge/.claude-plugin/plugin.json` from 0.6.12.
2. `forge/migrations.json` updated with an entry including `"regenerate": ["tools"]`.
3. Security scan report saved to `docs/security/scan-v{VERSION}.md`.
4. README Security table updated with the scan result.

## Context

This task is the final gate for the sprint. It depends on the successful porting of all tools (T02-T05) and the implementation of the store facade (T01).

## Plugin Artifacts Involved

- `forge/.claude-plugin/plugin.json`
- `forge/migrations.json`
- `README.md`
- `docs/security/scan-v{VERSION}.md`

## Operational Impact

- **Version bump:** Required.
- **Regeneration:** Users must run `/forge:update` to receive the store abstraction layer and ported tools.
- **Security scan:** Required.
