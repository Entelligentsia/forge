# PLAN — FORGE-S05-T03: Persona & Role alignment

🌱 *Forge Engineer*

**Task:** FORGE-S05-T03
**Sprint:** FORGE-S05
**Estimate:** S

---

## Objective

Ensure every SDLC meta-workflow is mapped to the correct persona, verify that the Orchestrator and Product Manager persona definitions are accurate and complete, and document the final role-to-workflow mapping to prevent misalignment in generated projects.

## Approach

1. **Verify Orchestrator Persona:** Review `forge/meta/personas/meta-orchestrator.md` to ensure it explicitly defines the role as a lightweight state-machine driver, context-isolation enforcer, and event emitter.
2. **Audit Workflow Personas:** Scan all 16 files in `forge/meta/workflows/` to identify which ones are missing `## Persona` sections or have incorrect mappings.
3. **Align Sprint Intake:** Confirm `forge/meta/workflows/meta-sprint-intake.md` references the Product Manager persona.
4. **Create Mapping Document:** Generate `forge/meta/personas/README.md` containing a comprehensive table mapping each of the 16 meta-workflows to its respective persona.
5. **Fix Discrepancies:** Update any meta-workflows that lack the required persona block or reference the wrong persona file.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/meta/personas/meta-orchestrator.md` | Update content if it's a stub or incomplete | Ensure the Orchestrator's role is correctly defined |
| `forge/meta/personas/README.md` | Create new file | Provide the official role-to-workflow mapping |
| `forge/meta/workflows/*.md` | Add/Update `## Persona` sections in missing workflows | Ensure every workflow is linked to a persona for consistent generation |

## Plugin Impact Assessment

- **Version bump required?** No — persona content changes are absorbed during regeneration. Will be bumped in T07.
- **Migration entry required?** No.
- **Security scan required?** Yes — any change to `forge/` requires a scan, but as per task prompt, this is deferred to T07.
- **Schema change?** No.

## Testing Strategy

- Syntax check: `node --check` on any modified JS/CJS files (though mostly Markdown is being touched).
- Store validation: `node forge/tools/validate-store.cjs --dry-run` (no schema changes expected).
- Manual verification: Confirm all 16 workflows have a persona section and the mapping in `README.md` matches.

## Acceptance Criteria

- [ ] `forge/meta/personas/meta-orchestrator.md` defines the role: lightweight state-machine driver, context-isolation enforcer, event emitter.
- [ ] `forge/meta/workflows/meta-sprint-intake.md` references the Product Manager persona (`meta-product-manager.md`).
- [ ] `forge/meta/personas/README.md` exists and contains a table mapping all 16 meta-workflows to their personas.
- [ ] All 16 meta-workflows in `forge/meta/workflows/` contain a `## Persona` section.
- [ ] No meta-workflow references a non-existent persona file.
- [ ] `node --check` passes on all modified JS/CJS files.
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0.

## Operational Impact

- **Distribution:** No immediate user action required. Changes will be distributed in the next version bump.
- **Backwards compatibility:** High. Changes to meta-definitions only affect future `forge:init` or `forge:regenerate` calls.
