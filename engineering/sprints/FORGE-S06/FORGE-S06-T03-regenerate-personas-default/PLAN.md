# PLAN — FORGE-S06-T03: Add personas to forge:regenerate defaults

**Task:** FORGE-S06-T03
**Sprint:** FORGE-S06
**Estimate:** S

---

## Objective

Make `/forge:regenerate` include the `personas` target in its default run, and support focused per-persona regeneration. This closes SPRINT_REQUIREMENTS item 1d.

## Approach

Modify `forge/commands/regenerate.md` in three places:

1. **Arguments section** — add per-persona sub-target examples (`personas engineer`, `personas:engineer`)
2. **Personas category section** — add sub-target handling (single persona regeneration from `meta-<noun>.md`)
3. **Default section** — change default run from `workflows + commands + templates` to `workflows + commands + templates + personas`

The pattern for sub-target handling mirrors the existing `workflows` category: when a sub-target is present, only regenerate one file; when absent, regenerate the full directory.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/commands/regenerate.md` | Add personas to default run; add per-persona sub-target support; add argument examples | Task requires personas in default sequence and focused regeneration |

## Plugin Impact Assessment

- **Version bump required?** Yes — changes default `/forge:regenerate` behavior (material change)
- **Migration entry required?** Yes — `regenerate` list must include `personas` so existing users get personas regenerated on `/forge:update`
- **Security scan required?** Yes — change to `forge/` (command file)
- **Schema change?** No — no store schemas affected

## Testing Strategy

- Syntax check: N/A (only Markdown file modified)
- Store validation: `node forge/tools/validate-store.cjs --dry-run` (no schema changes, but verify no regressions)
- Manual smoke test: After editing, verify:
  1. `/forge:regenerate` with no args runs workflows + commands + templates + personas
  2. `/forge:regenerate personas engineer` regenerates only `.forge/personas/engineer.md`
  3. `/forge:regenerate personas` (no sub-target) regenerates all persona files

## Acceptance Criteria

- [ ] `/forge:regenerate` with no arguments now includes `personas` in the default run sequence (currently defaults to `workflows + commands + templates`)
- [ ] Focused per-persona regeneration supported: `/forge:regenerate personas engineer` regenerates only `.forge/personas/engineer.md`
- [ ] Default run sequence becomes: `workflows + commands + templates + personas`
- [ ] Colon form supported: `/forge:regenerate personas:engineer` works the same as space form
- [ ] Lays groundwork for future `forge:calibrate` without implementing it (personas are now part of the default regeneration pipeline, making them available to any future calibration command)
- [ ] After `/forge:regenerate`, `.forge/personas/` exists with one file per persona noun (engineer.md, supervisor.md, architect.md, product-manager.md, qa-engineer.md, collator.md, bug-fixer.md, orchestrator.md)
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0

## Operational Impact

- **Distribution:** Users must run `/forge:update` after installing the new version. The migration entry will include `personas` in the regenerate list, triggering persona regeneration automatically.
- **Backwards compatibility:** Fully backwards compatible. Adding `personas` to the default run is additive — it generates additional files without removing or changing existing ones. Users who previously ran `/forge:regenerate personas` explicitly will see no difference.