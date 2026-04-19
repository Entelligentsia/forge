# PLAN REVIEW — FORGE-S06-T02: Purify meta-workflows — remove Persona sections, reassign sprint-intake to PM

🌿 *Forge Supervisor*

**Task:** FORGE-S06-T02

---

**Verdict:** Approved

---

## Review Summary

The plan correctly identifies all 16 meta-workflows, cleanly separates them into orchestrator-spawned (remove only) vs standalone (remove + add self-load instruction), and addresses the sprint-intake persona reassignment. All six acceptance criteria from the task prompt are covered. No missing files, no incorrect categorisation, and the plugin impact assessment is accurate.

## Feasibility

The approach is realistic and correctly scoped. All 16 files are identified with correct paths. The categorisation into Category A (10 orchestrator-spawned) and Category B (6 standalone) matches the task prompt's distinction. The update-plan and update-implementation meta-workflows are correctly classified as orchestrator-spawned since the orchestrator routes back to them on revision. The orchestrator meta-workflow itself is a special case but receives the same treatment (remove `## Persona`) which is correct since its identity is already defined in the generated PERSONA_MAP.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — structural change to all 16 meta-workflows that alters generated workflow output is clearly material.
- **Migration entry targets correct?** Yes — `regenerate: ["workflows"]` is correct since only workflow generation is affected. No tools, schemas, commands, or personas need regeneration.
- **Security scan requirement acknowledged?** Yes — explicitly stated.

## Security

No new security risks introduced. Removing `## Persona` sections reduces the attack surface (less inline content that could be manipulated). The Persona Self-Load instruction for standalone workflows reads from `.forge/personas/{noun}.md` which is a trusted project-internal path. No prompt injection risk in the generation instructions.

## Architecture Alignment

- Does the approach follow established patterns? Yes — the symmetric injection pattern (persona from `.forge/personas/` files, skills from `.forge/skills/` files) is already established by T01. This plan removes the redundant inline duplicate.
- Does it preserve `additionalProperties: false`? N/A — no schema changes.
- No npm dependencies introduced. No path hardcoding.

## Testing Strategy

- Syntax check: N/A for Markdown files, correctly noted.
- `validate-store --dry-run`: Included in acceptance criteria. No schema changes but store integrity verification is sensible.
- Post-regeneration verification: Correctly specified in AC5 — confirm no `## Persona` section in generated workflows.

---

## If Approved

### Advisory Notes

1. **Generated filename for sprint-intake**: The current generated workflow is `architect_sprint_intake.md`. After regeneration with the Product Manager persona, the filename may change (e.g. `product-manager_sprint_intake.md` or `sprint_intake.md`). The plan should note this as an expected side effect of regeneration, not something this task needs to handle manually. The collate tool and any hardcoded references to the old filename will need to be verified.

2. **meta-orchestrate.md persona section line count**: The plan says "(3 lines)" but the actual `## Persona` section in meta-orchestrate.md spans lines 3-7 (4 lines of content plus blank lines). This is cosmetic but worth noting for precision during implementation.

3. **Consistency check**: After removing `## Persona` sections, verify that no other section in any meta-workflow still references the removed persona inline (e.g., an "Iron Law" that restates the persona tagline). The plan already covers this implicitly but it is worth an explicit sweep during implementation.