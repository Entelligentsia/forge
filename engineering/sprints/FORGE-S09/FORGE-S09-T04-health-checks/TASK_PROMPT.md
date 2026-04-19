# FORGE-S09-T04: Health — KB freshness check + config-completeness check

**Sprint:** FORGE-S09
**Estimate:** M
**Pipeline:** default

---

## Objective

Add two checks to `/forge:health`:
1. **KB freshness check** (#34) — compares current `MASTER_INDEX.md` hash against the
   `calibrationBaseline.masterIndexHash` in config; distinguishes technical vs business drift;
   points users to `/forge:calibrate` for resolution
2. **Config-completeness check** (#35) — validates `.forge/config.json` against required
   fields in `sdlc-config.schema.json`; blocks further health checks if fields are missing

## Acceptance Criteria

1. `/forge:health` reports "KB fresh" when `MASTER_INDEX.md` hash matches the baseline
2. `/forge:health` reports "KB drifted — <category> changes detected" when hashes differ,
   where category is "technical" or "business"
3. The freshness check distinguishes technical drift (schemas, conventions, stack) from
   business drift (domain models, vocabulary, acceptance criteria)
4. The config-completeness check reports missing config fields by name
5. When config fields are missing, `/forge:health` exits early with "Run `/forge:init` to
   complete configuration" and does not cascade into broken artifact checks
6. `node --check` passes on all modified JS/CJS files

## Context

Depends on T02 (schema must define `calibrationBaseline` and required fields).

For drift categorization: parse `MASTER_INDEX.md` and the diff against the baseline to
determine whether changes are in technical sections (architecture, routing, stack) or
business sections (entity model, domain vocabulary, acceptance criteria).

## Plugin Artifacts Involved

- `forge/commands/health.md` — add two new checks to the health assessment

## Operational Impact

- **Version bump:** required — changes to command file affect user-facing behavior
- **Regeneration:** users must run `/forge:update` to get updated health command
- **Security scan:** required — changes to `forge/` files