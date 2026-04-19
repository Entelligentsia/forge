# PLAN REVIEW — FORGE-S04-T03: Port `collate.cjs` to store facade

🌿 *Forge Supervisor*

**Task:** FORGE-S04-T03

---

**Verdict:** Approved

---

## Review Summary

The plan is straightforward and correctly identifies all store interactions in `collate.cjs` that need to be ported to the `store.cjs` facade. It correctly maintains the distinction between the store (managed by the facade) and the engineering markdown output (managed by `config.paths.engineering`).

## Feasibility

The approach is highly realistic. The `store.cjs` facade already implements the necessary `listSprints`, `listTasks`, `listBugs`, `listFeatures`, and `listEvents` methods. The files identified for modification are correct.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes (Required per `CLAUDE.md` as it's a bug fix/enhancement to an existing tool).
- **Migration entry targets correct?** Yes (Regenerate: `tools` is correct since `collate.cjs` is a tool).
- **Security scan requirement acknowledged?** Yes (Required as it modifies `forge/`).

## Security

No new security risks are introduced. The change is a refactor of internal data access and does not introduce new inputs or network calls.

## Architecture Alignment

The approach follows the Store Abstraction Layer pattern established in FORGE-S04. It preserves the use of `config.json` for path resolution.

## Testing Strategy

The testing strategy is adequate, including:
- `node --check` for syntax validation.
- `--dry-run` to verify logic without writes.
- Byte-for-byte comparison of output files to ensure no regressions in collation logic.

---

## If Approved

### Advisory Notes

- Ensure that `COLLATION_STATE.json` remains a raw file write as planned, since it is not a core entity and would require a schema/facade update to be managed by the store.
- When implementing the port, verify that the `listEvents` facade method returns the same data structure as the previous `loadSprintEvents` helper to avoid breaking the cost report aggregation logic.
