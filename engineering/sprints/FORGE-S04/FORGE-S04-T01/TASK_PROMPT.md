# FORGE-S04-T01: Implement `forge/tools/store.cjs` facade

**Sprint:** FORGE-S04
**Estimate:** M
**Pipeline:** default

---

## Objective

Ship `forge/tools/store.cjs` — a backend-agnostic store interface and `FSImpl` (filesystem implementation) that provides full CRUD operations for all five store entities (Sprint, Task, Bug, Event, Feature). This facade will eliminate direct `fs` calls in tooling, allowing for future backend flexibility.

## Acceptance Criteria

1. `node --check forge/tools/store.cjs` passes.
2. All five entities (Sprint, Task, Bug, Event, Feature) have at minimum: `get{Entity}(id)`, `list{Entities}(filter?)`, `write{Entity}(data)`, and `delete{Entity}(id)`.
3. `FSImpl` reads/writes the same `.forge/store/` paths and file shapes as currently used by existing tools.
4. Utility methods are limited to those provably used by the tools being ported in this sprint (e.g., filtered lists, summary accessors).
5. No new npm dependencies — Node.js built-ins only.

## Context

This is the foundational task for FEAT-001 (Store Abstraction Layer). All subsequent porting tasks (T02-T05) depend on this facade being implemented and stable.

## Plugin Artifacts Involved

- `forge/tools/store.cjs` (New file)

## Operational Impact

- **Version bump:** Required — introduces a new core tool distributed to users.
- **Regeneration:** Users must run `/forge:update` to receive the new tool.
- **Security scan:** Required — new code in `forge/`.
