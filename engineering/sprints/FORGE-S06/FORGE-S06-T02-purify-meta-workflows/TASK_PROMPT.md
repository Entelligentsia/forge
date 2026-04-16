# FORGE-S06-T02: Purify meta-workflows — remove Persona sections, reassign sprint-intake to PM

**Sprint:** FORGE-S06
**Estimate:** M
**Pipeline:** default

---

## Objective

Remove all `## Persona` sections from meta-workflow templates so persona content is injected at spawn time from `.forge/personas/{noun}.md`, not baked into the workflow file. Also reassign the sprint-intake persona from Architect to Product Manager (🌸). This closes SPRINT_REQUIREMENTS items 1a and 1c.

## Acceptance Criteria

1. No `## Persona` section exists in any `forge/meta/workflows/meta-*.md` file
2. For orchestrator-spawned phases (plan, implement, review, approve, commit, validate): persona is injected by the orchestrator (already handled by T01's noun-based lookup). No persona declaration needed in the workflow.
3. For standalone command workflows (sprint-intake, sprint-plan, retrospective, collate, fix-bug, review-sprint-completion): add a Generation Instruction that the generated workflow must `Read .forge/personas/{noun}.md` as its first step, where `{noun}` is derived from the persona that was previously declared inline
4. Sprint-intake references Product Manager persona (`product-manager.md`) instead of Architect
5. No `## Persona` section in any generated `.forge/workflows/*.md` (verified after regeneration)
6. `node --check` passes on all modified files (meta-workflows are Markdown, so N/A)

## Context

All 16 meta-workflows currently have `## Persona` sections. These bake persona declarations into the generated output, creating duplication (the orchestrator also injects persona at spawn time) and making persona changes require regeneration.

The PERSONA_MAP from T01 provides the role→noun mapping. For standalone commands not spawned by the orchestrator, the workflow itself must read the persona file.

**Current persona assignments by workflow:**
| Workflow | Current Persona | Noun for file lookup |
|---|---|---|
| meta-sprint-intake | Architect | ~~architect~~ → product-manager |
| meta-sprint-plan | Architect | architect |
| meta-implement | Engineer | engineer |
| meta-plan-task | Engineer | engineer |
| meta-update-plan | Engineer | engineer |
| meta-update-implementation | Engineer | engineer |
| meta-review-plan | Supervisor | supervisor |
| meta-review-implementation | Supervisor | supervisor |
| meta-validate | QA Engineer | qa-engineer |
| meta-approve | Architect | architect |
| meta-commit | Engineer | engineer |
| meta-collate | Collator | collator |
| meta-retrospective | Architect | architect |
| meta-fix-bug | Bug Fixer | bug-fixer |
| meta-review-sprint-completion | Architect | architect |
| meta-orchestrate | Orchestrator | orchestrator |

For the orchestrator workflow, T01 already handles persona injection. The `## Persona` section in meta-orchestrate should also be removed as part of this task.

## Plugin Artifacts Involved

- All 16 files in `forge/meta/workflows/meta-*.md`

## Operational Impact

- **Version bump:** required — structural change to generated workflow output
- **Regeneration:** users must run `/forge:update` to regenerate all workflows
- **Security scan:** required