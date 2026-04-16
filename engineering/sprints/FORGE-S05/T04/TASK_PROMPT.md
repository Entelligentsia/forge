# FORGE-S05-T04: Workflow purification

**Sprint:** FORGE-S05
**Estimate:** M
**Pipeline:** default

---

## Objective

Purify all meta-workflows in `forge/meta/workflows/` so they contain **only
process logic** — no embedded `## Persona` or `## Skills` sections. After this
task, meta-workflows are "pure process" documents. Persona and skill context
is injected separately at subagent spawn time (T05).

## Acceptance Criteria

1. No file in `forge/meta/workflows/` contains a `## Persona` or `## Skills`
   heading.
2. Each meta-workflow retains a brief `role:` frontmatter field indicating
   which persona/role it is designed for (e.g., `role: engineer`), so the
   orchestrator knows which persona and skill files to inject.
3. The `## Purpose` section of each workflow remains intact.
4. The `## Algorithm` / step sections remain intact — only identity/skill
   blocks are removed.
5. `meta-sprint-intake.md`'s opening `## Persona` block is removed; a
   `role: product-manager` frontmatter field replaces it.
6. All 16 meta-workflows in `forge/meta/workflows/` are purified:
   `meta-approve.md`, `meta-collate.md`, `meta-commit.md`, `meta-fix-bug.md`,
   `meta-implement.md`, `meta-orchestrate.md`, `meta-plan-task.md`,
   `meta-retrospective.md`, `meta-review-implementation.md`,
   `meta-review-plan.md`, `meta-review-sprint-completion.md`,
   `meta-sprint-intake.md`, `meta-sprint-plan.md`, `meta-update-implementation.md`,
   `meta-update-plan.md`, `meta-validate.md`.
7. `node --check` passes on all modified JS/CJS files (if any).

## Context

- **Depends on T03** — role alignment must be verified before we strip persona
  blocks, so we know which `role:` tag to assign to each workflow.
- Currently, some meta-workflows embed persona context inline. For example,
  `meta-sprint-intake.md` has a `## Persona` section with
  `Product Manager` (lines 6-8). Others like `meta-implement.md` do NOT embed
  persona context. This task standardises all of them — strip inline persona
  blocks and add `role:` frontmatter.
- The `meta-orchestrate.md` workflow does NOT embed persona context today (it's
  a state machine). Add `role: orchestrator` frontmatter.
- Read each of the 16 files in `forge/meta/workflows/` to identify which
  ones have embedded persona/skill blocks before making changes.

## Plugin Artifacts Involved

- **Modified:** all 16 files in `forge/meta/workflows/`

## Plan Template

When planning, use `.forge/templates/PLAN_TEMPLATE.md` as the base structure.

## Operational Impact

- **Version bump:** not required yet — will be bumped in T07.
- **Regeneration:** after this lands, `/forge:regenerate workflows` will produce
  purified workflows. Users must also regenerate personas and skills (T02) for
  the full 3D model to work.
- **Security scan:** required (changes to `forge/`); deferred to T07.
