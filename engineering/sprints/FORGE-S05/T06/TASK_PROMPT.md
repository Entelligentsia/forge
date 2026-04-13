# FORGE-S05-T06: Portability migration

**Sprint:** FORGE-S05
**Estimate:** M
**Pipeline:** default

---

## Objective

Add a migration path in `/forge:update` that converts legacy `model: <id>`
fields in existing generated workflows to the new `requirements` block format.
This ensures users upgrading from pre-S05 versions get a working orchestrator
without manual edits.

## Acceptance Criteria

1. `forge/migrations.json` includes a new migration entry with:
   - `"from"` = `"0.6.13"` (current version)
   - `"version"` = the new version (coordinate with T07, e.g., `"0.7.0"`)
   - `"regenerate"` = `["workflows", "personas", "skills"]`
   - `"breaking"` = `true` (generated artifacts change structure)
   - `"manual"` = instructions for users to verify custom pipeline
     configs if they have `model` overrides in `config.pipelines`
2. `forge/commands/update.md` handles the new migration — specifically:
   - Detects legacy `model:` fields in `.forge/workflows/` files
   - Warns the user about the breaking change
   - Guides regeneration of all three artifact types (workflows, personas, skills)
3. If users have custom `model` overrides in `.forge/config.json -> pipelines`,
   the migration warns them to update those overrides to use the new format
   (but does NOT auto-modify user config).
4. Migration is idempotent — running it twice produces the same result.
5. `node --check` passes on all modified JS/CJS files (if any).
6. `node forge/tools/validate-store.cjs --dry-run` exits 0.

## Context

- **Depends on T05** — the requirements schema must be finalised before we can
  write a migration that converts to it.
- Read `forge/migrations.json` for the current migration chain format and the
  last entry (version `0.6.13`).
- Read `forge/commands/update.md` for the current migration application logic
  (how it reads `migrations.json`, detects version drift, and guides the user).
- The migration should be additive — it adds the new format guidance but doesn't
  break projects that haven't regenerated yet. The orchestrator should handle
  both `model:` and `requirements:` until the user regenerates.

## Plugin Artifacts Involved

- **Modified:** `forge/migrations.json` — new migration entry
- **Modified:** `forge/commands/update.md` — migration detection and guidance
  for the breaking artifact-structure change

## Plan Template

When planning, use `.forge/templates/PLAN_TEMPLATE.md` as the base structure.

## Operational Impact

- **Version bump:** not required yet — T07 handles the version bump.
- **Regeneration:** this task defines the regeneration requirement; T07 ships it.
- **Security scan:** required (changes to `forge/`); deferred to T07.
