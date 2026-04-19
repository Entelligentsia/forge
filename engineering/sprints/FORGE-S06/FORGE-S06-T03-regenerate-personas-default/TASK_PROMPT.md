# FORGE-S06-T03: Add personas to forge:regenerate defaults

**Sprint:** FORGE-S06
**Estimate:** S
**Pipeline:** default

---

## Objective

Make `/forge:regenerate` include the `personas` target in its default run, and support focused per-persona regeneration. This closes SPRINT_REQUIREMENTS item 1d.

## Acceptance Criteria

1. `/forge:regenerate` with no arguments now includes `personas` in the default run sequence (currently defaults to `workflows + commands + templates`)
2. Focused per-persona regeneration supported: `/forge:regenerate personas engineer` regenerates only `.forge/personas/engineer.md`
3. Default run sequence becomes: `workflows + commands + templates + personas`
4. Lays groundwork for future `forge:calibrate` without implementing it
5. After `/forge:regenerate`, `.forge/personas/` exists with one file per persona noun (engineer.md, supervisor.md, architect.md, product-manager.md, qa-engineer.md, collator.md, bug-fixer.md, orchestrator.md)
6. `node --check forge/tools/validate-store.cjs --dry-run` exits 0

## Context

Currently `/forge:regenerate` with no args runs `workflows + commands + templates`. The `personas` category exists but must be explicitly requested. This means most users never regenerate personas after changes to meta-persona templates.

The `personas` category code already exists in `forge/commands/regenerate.md` — it reads `$FORGE_ROOT/meta/personas/`, generates `.forge/personas/`, and records hashes. We just need to add it to the default run.

For per-persona regeneration: when a sub-target is provided (e.g. `personas engineer`), only regenerate `.forge/personas/engineer.md` from `meta-engineer.md`, not all personas.

## Plugin Artifacts Involved

- `forge/commands/regenerate.md` — the only file to modify

## Operational Impact

- **Version bump:** required — changes default regenerate behavior
- **Regeneration:** migration entry must include `"personas"` in regenerate list
- **Security scan:** required