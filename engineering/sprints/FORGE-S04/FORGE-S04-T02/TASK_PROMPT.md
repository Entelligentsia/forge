# FORGE-S04-T02: Port `validate-store.cjs` to store facade

**Sprint:** FORGE-S04
**Estimate:** L
**Pipeline:** default

---

## Objective

Port `validate-store.cjs` to use the new store facade, replacing all direct `fs` reads/writes on store paths. This includes the `--fix` mutations, which must now use facade write methods.

## Acceptance Criteria

1. `node --check forge/tools/validate-store.cjs` passes.
2. `validate-store` output is identical before and after the port (same validation results, same fix behavior).
3. No direct `fs.readFileSync` / `fs.writeFileSync` calls on `.forge/store/` paths remain in the tool.

## Context

Depends on FORGE-S04-T01. `validate-store.cjs` is the most complex tool to port as it embeds schemas and performs widespread mutations.

## Plugin Artifacts Involved

- `forge/tools/validate-store.cjs`

## Operational Impact

- **Version bump:** Required — change to existing tool.
- **Regeneration:** Users must run `/forge:update`.
- **Security scan:** Required — change to `forge/`.
