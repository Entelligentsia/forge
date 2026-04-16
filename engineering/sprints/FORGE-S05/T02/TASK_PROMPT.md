# FORGE-S05-T02: Dual-artifact generation

**Sprint:** FORGE-S05
**Estimate:** L
**Pipeline:** default

---

## Objective

Update the `/forge:init` generation pipeline to produce two new artifact
directories in target projects — `.forge/personas/` and `.forge/skills/` —
alongside the existing `.forge/workflows/`. After this task, `/forge:regenerate`
creates all three artifact categories from their respective meta-templates.

## Acceptance Criteria

1. A new generation phase file `forge/init/generation/generate-skills.md` exists,
   following the same structure as `generate-personas.md`. It reads
   `forge/meta/skills/meta-*.md` and produces `.forge/skills/{role}-skills.md`
   in the target project.
2. `forge/init/generation/generate-personas.md` is updated to produce
   `.forge/personas/{role}.md` as **standalone files** instead of an intermediate
   `personas-context.md`. The "Skill Invocation Wiring" section is removed or
   replaced with a pointer to `generate-skills.md`.
3. The init orchestrator (`forge/init/sdlc-init.md` or equivalent) includes the
   new `generate-skills` phase in the correct order:
   Phase 3 (personas) -> Phase 3b (skills) -> Phase 5 (workflows).
4. `forge/commands/regenerate.md` recognises `skills` and `personas` as valid
   regeneration targets (in addition to the existing `workflows`, `tools`, etc.).
5. Generated `.forge/personas/` files are standalone persona context documents
   (not embedded in workflows).
6. Generated `.forge/skills/` files contain role-specific skill sets with
   project-interpolated tool and technique references.
7. `node --check` passes on all modified JS/CJS files.

## Context

- **Depends on T01** — the meta-skill templates must exist before this task
  can wire their generation.
- Currently `generate-personas.md` produces an intermediate
  `.forge/personas-context.md` that is consumed by Phase 5 (`generate-workflows.md`).
  This task changes the output to standalone files in `.forge/personas/`.
- The `generate-workflows.md` phase will need to know where to find persona and
  skill content for injection — but the injection change itself is T05
  (symmetric injection). This task only ensures the files are generated; T05
  wires them into the orchestrator prompt assembly.
- Read `forge/commands/regenerate.md` to understand the current target list.
- Read `forge/init/sdlc-init.md` (or the `forge/init/` directory) to
  understand the generation phase order.
- Read `forge/init/generation/generate-personas.md` for the current intermediate
  output pattern.

## Plugin Artifacts Involved

- **New:** `forge/init/generation/generate-skills.md`
- **Modified:** `forge/init/generation/generate-personas.md` — standalone output
- **Modified:** `forge/commands/regenerate.md` — add `personas` and `skills` targets
- **Modified:** init orchestrator (e.g., `forge/init/sdlc-init.md`) — add generate-skills phase

## Plan Template

When planning, use `.forge/templates/PLAN_TEMPLATE.md` as the base structure.

## Operational Impact

- **Version bump:** not required yet — will be bumped in T07.
- **Regeneration:** after this lands, users who run `/forge:regenerate` will get
  the new directories. Existing users won't notice until T07's release.
- **Security scan:** required (changes to `forge/`); deferred to T07.
