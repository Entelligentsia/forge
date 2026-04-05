# PLAN — FORGE-S01-T08: Version bump, migration entry, and security scan

**Task:** FORGE-S01-T08
**Sprint:** FORGE-S01
**Estimate:** S

---

## Objective

Perform the release gate actions for the FORGE-S01 sprint (Token Usage Tracking):
bump the plugin version from `0.3.15` to `0.4.0`, add the corresponding migration
entry to `forge/migrations.json`, run a security scan against the `forge/` source
directory, persist the full scan report to `docs/security/scan-v0.4.0.md`, and
update the Security section of `README.md` with the new row.

## Approach

This task is purely administrative — no logic is written, no schemas change, and
no tool code is modified. The steps are:

1. Edit `forge/.claude-plugin/plugin.json`: set `"version"` to `"0.4.0"`.
2. Edit `forge/migrations.json`: add a new top-level key `"0.3.15"` with the
   prescribed migration descriptor.
3. Run `/security-watchdog:scan-plugin forge:forge --source-path forge/` (or
   instruct it to scan `/home/boni/src/forge/forge/` if the flag is not supported).
4. Write the **full** scan report (not a summary) to `docs/security/scan-v0.4.0.md`.
5. Append a row to the Security Scan History table in `README.md`.
6. Run `node --check` on every JS/CJS file touched (none here beyond JSON edits,
   but verify no accidental JS breakage from any upstream T01–T07 work).

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/.claude-plugin/plugin.json` | `version` → `"0.4.0"` | Version source of truth per CLAUDE.md |
| `forge/migrations.json` | Add `"0.3.15"` migration entry | Migration chain for `/forge:update` |
| `docs/security/scan-v0.4.0.md` | Create — full security scan report | CLAUDE.md policy: scan report saved as versioned artifact |
| `README.md` | Add row to Security Scan History table | CLAUDE.md policy: table updated with every release |

## Plugin Impact Assessment

- **Version bump required?** Yes — this task IS the version bump. The sprint (T01–T07)
  introduced new features (token tracking, COST_REPORT generation, retrospective cost
  analysis, bug report opt-in). Minor version: `0.3.15` → `0.4.0`.
- **Migration entry required?** Yes — `regenerate: ["tools", "workflows"]` because
  T01 changed event schema (tools), and T03/T06 changed orchestrator and retrospective
  workflows.
- **Security scan required?** Yes — any change to `forge/` requires a scan per
  CLAUDE.md. This task performs the scan for the entire sprint's changes.
- **Schema change?** Yes (upstream T01) — `forge/schemas/event.schema.json` gained
  optional token fields. Covered by this sprint's scan.

## Testing Strategy

- Syntax check: `node --check` on all `.js`/`.cjs` files under `forge/` to confirm
  no regressions from T01–T07 (no JS files are modified in this task itself).
- Store validation: `node forge/tools/validate-store.cjs --dry-run` against the
  project's own store — verifies schema compatibility is intact after the version bump.
- Manual verification: confirm `migrations.json` key `"0.3.15"` is present and
  parses as valid JSON (`node -e "JSON.parse(require('fs').readFileSync('forge/migrations.json','utf8'))"`)

## Acceptance Criteria

- [ ] `forge/.claude-plugin/plugin.json` `version` field is `"0.4.0"`
- [ ] `forge/migrations.json` has key `"0.3.15"` with `version: "0.4.0"`, correct `notes`, `regenerate: ["tools","workflows"]`, `breaking: false`, `manual: []`
- [ ] Security scan has been run against `forge/` source directory
- [ ] `docs/security/scan-v0.4.0.md` exists and contains the full scan report
- [ ] `README.md` Security table has a row for version `0.4.0`
- [ ] `node --check` passes on all modified JS/CJS files
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0

## Operational Impact

- **Distribution:** Users who have Forge installed will receive a prompt from
  `check-update.js` to run `/forge:update`. The migration entry specifies
  `regenerate: ["tools", "workflows"]`, so users will need to regenerate both
  after updating.
- **Backwards compatibility:** No breaking changes. Existing stores without token
  fields remain valid (all new fields are optional). The migration `breaking: false`
  and `manual: []` confirm no manual pre-migration steps are required.
