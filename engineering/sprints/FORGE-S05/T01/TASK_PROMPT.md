# FORGE-S05-T01: Meta-skills framework

**Sprint:** FORGE-S05
**Estimate:** M
**Pipeline:** default

---

## Objective

Create the meta-skills framework — the second dimension of the 3D Agent Model.
Today, skill context is wired into generated workflows inline via
`generate-personas.md`'s "Skill Invocation Wiring" section. This task extracts
that concern into its own artifact layer: `forge/meta/skills/` templates that
produce `.forge/skills/` in target projects during generation.

## Acceptance Criteria

1. Directory `forge/meta/skills/` exists with at least one meta-skill template
   per SDLC role that has domain-specific tooling needs (Engineer, Supervisor/QA,
   Architect, Bug-Fixer). Lightweight roles (Orchestrator, Collator, Commit) may
   share a minimal skill set or have none.
2. Each meta-skill template follows the pattern established by `forge/meta/personas/meta-*.md`:
   frontmatter with `name`, `description`, `role`; a `## Generation Instructions`
   section describing how to interpolate project-specific values; a body defining
   the skill set (tools, techniques, checklists the role can invoke).
3. Meta-skill templates reference installed skills from `.forge/config.json ->
   installedSkills` in their Generation Instructions, migrating the "Skill
   Invocation Wiring" concern out of `generate-personas.md`.
4. `node --check` passes on all modified JS/CJS files (if any).

## Context

- The sprint requirements define a **3D Agent Model**: Persona (identity) +
  Skills (toolbox) + Process (workflow). Personas exist (`forge/meta/personas/`).
  Workflows exist (`forge/meta/workflows/`). Skills do not yet have their own
  meta-template layer.
- Currently, skill wiring lives in `forge/init/generation/generate-personas.md`
  under the "Skill Invocation Wiring" section. That section should be
  extracted to a new `forge/init/generation/generate-skills.md` phase (or
  documented as a responsibility of T02).
- Reference `forge/meta/personas/meta-engineer.md` for the template pattern to
  mirror.
- Read `forge/meta/personas/` files to understand the naming convention and
  structure before creating skill templates.

## Plugin Artifacts Involved

- **New:** `forge/meta/skills/meta-engineer-skills.md` (and peers for each role)
- **Modified:** None — this task only creates the meta-skill templates.
  The generation phase that reads them is T02.

## Plan Template

When planning, use `.forge/templates/PLAN_TEMPLATE.md` as the base structure.

## Operational Impact

- **Version bump:** not required yet — no user-facing behavior changes until
  T02 wires generation. Will be bumped in T07.
- **Regeneration:** no user action needed at this stage.
- **Security scan:** required (new files in `forge/`); will be performed in T07.
