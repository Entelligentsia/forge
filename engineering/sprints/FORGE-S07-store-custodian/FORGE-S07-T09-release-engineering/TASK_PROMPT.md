# FORGE-S07-T09: Release engineering — version bump to 0.9.0, migration entry, security scan

**Sprint:** FORGE-S07
**Estimate:** S
**Pipeline:** default

---

## Objective

Bump `forge/.claude-plugin/plugin.json` to version `0.9.0`, add the corresponding
migration entry to `forge/migrations.json`, run the security scan, save the report,
and update the README security table.

## Acceptance Criteria

1. `forge/.claude-plugin/plugin.json` version is `"0.9.0"`
2. `forge/migrations.json` has a new entry with:
   - `"0.8.10"` key (the previous version)
   - `"version": "0.9.0"`
   - `"date": "2026-04-15"`
   - `"notes"` describing the Store Custodian feature (one-line summary)
   - `"regenerate": ["workflows", "skills", "tools"]` — workflows updated (R6),
     skills updated (R5 new skill), tools updated (R1 new CLI, R7 facade gaps)
   - `"breaking": false`
   - `"manual": []`
3. Security scan run against `forge/` source directory:
   ```
   /security-watchdog:scan-plugin forge:forge --source-path forge/
   ```
4. Full scan report saved to `docs/security/scan-v0.9.0.md`
5. README.md security table has a new row for v0.9.0 with date and report link
6. All prior acceptance criteria for T01–T08 remain satisfied (no regressions)

## Context

Standard release engineering task following the project checklist in CLAUDE.md.

This is the first 0.9.x release. The Store Custodian is a significant architectural
addition (new CLI, new skill, 16 workflow updates, 3 facade gap closures, schema
consolidation) that warrants a minor version bump from 0.8.x.

Per CLAUDE.md:
> Bump `forge/.claude-plugin/plugin.json` version for every material change.
> Also required with every version bump:
> 1. Add a migration entry to `forge/migrations.json`
> 2. Run a security scan and save the full report to `docs/security/scan-v{VERSION}.md`
> 3. Add a row to the Security Scan History table in `README.md`

## Plugin Artifacts Involved

- `forge/.claude-plugin/plugin.json` — version bump to 0.9.0
- `forge/migrations.json` — new migration entry
- `docs/security/scan-v0.9.0.md` — security scan report
- `README.md` — security table row

## Operational Impact

- **Version bump:** This IS the version bump task
- **Regeneration:** Users must run `/forge:update` to get updated workflows, skills, and tools
- **Security scan:** This IS the security scan task
