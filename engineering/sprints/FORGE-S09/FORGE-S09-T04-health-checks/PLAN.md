# PLAN — FORGE-S09-T04: Health — KB freshness check + config-completeness check

🌱 *Forge Engineer*

**Task:** FORGE-S09-T04
**Sprint:** FORGE-S09
**Estimate:** M

---

## Objective

Add two new checks to `/forge:health`: (1) a KB freshness check that compares the current `MASTER_INDEX.md` hash against `calibrationBaseline.masterIndexHash` in config, distinguishing technical drift from business drift; (2) a config-completeness check that validates `.forge/config.json` against required fields in `sdlc-config.schema.json`, blocking further health checks if fields are missing.

## Approach

The health command is a single Markdown file (`forge/commands/health.md`) that instructs the Claude agent on what to check and how. No new JS/CJS tools are needed — the freshness and completeness checks are implemented as Markdown instructions that use inline `node -e` commands (consistent with the Phase 5 calibration baseline pattern in `sdlc-init.md`).

### KB Freshness Check

1. Read `calibrationBaseline.masterIndexHash` from `.forge/config.json`. If absent, report "No calibration baseline found — run `/forge:init` to establish one" and skip the freshness check.
2. Compute the current hash of `engineering/MASTER_INDEX.md` using the same algorithm as init Phase 5 (strip blank lines and `<!--` comment lines, SHA-256 the rest).
3. If hashes match, report "KB fresh" with last calibration date.
4. If hashes differ, parse `MASTER_INDEX.md` to categorize the drift:
   - **Technical drift**: changes in sections referencing architecture (stack, routing, database, deployment, processes), schemas, conventions, or the stack checklist.
   - **Business drift**: changes in sections referencing entity models, domain vocabulary, feature registry, or acceptance criteria.
   - Report "KB drifted — <category> changes detected" with the drift categories.
5. Point users to `/forge:calibrate` for resolution.

### Config-Completeness Check

1. Read `sdlc-config.schema.json` from `$FORGE_ROOT` to extract the `required` fields at each level.
2. Read `.forge/config.json` and check that every required field (and nested required field) has a non-empty value.
3. If all required fields are present, report "Config complete" and proceed to remaining checks.
4. If fields are missing, report each missing field by path (e.g. `project.prefix`, `commands.test`) and exit early with "Run `/forge:init` to complete configuration" — do not cascade into artifact checks that may break on missing config.

### Integration with Existing Checks

- The config-completeness check runs **first** (before all other checks) because many subsequent checks depend on config being valid.
- The KB freshness check runs after the config check (it needs `calibrationBaseline` from config) but before stale-docs/orphaned-entity checks (since freshness provides a higher-level signal).

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/commands/health.md` | Add config-completeness check (step 1) and KB freshness check (step 2), renumber existing steps | Core deliverable — two new checks |
| `forge/.claude-plugin/plugin.json` | Version bump: 0.9.10 → 0.9.11 | Material change — command file behaviour altered |
| `forge/migrations.json` | Add migration entry 0.9.10 → 0.9.11 | Required with version bump |

## Plugin Impact Assessment

- **Version bump required?** Yes — changes to `forge/commands/health.md` alter user-facing health command behaviour (new checks, early exit on incomplete config).
- **Migration entry required?** Yes — `regenerate: ["commands"]` since the health command changes.
- **Security scan required?** Yes — any change to `forge/` requires a scan.
- **Schema change?** No — no `forge/schemas/*.schema.json` files are modified.

## Testing Strategy

- Syntax check: `node --check` is not applicable (no JS/CJS files modified).
- Store validation: `node forge/tools/validate-store.cjs --dry-run` — no schema changes, but run to confirm no regressions.
- Manual smoke test: run `/forge:health` in this project and verify:
  1. Config-completeness check runs first and reports "Config complete" (this project's config is fully populated).
  2. KB freshness check runs second and reports either "KB fresh" or "KB drifted" with drift category.
  3. Existing checks still run and produce expected output.
  4. With a manually broken config (remove a required field), verify early exit with missing-field list.

## Acceptance Criteria

- [ ] `/forge:health` reports "Config complete" when all required fields are present in `.forge/config.json`
- [ ] `/forge:health` reports missing fields by path and exits early when required config fields are absent
- [ ] `/forge:health` reports "KB fresh" when `MASTER_INDEX.md` hash matches `calibrationBaseline.masterIndexHash`
- [ ] `/forge:health` reports "KB drifted — <category> changes detected" when hashes differ, with category being "technical", "business", or "technical + business"
- [ ] The freshness check distinguishes technical drift (architecture, schemas, conventions) from business drift (domain, vocabulary, features)
- [ ] Config-completeness check runs before all other checks; KB freshness runs before stale-docs
- [ ] When config fields are missing, `/forge:health` exits early with "Run `/forge:init` to complete configuration" and does not cascade
- [ ] When `calibrationBaseline` is absent, the freshness check reports the absence and skips (not an error)
- [ ] Users are pointed to `/forge:calibrate` for drift resolution
- [ ] `node --check` passes on all modified JS/CJS files (N/A — no JS/CJS files modified)
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0 (no new errors)

## Operational Impact

- **Distribution:** Users must run `/forge:update` to get the updated health command (regenerate: `commands`).
- **Backwards compatibility:** Fully compatible. Existing health checks are preserved; new checks are additive. If `calibrationBaseline` is absent (projects initialized before T02/T03), the freshness check gracefully skips. If config is incomplete (should not happen post-init), the completeness check catches it.