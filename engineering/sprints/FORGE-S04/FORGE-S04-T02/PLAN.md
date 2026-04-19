# PLAN — FORGE-S04-T02: Port `validate-store.cjs` to store facade

🌱 *Forge Engineer*

**Task:** FORGE-S04-T02
**Sprint:** FORGE-S04
**Estimate:** L

---

## Objective

Port the logic of `forge/tools/validate-store.cjs` to use the `forge/tools/store.cjs` facade. This removes direct `fs` and `path` dependencies from the validation logic, centralizing store access and preparing for potential non-filesystem backends.

## Approach

1. **Integrate Store Facade**: Replace all manual `fs.readFileSync` and `fs.readdirSync` calls in `validate-store.cjs` with methods from the `Store` facade (e.g., `listSprints`, `listTasks`, `getSprint`).
2. **Decouple Schema Definitions**: Maintain the `SCHEMAS` object within `validate-store.cjs` (as it is currently self-contained), but apply validation to records retrieved via the facade.
3. **Refactor ID Collection**: Use `listSprints`, `listTasks`, etc., to populate the ID sets used for referential integrity checks.
4. **Update Fix Mode**: Use `store.writeSprint`, `store.writeTask`, etc., instead of `fs.writeFileSync` when performing backfills or nullifying orphaned feature IDs.
5. **Preserve CLI Interface**: Maintain the `--dry-run` and `--fix` flags and the existing console output format.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/validate-store.cjs` | Full refactor to use `require('./store.cjs')` | Migrate from raw filesystem access to the store facade. |

## Plugin Impact Assessment

- **Version bump required?** Yes — material change to a tool's implementation. New version: `0.6.12`
- **Migration entry required?** No — no schema changes or state machinery alterations.
- **Security scan required?** Yes — any change to `forge/` requires a scan.
- **Schema change?** No.

## Testing Strategy

- Syntax check: `node --check forge/tools/validate-store.cjs`
- Store validation: `node forge/tools/validate-store.cjs --dry-run` (verify it still correctly identifies/ignores store issues)
- Smoke test: Run `validate-store.cjs` on the current project to ensure it identifies the same results as before the port.

## Acceptance Criteria

- [ ] `validate-store.cjs` no longer uses `fs` or `path` for store CRUD operations (except for potentially reading `config.json` if the facade doesn't handle it, though the facade already does).
- [ ] All referential integrity checks (Sprints $\to$ Features, Tasks $\to$ Sprints/Features, Bugs $\to$ Bugs, Events $\to$ Tasks/Bugs/Sprints) function correctly using facade data.
- [ ] `--fix` mode correctly writes updates back to the store via the facade.
- [ ] `node --check` passes on `forge/tools/validate-store.cjs`.
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0 (assuming the current store is valid).

## Operational Impact

- **Distribution:** Users will need to run `/forge:update` to receive the updated tool.
- **Backwards compatibility:** Preserved. The store format remains identical.
