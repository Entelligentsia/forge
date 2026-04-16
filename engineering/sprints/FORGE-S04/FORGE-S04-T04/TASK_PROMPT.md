# FORGE-S04-T04: Port `seed-store.cjs` to store facade

**Sprint:** FORGE-S04
**Estimate:** S
**Pipeline:** default

---

## Objective

Port `seed-store.cjs` to use the new store facade, replacing all direct store writes.

## Acceptance Criteria

1. `node --check forge/tools/seed-store.cjs` passes.
2. Seeded store files match previous output exactly.
3. No direct `fs` writes to store paths remain.

## Context

Depends on FORGE-S04-T01.

## Plugin Artifacts Involved

- `forge/tools/seed-store.cjs`

## Operational Impact

- **Version bump:** Required — change to existing tool.
- **Regeneration:** Users must run `/forge:update`.
- **Security scan:** Required — change to `forge/`.
