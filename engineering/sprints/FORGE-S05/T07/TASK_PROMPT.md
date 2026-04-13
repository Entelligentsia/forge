# FORGE-S05-T07: Release Engineering

**Sprint:** FORGE-S05
**Estimate:** S
**Pipeline:** default

---

## Objective

Version bump, migration entry finalisation, security scan, and release commit
for the FORGE-S05 sprint deliverables.

## Acceptance Criteria

1. `forge/.claude-plugin/plugin.json` -> `version` is bumped from `0.6.13` to
   the new version (coordinate with T06; e.g., `0.7.0`).
2. `forge/migrations.json` has a complete, correct migration entry for the new
   version with `"regenerate": ["workflows", "personas", "skills"]` and
   `"breaking": true`.
3. Security scan report exists at `docs/security/scan-v{VERSION}.md` — run
   `/security-watchdog:scan-plugin` on the `forge/` source directory.
4. `README.md` security table has a new row for this version.
5. `node --check` passes on all modified JS/CJS files.
6. `node forge/tools/validate-store.cjs --dry-run` exits 0.
7. All changes are committed with a `release:` prefix commit message.

## Context

- **Depends on T06** — all functional changes must be complete before release.
- Follow the CLAUDE.md versioning rules exactly:
  1. Bump version in `forge/.claude-plugin/plugin.json`
  2. Add/finalise migration entry in `forge/migrations.json`
  3. Run `/security-watchdog:scan-plugin forge:forge --source-path forge/`
  4. Save full scan report to `docs/security/scan-v{VERSION}.md`
  5. Add row to README.md security table
- Current version is `0.6.13` (read from `forge/.claude-plugin/plugin.json`).
- If T06 already added a migration entry, verify and finalise it rather than
  adding a duplicate.
- Read the security table format in README.md to match the existing pattern.

## Plugin Artifacts Involved

- **Modified:** `forge/.claude-plugin/plugin.json` — version bump
- **Modified:** `forge/migrations.json` — finalise migration entry
- **New:** `docs/security/scan-v{VERSION}.md` — security scan report
- **Modified:** `README.md` — security table row

## Plan Template

When planning, use `.forge/templates/PLAN_TEMPLATE.md` as the base structure.

## Operational Impact

- **Version bump:** required — this IS the version bump task.
- **Regeneration:** users must run `/forge:update` after installing this version,
  which will trigger `/forge:regenerate workflows personas skills`.
- **Security scan:** required — this IS the security scan task.
