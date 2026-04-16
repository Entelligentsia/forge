# FORGE-S05-T05: Symmetric injection & model resolution

**Sprint:** FORGE-S05
**Estimate:** L
**Pipeline:** default

---

## Objective

Update the orchestrator meta-workflow (`meta-orchestrate.md`) to implement
**symmetric injection** — every subagent prompt is assembled as:
`[Persona Content] -> [Skill Content] -> [Process/Workflow]`. Also replace
hardcoded `model: <id>` references with a **capability-based requirements
schema** that the orchestrator resolves at runtime.

## Acceptance Criteria

1. `meta-orchestrate.md`'s `spawn_subagent` calls assemble the prompt in the
   order: persona file content -> skill file content -> workflow file path.
   The algorithm reads `.forge/personas/{role}.md` and `.forge/skills/{role}-skills.md`
   at spawn time (not pre-loaded into orchestrator context).
2. A `requirements` frontmatter schema is defined for workflows, replacing
   `model: <id>`. Example:
   ```yaml
   requirements:
     reasoning: high    # high | medium | low
     speed: standard    # fast | standard
     context: standard  # large | standard
   ```
3. The Model Resolution section (currently lines 20-42 of `meta-orchestrate.md`)
   is updated to resolve requirements to available runtime models. Priority chain:
   a. `phase.model` override from `config.pipelines` (highest priority)
   b. Match `requirements` against a capability table of available models
   c. Fall back to the role-based default table (current behaviour)
4. The capability table is defined in the orchestrator mapping model short names
   (`sonnet`, `opus`, `haiku`) to capability levels.
5. If the preferred model is unavailable in the runtime, the orchestrator falls
   back gracefully to the next-best match without failing.
6. The Execution Algorithm section (lines 120-180) is updated to include
   persona/skill file reads in the spawn step.
7. `node --check` passes on all modified JS/CJS files (if any).

## Context

- **Depends on T04** — workflows must be purified (no embedded persona) before
  the orchestrator can inject persona as a separate content block.
- Today's `meta-orchestrate.md` spawns subagents with (line ~142):
  ```
  prompt="Read `{phase.workflow}` and follow it. Task ID: {task_id}..."
  ```
  This must change to:
  ```
  prompt="[persona content]\n[skill content]\nRead `{phase.workflow}` and follow it. Task ID: {task_id}..."
  ```
- The injection happens at spawn time so persona/skill content does NOT
  accumulate in the orchestrator's own context (Light Context principle from
  the Context Isolation section, lines 70-86).
- Read the current Model Resolution section in `meta-orchestrate.md` (lines
  20-42) to understand the existing role-based defaults.
- The `requirements` schema is a **meta-level** concept — it lives in the
  meta-workflow and is interpolated into the generated workflow. The generated
  orchestrator reads the requirement at runtime and resolves it.
- Also check `meta-fix-bug.md` — if it has its own orchestration loop, it
  needs the same injection pattern.

## Plugin Artifacts Involved

- **Modified:** `forge/meta/workflows/meta-orchestrate.md` — symmetric injection
  in spawn algorithm; requirements schema; updated Model Resolution section
- **Modified (possibly):** `forge/meta/workflows/meta-fix-bug.md` — if it has
  its own orchestration loop

## Plan Template

When planning, use `.forge/templates/PLAN_TEMPLATE.md` as the base structure.

## Operational Impact

- **Version bump:** not required yet — will be bumped in T07.
- **Regeneration:** this is the core change. After T07's release, users MUST
  run `/forge:regenerate workflows` to get the new orchestrator.
- **Security scan:** required (changes to `forge/`); deferred to T07.
