# PLAN — FORGE-S07-T09: Release engineering — version bump to 0.9.0, migration entry, security scan

*Forge Engineer*

**Task:** FORGE-S07-T09
**Sprint:** FORGE-S07
**Estimate:** S

---

## Objective

Bump `forge/.claude-plugin/plugin.json` from `0.8.10` to `0.9.0`, add a
migration entry in `forge/migrations.json`, run the security scan against the
`forge/` source directory, save the full report to `docs/security/scan-v0.9.0.md`,
and add a row to the README security table.

This is the first 0.9.x release, reflecting the Store Custodian architectural
addition: new CLI tool (`store-cli.cjs`), new skill/tool spec, 16 meta-workflow
migrations to custodian, 3 facade gap closures, and sprint schema consolidation.

## Approach

Standard release engineering checklist. No code changes beyond the version bump
and migration entry. The security scan is the primary deliverable.

1. Bump version in `plugin.json` from `0.8.10` to `0.9.0`
2. Add migration entry with key `"0.8.10"` to `migrations.json`:
   - `regenerate`: `["workflows", "skills", "tools"]` (workflows updated for
     custodian, skills updated with new store-custodian skill, tools updated
     with new CLI + facade gap closures)
3. Run `/security-watchdog:scan-plugin forge:forge --source-path forge/`
4. Save full report to `docs/security/scan-v0.9.0.md`
5. Add row to README.md security table
6. Syntax-check the modified JSON files (no JS files are being modified)

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/.claude-plugin/plugin.json` | version: `"0.8.10"` -> `"0.9.0"` | Release version bump |
| `forge/migrations.json` | Add `"0.8.10"` entry pointing to `"0.9.0"` | Migration chain entry |
| `docs/security/scan-v0.9.0.md` | New file — full security scan report | Required by CLAUDE.md |
| `README.md` | Add row to Security Scan History table | Required by CLAUDE.md |

## Plugin Impact Assessment

- **Version bump required?** Yes — this IS the version bump. Store Custodian is a
  significant architectural addition (new CLI, new skill, 16 workflow updates,
  3 facade gap closures, schema consolidation) warranting a minor version bump
  from 0.8.x to 0.9.x.
- **Migration entry required?** Yes — `regenerate: ["workflows", "skills", "tools"]`
  because:
  - **workflows**: 16 meta-workflows migrated from direct store writes to
    custodian calls (T07)
  - **skills**: new `meta-store-custodian.md` skill + tool spec (T06)
  - **tools**: new `store-cli.cjs` (T05), `store.cjs` facade extension (T02),
    `collate.cjs` facade bypass fix (T03), `validate-store.cjs` refactor (T04)
- **Security scan required?** Yes — any change to `forge/` requires a scan.
  Multiple files changed across tools, skills, meta-workflows, schemas, and
  commands.
- **Schema change?** Yes — `sprint.schema.json` gained `goal` and `features`
  fields (T01). No lifecycle state machine changes, so no state diagram update
  required.

## Testing Strategy

- Syntax check: Not applicable (no JS/CJS files modified in this task; only JSON
  and Markdown)
- Store validation: `node forge/tools/validate-store.cjs --dry-run` (regression
  check — all prior S07 changes must still pass)
- JSON validation: `node -e "JSON.parse(require('fs').readFileSync('forge/.claude-plugin/plugin.json'))"` and
  `node -e "JSON.parse(require('fs').readFileSync('forge/migrations.json'))"` to
  verify valid JSON after edits

## Acceptance Criteria

- [ ] `forge/.claude-plugin/plugin.json` version is `"0.9.0"`
- [ ] `forge/migrations.json` has a new entry with key `"0.8.10"` containing:
  - `"version": "0.9.0"`
  - `"date": "2026-04-15"`
  - `"notes"` describing the Store Custodian release
  - `"regenerate": ["workflows", "skills", "tools"]`
  - `"breaking": false`
  - `"manual": []`
- [ ] Security scan run against `forge/` source directory
- [ ] Full scan report saved to `docs/security/scan-v0.9.0.md`
- [ ] README.md security table has a new row for v0.9.0
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0
- [ ] Both modified JSON files parse as valid JSON

## Operational Impact

- **Distribution:** Users must run `/forge:update` after installing 0.9.0 to
  regenerate workflows, skills, and tools that changed in this release.
- **Backwards compatibility:** No breaking changes. The migration entry marks
  `breaking: false` and `manual: []`. All changes are additive — new CLI tool,
  new skill, updated workflows that use the custodian instead of direct writes.
  Existing project stores are compatible; the custodian CLI operates on the same
  JSON store format.