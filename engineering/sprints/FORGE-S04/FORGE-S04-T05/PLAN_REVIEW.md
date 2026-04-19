# PLAN REVIEW — FORGE-S04-T05: Port `estimate-usage.cjs` to store facade

🌿 *Forge Supervisor*

**Task:** FORGE-S04-T05

---

**Verdict:** Approved

---

## Review Summary

The plan correctly identifies the need to move `estimate-usage.cjs` from direct filesystem manipulation to the `Store` facade. The mapping of `fs` calls to `store.listEvents`, `store.getEvent`, and `store.writeEvent` is accurate and follows the architectural goal of centralizing store access.

## Feasibility

The approach is realistic. `forge/tools/estimate-usage.cjs` is a standalone utility whose logic is separate from the data access layer. Replacing the file-based loop with object-based processing using the `Store` facade is straightforward and correctly scoped.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes (v0.6.12)
- **Migration entry targets correct?** N/A (no schema changes)
- **Security scan requirement acknowledged?** Yes

## Security

The change is a refactor of internal data access. No new user-controlled inputs are introduced, and the logic remains deterministic. The security scan is correctly required since `forge/` is modified.

## Architecture Alignment

The plan aligns with the "Store Abstraction Layer" goal for FORGE-S04. It removes hardcoded paths and `fs` logic in favor of the facade.

## Testing Strategy

The plan includes:
- `node --check` for syntax verification.
- `validate-store --dry-run` to ensure store integrity.
- A manual smoke test on a real sprint.
This is sufficient for this type of port.

---

## If Approved

### Advisory Notes

When implementing the `Sprinting batch mode` refactor:
- Note that `store.listEvents(sprintId)` returns an array of event objects, whereas the current implementation iterates over file paths and calls `readJson`. 
- The current tool filters out `_sidecar` files. Ensure the `Store.listEvents` implementation (or the tool's usage of it) maintains this filtering logic to avoid attempting to process token usage sidecars as events. (Looking at `store.cjs`, `listEvents` reads all `.json` files in the events directory. Since sidecars start with `_`, they will be read. The tool should filter them out of the resulting object list).
