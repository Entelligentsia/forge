# PLAN — FORGE-S05-T07: Release Engineering

🌱 *Forge Engineer*

**Task:** FORGE-S05-T07
**Sprint:** FORGE-S05
**Estimate:** S

---

## Objective

Finalize the release engineering for the FORGE-S05 sprint deliverables. This includes bumping the plugin version, verifying the migration entry, performing a full security scan of the `forge/` source directory, and updating the project's README.

## Approach

1.  **Version Bump:** Update `forge/.claude-plugin/plugin.json` from `0.6.13` to `0.7.0`.
2.  **Migration Finalization:** Verify and refine the migration entry in `forge/migrations.json` for version `0.7.0`, ensuring `"regenerate": ["workflows", "personas", "skills"]` and `"breaking": true` are set.
3.  **Security Audit:** Execute `/security-watchdog:scan-plugin forge:forge --source-path forge/` to scan the source code for vulnerabilities.
4.  **Artifact Generation:** Save the full security scan report to `docs/security/scan-v0.7.0.md`.
5.  **Public Record:** Add a new entry to the Security Scan History table in `README.md` for version `0.7.0`.
6.  **Verification:** Run `node --check` on modified files and `node forge/tools/validate-store.cjs --dry-run` to ensure no regressions were introduced.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/.claude-plugin/plugin.json` | Update `version` to `0.7.0` | Canonical version bump for S05 release |
| `forge/migrations.json` | Verify/Update entry for `0.6.13` $\rightarrow$ `0.7.0` | Ensure correct regeneration targets for portability changes |
| `docs/security/scan-v0.7.0.md` | Create new file with scan report | Mandatory security artifact for every release |
| `README.md` | Add row to Security table | Maintain public security history |

## Plugin Impact Assessment

- **Version bump required?** Yes — `0.6.13` $\rightarrow$ `0.7.0` (S05 Release)
- **Migration entry required?** Yes — `"regenerate": ["workflows", "personas", "skills"]`, `"breaking": true`
- **Security scan required?** Yes — all changes to `forge/` require a scan
- **Schema change?** No — S05 focuses on agent definition and portability, not store schema changes

## Testing Strategy

- Syntax check: `node --check forge/.claude-plugin/plugin.json` (not JS, but check `migrations.json` if touched)
- Store validation: `node forge/tools/validate-store.cjs --dry-run`
- Manual smoke test: Verify `plugin.json` and `migrations.json` are valid JSON.

## Acceptance Criteria

- [ ] `forge/.claude-plugin/plugin.json` version is `0.7.0`
- [ ] `forge/migrations.json` has a correct entry for `0.7.0` with `breaking: true` and correct `regenerate` targets
- [ ] `docs/security/scan-v0.7.0.md` exists and contains the full security report
- [ ] `README.md` contains a security table row for `0.7.0`
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0

## Operational Impact

- **Distribution:** Users must run `/plugin install forge@skillforge` (or `@forge`) followed by `/forge:update`.
- **Backwards compatibility:** Breaking change — `/forge:update` will regenerate core artifacts (workflows, personas, skills) to support the new 3D Agent Model.
