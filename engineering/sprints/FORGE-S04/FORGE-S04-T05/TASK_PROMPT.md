# FORGE-S04-T05: Port `estimate-usage.cjs` to store facade

**Sprint:** FORGE-S04
**Estimate:** S
**Pipeline:** default

---

## Objective

Port `estimate-usage.cjs` to use the new store facade, replacing all direct event file reads/writes.

## Acceptance Criteria

1. `node --check forge/tools/estimate-usage.cjs` passes.
2. Token backfill output is identical before and after the port.
3. No direct `fs` reads/writes of event files remain.

## Context

Depends on FORGE-S04-T01.

## Plugin Artifacts Involved

- `forge/tools/estimate-usage.cjs`

## Operational Impact

- **Version bump:** Required — change to existing tool.
- **Regeneration:** Users must run `/forge:update`.
- **Security scan:** Required — change to `forge/`.
