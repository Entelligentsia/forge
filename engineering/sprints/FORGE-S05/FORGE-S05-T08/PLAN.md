# PLAN — FORGE-S05-T08: Grounding & Descriptive Pathing

🌱 *Forge Engineer*

**Task:** FORGE-S05-T08
**Sprint:** FORGE-S05
**Estimate:** M

---

## Objective

Implement descriptive folder naming and explicit path injection to eliminate model confusion and "path guessing" across different LLMs. This moves Forge from implied paths to deterministic, injected absolute paths in the symmetric prompt and adopts a human-readable kebab-case naming convention for sprint and task directories.

## Approach

The goal is to move away from the model "guessing" paths based on IDs (e.g., `FORGE-S05-T08`) and instead provide the exact absolute paths during subagent spawning.

1.  **Update Sprint Planning Logic:** Modify `meta-sprint-plan.md` to instruct the Analyst to name folders using the `ID-description` format (e.g., `FORGE-S05-agent-runtime-portability`).
2.  **Implement Explicit Path Injection:** Update `meta-orchestrate.md` to include a "Current Working Context" block in the subagent prompt. This block will provide the absolute paths for:
    *   Sprint Root
    *   Task Root
    *   Store Root
3.  **Align Task Planning:** Update `meta-plan-task.md` to ensure `PLAN.md` and other artifacts are targeted to these descriptive paths.
4.  **Version Management:** Since this changes the behavior of generated workflows and the SDLC process, a version bump and migration entry are required.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/meta/workflows/meta-sprint-plan.md` | Update instructions for folder naming convention. | Ensures new sprints/tasks use `ID-description` format. |
| `forge/meta/workflows/meta-orchestrate.md` | Add "Current Working Context" block to `spawn_subagent` prompt. | Provides deterministic absolute paths to subagents. |
| `forge/meta/workflows/meta-plan-task.md` | Align artifact target definitions with descriptive paths. | Ensures consistency in where plans are written. |
| `forge/.claude-plugin/plugin.json` | Bump version from `0.7.0` to `0.7.1`. | Material change to workflow behavior. |
| `forge/migrations.json` | Add migration entry `0.7.0` $\rightarrow$ `0.7.1`. | Triggers regeneration of workflows for users. |

## Plugin Impact Assessment

- **Version bump required?** Yes — Bump to `0.7.1`. Changes to meta-workflows alter the generated behavior of the SDLC process.
- **Migration entry required?** Yes — `regenerate: ["workflows"]`.
- **Security scan required?** Yes — modifies files within the `forge/` source directory.
- **Schema change?** No — store JSONs still use short IDs for keys; only the `path` field values change.

## Testing Strategy

- **Syntax check:** `node --check` on all modified JS/CJS files (none in this task, but standard check).
- **Manual verification:** 
    - Verify `meta-sprint-plan.md` explicitly mentions the `ID-description` format.
    - Verify `meta-orchestrate.md` prompt assembly now includes absolute path injection.
- **Store validation:** `node forge/tools/validate-store.cjs --dry-run` to ensure no schema regressions.

## Acceptance Criteria

- [ ] `meta-sprint-plan.md` instructs the Architect to use `ID-description` folder naming.
- [ ] `meta-orchestrate.md` injects a "Current Working Context" block with absolute paths into subagent prompts.
- [ ] `meta-plan-task.md` target folder definitions align with descriptive paths.
- [ ] `forge/.claude-plugin/plugin.json` version is `0.7.1`.
- [ ] `forge/migrations.json` contains entry for `0.7.0` $\rightarrow$ `0.7.1` with `regenerate: ["workflows"]`.
- [ ] `node --check` passes on all modified files.
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0.

## Operational Impact

- **Distribution:** Users will need to run `/forge:update` to apply the new meta-workflows.
- **Backwards compatibility:** Preserved. Existing folder structures remain valid, but new ones will follow the descriptive convention.
