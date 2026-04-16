# FORGE-S05-T08: Grounding & Descriptive Pathing

**Sprint:** FORGE-S05
**Estimate:** M
**Pipeline:** default

---

## Objective

Implement descriptive folder naming and explicit path injection to eliminate model confusion and "path guessing" across different LLMs. This moves Forge from implied paths to deterministic, injected absolute paths in the symmetric prompt and adopts a human-readable kebab-case naming convention for sprint and task directories.

## Acceptance Criteria

1. `meta-sprint-plan.md` updated to instruct the Architect to use the `ID-description` format (e.g., `FORGE-S05-agent-runtime-portability`) for sprint and task folders.
2. `meta-orchestrate.md` updated to inject a "Current Working Context" block into subagent prompts, providing absolute paths for Sprint Root, Task Root, and Store Root.
3. Store JSONs (`sprint.schema.json` and `task.schema.json` implementations) continue to use short IDs for primary keys but correctly store the descriptive paths in the `path` fields.
4. All new tasks generated after this change follow the `ID-description` folder convention.
5. `node --check` passes on all modified JS/CJS files.

## Context

Current path resolution relies on the model calculating the path based on the `MASTER_INDEX.md` or `PLAN.md`, which leads to failures in non-Claude models. This task implements "Explicit Path Injection" as part of the Symmetric Injection pattern to ensure deterministic grounding.

## Plugin Artifacts Involved

- `forge/meta/workflows/meta-sprint-plan.md`
- `forge/meta/workflows/meta-orchestrate.md`
- `forge/meta/workflows/meta-plan-task.md` (to align PLAN.md target folder definitions)

## Operational Impact

- **Version bump:** required — changes to meta-workflows alter the generated behavior of the SDLC process.
- **Regeneration:** users must run `/forge:update` (or `/forge:regenerate`) to apply the updated meta-workflows.
- **Security scan:** required — modifies files within the `forge/` source directory.
