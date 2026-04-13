# PLAN — FORGE-S05-T01: Meta-skills framework

🌱 *Forge Engineer*

**Task:** FORGE-S05-T01
**Sprint:** FORGE-S05
**Estimate:** M

---

## Objective

Create the meta-skills framework — the second dimension of the 3D Agent Model. This task extracts the concern of "Skill Invocation Wiring" from `forge/init/generation/generate-personas.md` into its own artifact layer: `forge/meta/skills/` templates. These templates will be used by the generation process (T02) to produce project-specific skill sets in `.forge/skills/`.

## Approach

I will create a set of meta-skill templates in `forge/meta/skills/` that mirror the pattern of the meta-personas. Each template will define the "toolbox" for a specific role, specifying which universal skills should be invoked and when.

1. **Create Directory:** Ensure `forge/meta/skills/` exists.
2. **Define Meta-Skills:** Create templates for the primary SDLC roles:
   - `meta-engineer-skills.md`
   - `meta-supervisor-skills.md`
   - `meta-architect-skills.md`
   - `meta-bug-fixer-skills.md`
   - `meta-generic-skills.md` (for lightweight roles like Orchestrator, Collator, Commit)
3. **Template Structure:** Each file will include:
   - Frontmatter: `name`, `description`, `role`.
   - `## Generation Instructions`: Instructions on how to interpolate project-specific values and reference `installedSkills` from `.forge/config.json`.
   - `## Skill Set`: A definition of the tools, techniques, and checklists relevant to the role.
4. **Extraction Logic:** The templates will explicitly describe the logic currently found in the "Skill Invocation Wiring" section of `generate-personas.md`, transforming it from a generation instruction into a meta-artifact.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/meta/skills/meta-engineer-skills.md` | Create | Define skill set for the Engineer role |
| `forge/meta/skills/meta-supervisor-skills.md` | Create | Define skill set for the Supervisor/QA role |
| `forge/meta/skills/meta-architect-skills.md` | Create | Define skill set for the Architect role |
| `forge/meta/skills/meta-bug-fixer-skills.md` | Create | Define skill set for the Bug-Fixer role |
| `forge/meta/skills/meta-generic-skills.md` | Create | Define baseline skills for support roles |

## Plugin Impact Assessment

- **Version bump required?** No — this change only adds meta-templates. No user-facing behavior changes until T02 wires the generation logic.
- **Migration entry required?** No.
- **Security scan required?** Yes — any change to `forge/` requires a scan. This will be performed during the final release task (T07).
- **Schema change?** No.

## Testing Strategy

- Syntax check: `node --check` is not applicable as these are Markdown files.
- Store validation: `node forge/tools/validate-store.cjs --dry-run` is not applicable (no schema changes).
- Manual smoke test: Verify that all created files follow the `meta-*.md` pattern and include the required sections.

## Acceptance Criteria

- [ ] Directory `forge/meta/skills/` exists.
- [ ] `meta-engineer-skills.md` created with correct frontmatter and sections.
- [ ] `meta-supervisor-skills.md` created with correct frontmatter and sections.
- [ ] `meta-architect-skills.md` created with correct frontmatter and sections.
- [ ] `meta-bug-fixer-skills.md` created with correct frontmatter and sections.
- [ ] `meta-generic-skills.md` created with correct frontmatter and sections.
- [ ] All templates include a `## Generation Instructions` section referencing `installedSkills`.

## Operational Impact

- **Distribution:** No immediate impact. Users do not need to run `/forge:update`.
- **Backwards compatibility:** No impact; these are new internal meta-artifacts.
