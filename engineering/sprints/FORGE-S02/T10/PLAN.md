# PLAN — FORGE-S02-T10: Release engineering — version bump to v0.6.0, migration entry, security scan

🌱 *Forge Engineer*

**Task:** FORGE-S02-T10
**Sprint:** FORGE-S02
**Estimate:** S

---

## Objective

Ship the FORGE-S02 changes as Forge v0.6.0. This task bumps the plugin version to v0.6.0, adds a migration entry documenting the new Feature tier and necessary tool/workflow regenerations, runs the mandatory security scan, and verifies backwards compatibility for existing installations. 

## Approach

1. Run the security scan locally using the process specified in `CLAUDE.md`, outputting the report to `docs/security/scan-v0.6.0.md`.
2. Update the README.md to list `scan-v0.6.0.md` inside the Security Scan History table.
3. Update `forge/migrations.json` to insert the new migration block from `0.5.9` with `version: "0.6.0"`.
4. Bump the version in `forge/.claude-plugin/plugin.json` to `0.6.0`.
5. Run the upgrade validation tests by ensuring `validate-store --dry-run` and general tests remain green to confirm backend compatibility context.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/.claude-plugin/plugin.json` | Update version to "0.6.0" | Version bump release requirement |
| `forge/migrations.json` | Add entry keyed "0.5.9" pointing to "0.6.0" | To direct users upgrading from 0.5.9 to regenerate appropriate assets |
| `docs/security/scan-v0.6.0.md` | Create file with security scan output | Prove no vulnerabilities were introduced in S02 |
| `README.md` | Append row to Security Scan History table | Standard documentation tracking |

## Plugin Impact Assessment

- **Version bump required?** Yes — bumping to 0.6.0 per task instructions.
- **Migration entry required?** Yes — requires regeneration of `tools` and `workflows`.
- **Security scan required?** Yes — `forge/` schemas and tools have been changed throughout the sprint.
- **Schema change?** No — handled in previous tasks of this sprint. 

## Testing Strategy

- Syntax check: `node --check forge/migrations.json forge/.claude-plugin/plugin.json` (Note: both JSON, so syntactically validated during generation/IDE format, but we'll check any related JS execution).
- Store validation: `node forge/tools/validate-store.cjs --dry-run` to ensure existing stores remain valid.
- Run `/forge:update` equivalent sanity checks or manual smoke validation with an older store schema format.

## Acceptance Criteria

- [ ] `forge/.claude-plugin/plugin.json` version field set to `"0.6.0"`.
- [ ] `forge/migrations.json` gains an entry keyed `"0.5.9"` to `"0.6.0"` with `{ regenerate: ["tools", "workflows"] }`.
- [ ] Security scan mapped to `docs/security/scan-v0.6.0.md`.
- [ ] `README.md` Security Scan table reflects the update.
- [ ] `node --check` passes on all modified JS/CJS files (if any applied).
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0.

## Operational Impact

- **Distribution:** Users MUST run `/forge:update` because `tools` and `workflows` directories need downstream regeneration based on sprint updates.
- **Backwards compatibility:** Backwards compatible. The added `feature_id` fields are nullable, and the updated `seed-store` logic manages adding missing directories.
