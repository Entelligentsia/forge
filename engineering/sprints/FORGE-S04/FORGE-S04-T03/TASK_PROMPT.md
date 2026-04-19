# FORGE-S04-T03: Port `collate.cjs` to store facade

**Sprint:** FORGE-S04
**Estimate:** M
**Pipeline:** default

---

## Objective

Port `collate.cjs` to use the new store facade, replacing all direct store reads. The generated markdown output must remain unchanged.

## Acceptance Criteria

1. `node --check forge/tools/collate.cjs` passes.
2. Generated `engineering/` markdown files are byte-for-byte identical before and after the port.
3. No direct `fs` reads of store entities remain.

## Context

Depends on FORGE-S04-T01.

## Plugin Artifacts Involved

- `forge/tools/collate.cjs`

## Operational Impact

- **Version bump:** Required — change to existing tool.
- **Regeneration:** Users must run `/forge:update`.
- **Security scan:** Required — change to `forge/`.
