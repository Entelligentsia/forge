# PLAN — FORGE-S09-T09: Release engineering — version bump, migration, security scan

🌱 *Forge Engineer*

**Task:** FORGE-S09-T09
**Sprint:** FORGE-S09
**Estimate:** S

---

## Objective

Cap Sprint FORGE-S09 with a consolidating version bump from 0.9.13 to 0.9.14, a migration entry summarising all sprint material changes, a final security scan of the `forge/` source, and updated security tables in README.md and docs/security/index.md.

## Approach

Each task in FORGE-S09 already performed its own version bump and security scan. This task produces the sprint-capping release: a single bump with a migration entry that summarises the full sprint's material output, a final security scan to verify the cumulative state, and the corresponding table updates. No code changes in `forge/` — this is purely a release-bookkeeping task.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/.claude-plugin/plugin.json` | Bump `version` from `"0.9.13"` to `"0.9.14"` | Sprint-capping release version |
| `forge/migrations.json` | Add `0.9.13` → `0.9.14` entry | Consolidating migration for sprint output |
| `docs/security/scan-v0.9.14.md` | New file — security scan report | Required for any `forge/` change |
| `docs/security/index.md` | Prepend new row | Full scan history |
| `README.md` | Prepend new row in security table, remove oldest row | 3-row rolling window |

## Plugin Impact Assessment

- **Version bump required?** Yes — formal sprint cap release: 0.9.13 → 0.9.14
- **Migration entry required?** Yes — `regenerate: ["commands", "workflows", "personas"]` (cumulative sprint output)
- **Security scan required?** Yes — any version bump requires a scan of `forge/`
- **Schema change?** No — no schema files modified in this task

## Testing Strategy

- Syntax check: no JS/CJS files modified in this task
- Store validation: `node forge/tools/validate-store.cjs --dry-run` — verify existing store still passes
- Security scan: `/security-watchdog:scan-plugin forge:forge --source-path forge/`
- Manual verification: confirm plugin.json version, migrations.json entry, scan report, and table rows

## Acceptance Criteria

- [ ] `forge/.claude-plugin/plugin.json` version is `"0.9.14"`
- [ ] `forge/migrations.json` has a `0.9.13` key with `"version": "0.9.14"`, notes summarising FORGE-S09 changes, `regenerate: ["commands", "workflows", "personas"]`, `breaking: false`, `manual: []`
- [ ] `docs/security/scan-v0.9.14.md` exists with full scan report
- [ ] `docs/security/index.md` has new row prepended at top of table
- [ ] `README.md` security table has new row prepended, oldest row removed, still shows exactly 3 rows
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0

## Operational Impact

- **Distribution:** users must run `/forge:update` after installing 0.9.14 — regeneration targets include commands, workflows, and personas
- **Backwards compatibility:** fully preserved — no breaking changes, no manual steps required