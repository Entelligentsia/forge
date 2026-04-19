# FORGE-S05-T03: Persona & Role alignment

**Sprint:** FORGE-S05
**Estimate:** S
**Pipeline:** default

---

## Objective

Ensure every SDLC workflow is mapped to the correct persona, and verify/update
persona definitions for completeness. Specifically:

1. Verify that `forge/meta/personas/meta-orchestrator.md` correctly defines the
   Orchestrator role (lightweight state-machine driver, context-isolation enforcer,
   event emitter).
2. Verify that `/sprint-intake` (`meta-sprint-intake.md`) executes under the
   **Product Manager** persona — not the Architect.
3. Verify that each meta-workflow's persona reference points to the correct
   meta-persona file.

## Acceptance Criteria

1. `forge/meta/personas/meta-orchestrator.md` exists with complete content
   defining the Orchestrator role: lightweight state-machine driver,
   context-isolation enforcer, event emitter. Not a stub.
2. `forge/meta/workflows/meta-sprint-intake.md` references the Product Manager
   persona (`meta-product-manager.md`), not the Architect.
3. A role-to-workflow mapping is documented (either as a table in
   `forge/meta/personas/README.md` or as `role:` frontmatter in each workflow)
   covering all 16 meta-workflows.
4. No meta-workflow references a non-existent persona file.
5. `node --check` passes on all modified JS/CJS files (if any).

## Context

- **Depends on T02** — standalone persona files must be generated before we
  can verify alignment end-to-end.
- The sprint requirements call out: "Ensure `/sprint-intake` executes under the
  Product Manager persona."
- Current `meta-sprint-intake.md` already has `Product Manager` in its
  `## Persona` section (line 8) — verify this is correct and consistent.
- `forge/meta/personas/meta-orchestrator.md` already exists per the file listing.
  Read it and confirm it matches the expected Orchestrator definition; update if
  it is a stub or incomplete.
- Read all 8 files in `forge/meta/personas/` and all 16 in `forge/meta/workflows/`
  to build the complete mapping.

## Plugin Artifacts Involved

- **Modified (if needed):** `forge/meta/personas/meta-orchestrator.md`
- **Verified:** `forge/meta/workflows/meta-sprint-intake.md` persona reference
- **New:** role-to-workflow mapping document (e.g., `forge/meta/personas/README.md`)

## Plan Template

When planning, use `.forge/templates/PLAN_TEMPLATE.md` as the base structure.

## Operational Impact

- **Version bump:** not required — persona content changes are absorbed during
  regeneration. Will be bumped in T07.
- **Regeneration:** no user action needed at this stage.
- **Security scan:** required (changes to `forge/`); deferred to T07.
