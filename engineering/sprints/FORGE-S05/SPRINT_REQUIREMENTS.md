# Sprint Requirements: Agent Definition & Runtime Portability (FORGE-S05)

## Summary
This sprint transitions Forge from a static, hardcoded agent definition model to a composable **3-Dimensional Agent Model** (Persona + Skills + Process) and implements **Runtime Portability** through capability-based model resolution.

The goal is to decouple the **Who** (Persona), the **What** (Skills), and the **How** (Process/Model) to allow for project-specific customization and support for non-Anthropic runtimes.

---

## Goals
1. **Implement 3D Agent Architecture:**
   - **Persona (Identity):** Move from embedded strings to generated project artifacts in `.forge/personas/`.
   - **Skills (Toolbox):** Introduce generated project-specific skill sets in `.forge/skills/`.
   - **Process (Blueprint):** Purify workflows in `.forge/workflows/` to be "pure process" documents.
2. **Achieve Runtime Portability:**
   - Replace hardcoded `model: <id>` with a `requirements` schema in workflow frontmatter.
   - Implement a resolution algorithm in the orchestrator to match capabilities to available runtime models.
3. **Correct Role Alignment:**
   - Ensure `/sprint-intake` executes under the **Product Manager** persona and skill set.

---

## Scope

### Included
- **Plugin Source (`forge/`):**
    - Creation of `forge/meta/skills/` with meta-skill templates.
    - Modification of `forge/init/generation/` for dual-artifact generation (Persona + Skills).
    - Update to `forge/meta/workflows/meta-orchestrate.md` for symmetric injection and model resolution.
    - Purification of all meta-workflows in `forge/meta/workflows/`.
    - Implementation of a migration path in `/forge:update` to convert legacy `model` IDs to `requirements` blocks.
- **Persona & Role Fixes:**
    - Addition of the Orchestrator persona to `forge/meta/personas/meta-orchestrator.md`.
    - Correct mapping of sprint-intake to the PM persona.

### Excluded
- Modifying the "voice" or "personality" of existing personas.
- Adding new roles to the SDLC.
- Modifying the core `Agent` tool implementation in the Claude Code harness.

---

## Acceptance Criteria

- [ ] **Regeneration:** `/forge:regenerate` creates `.forge/personas/` and `.forge/skills/` directories with correctly interpolated, project-specific content.
- [ ] **Purification:** All generated files in `.forge/workflows/` contain no `## Persona` or `## Skills` sections.
- [ ] **Symmetric Injection:** Subagent prompts are verified to follow the sequence: `[Persona Content]` $\rightarrow$ `[Skill Content]` $\rightarrow$ `[Process/Workflow]`.
- [ ] **Portability:** The orchestrator successfully resolves a matching model when the `preferred_model` is unavailable in the runtime.
- [ ] **Correct Role:** `/sprint-intake` is verified to be operating as a Product Manager.

---

## Constraints & Risks

### Constraints
- **Light Context:** Injection must happen at subagent spawn to prevent orchestrator context bloat.
- **Mandatory Regen:** This is a breaking change for generated artifacts; all users must run `/forge:regenerate`.

### Risks
- **Injection Order:** Incorrect sequence of Persona/Skills/Process could lead to agent identity drift.
- **Capability Mapping:** Overly rigid mapping of reasoning levels could lead to resolution failures on limited runtimes.
