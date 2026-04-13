# PLAN — FORGE-S05-T05: Symmetric injection & model resolution

🌱 *Forge Engineer*

**Task:** FORGE-S05-T05
**Sprint:** FORGE-S05
**Estimate:** L

---

## Objective

Update the orchestrator meta-workflow (`meta-orchestrate.md`) to implement **symmetric injection**, ensuring every subagent prompt is assembled as: `[Persona Content] -> [Skill Content] -> [Process/Workflow]`. Additionally, replace hardcoded model references with a **capability-based requirements schema** that the orchestrator resolves at runtime based on a capability table.

## Approach

### 1. Symmetric Injection Implementation
The orchestrator's `spawn_subagent` logic will be modified to read persona and skill content from disk at the moment of spawning. This prevents persona/skill content from bloating the orchestrator's own context window.

- **Persona Path:** `.forge/personas/{role}.md`
- **Skill Path:** `.forge/skills/{role}-skills.md`
- **Assembly:** The prompt will be constructed as:
  ```
  [Content of persona file]
  [Content of skill file]
  Read `{phase.workflow}` and follow it. Task ID: {task_id}.
  ... (rest of orchestrator prompt)
  ```

### 2. Capability-Based Model Resolution
I will replace the current role-based model default table with a resolution engine.

- **Requirements Schema:** Workflows will now define a `requirements` block in their frontmatter:
  ```yaml
  requirements:
    reasoning: high    # high | medium | low
    speed: standard    # fast | standard
    context: standard  # large | standard
  ```
- **Capability Table:** The orchestrator will maintain a mapping of available models (`sonnet`, `opus`, `haiku`) to these capability levels.
- **Resolution Priority:**
  1. `phase.model` override from `config.pipelines` (Highest).
  2. Match `requirements` against the capability table.
  3. Fall back to the role-based default table (current behavior).
- **Graceful Fallback:** If a preferred model (e.g., `opus`) is unavailable, the orchestrator will select the next-best match based on the reasoning/speed requirements.

### 3. Meta-Workflow Updates
- **`meta-orchestrate.md`**: Update the `Model Resolution` and `Execution Algorithm` sections to implement the logic above.
- **`meta-fix-bug.md`**: Review and update the orchestration loop in the bug-fix workflow to align with the symmetric injection pattern.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/meta/workflows/meta-orchestrate.md` | Update Model Resolution and Execution Algorithm | Core implementation of symmetric injection and capability-based model resolution. |
| `forge/meta/workflows/meta-fix-bug.md` | Update orchestration loop if present | Ensure consistency across all orchestrators. |

## Plugin Impact Assessment

- **Version bump required?** No — deferred to T07 per task prompt.
- **Migration entry required?** No — deferred to T07.
- **Security scan required?** Yes — changes to `forge/` require a scan (deferred to T07).
- **Schema change?** No — only changes to the meta-workflow logic.

## Testing Strategy

- Syntax check: `node --check` is not applicable as these are Markdown files, but I will verify the logic flow.
- Manual verification:
  - Simulate the prompt assembly to ensure persona and skill content are correctly ordered.
  - Trace the model resolution priority chain for various scenarios (override vs requirements vs default).
  - Verify that the fallback mechanism correctly handles missing models.

## Acceptance Criteria

- [ ] `meta-orchestrate.md`'s `spawn_subagent` logic assembles prompts in the order: persona $\rightarrow$ skill $\rightarrow$ workflow.
- [ ] `meta-orchestrate.md` defines the `requirements` frontmatter schema for workflows.
- [ ] Model resolution priority follows: `phase.model` $\rightarrow$ `requirements` $\rightarrow$ `role default`.
- [ ] A capability table mapping models to reasoning/speed/context levels is defined.
- [ ] Graceful fallback is implemented for unavailable models.
- [ ] `meta-fix-bug.md` (if applicable) is updated to the same injection pattern.

## Operational Impact

- **Distribution:** No immediate effect; users must run `/forge:regenerate workflows` after the T07 release to receive the new orchestrator.
- **Backwards compatibility:** Preserved; the role-based default table remains as the final fallback for workflows without `requirements` blocks.
