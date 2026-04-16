# PLAN — FORGE-S05-T06: Portability migration

🌱 *Forge Engineer*

**Task:** FORGE-S05-T06
**Sprint:** FORGE-S05
**Estimate:** M

---

## Objective

Add a migration path in `/forge:update` that converts legacy `model: <id>` fields in existing generated workflows to the new `requirements` block format. This ensures users upgrading from pre-S05 versions get a working orchestrator without manual edits.

## Approach

The goal is to automate the transition of artifact structures from a simple `model` string to a structured `requirements` block.

1.  **Update Migration Manifest**: Add a new entry to `forge/migrations.json` mapping from `0.6.13` to the next version (e.g., `0.7.0`).
2.  **Enhance Update Command**: Modify `forge/commands/update.md` to implement the detection and guidance logic for this specific structural change.
3.  **Implement Detection Logic**: The update process must scan `.forge/workflows/` for the legacy `model:` pattern.
4.  **Guide Regeneration**: Ensure the migration entry triggers full regeneration of `workflows`, `personas`, and `skills` to apply the new format.
5.  **User Guidance**: Provide clear warnings and manual steps for users with custom `config.pipelines` overrides.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/migrations.json` | Add migration entry `0.6.13` → `0.7.0` | Define the version leap and regeneration targets. |
| `forge/commands/update.md` | Add logic to detect legacy `model:` fields and guide the user | Implement the actual migration process for the artifact structure. |

## Plugin Impact Assessment

- **Version bump required?** No — deferred to T07.
- **Migration entry required?** Yes — `["workflows", "personas", "skills"]`
- **Security scan required?** Yes — changes to `forge/` directory. Deferred to T07.
- **Schema change?** No — uses existing migration and config schemas.

## Testing Strategy

- Syntax check: `node --check forge/tools/*.cjs` (though primarily markdown files are changed).
- Store validation: `node forge/tools/validate-store.cjs --dry-run`.
- Manual smoke test:
    - Simulate a project at `0.6.13` with legacy `model:` fields in workflows.
    - Run `/forge:update` and verify the breaking change warning appears.
    - Verify that regeneration of workflows produces the new `requirements` block format.
    - Verify idempotency (running update twice).

## Acceptance Criteria

- [ ] `forge/migrations.json` includes migration from `0.6.13` to `0.7.0` with `regenerate: ["workflows", "personas", "skills"]` and `breaking: true`.
- [ ] `forge/commands/update.md` detects legacy `model:` fields in `.forge/workflows/` and warns the user.
- [ ] Migration guides regeneration of workflows, personas, and skills.
- [ ] Migration warns users about custom `model` overrides in `.forge/config.json`.
- [ ] Migration is idempotent.
- [ ] `node --check` passes on all modified JS/CJS files.
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0.

## Operational Impact

- **Distribution:** Users will be prompted to regenerate artifacts upon updating to the version defined in T07.
- **Backwards compatibility:** The orchestrator should maintain support for both formats until regeneration occurs.
