# FORGE-S06-T01: Fix orchestrator persona lookup + model announcement

**Sprint:** FORGE-S06
**Estimate:** M
**Pipeline:** default

---

## Objective

Fix the orchestrator's persona file lookup to use noun-based filenames via PERSONA_MAP instead of role-based filenames, and include the resolved model in the agent identity announcement line. This closes SPRINT_REQUIREMENTS items 1b and 1e.

## Acceptance Criteria

1. The Execution Algorithm in `meta-orchestrate.md` uses a noun-based persona file lookup derived from PERSONA_MAP (e.g., `phase.role = "plan"` → `.forge/personas/engineer.md`) instead of `read_file(f".forge/personas/{phase.role}.md")`
2. An explicit role→noun mapping table is added to the Generation Instructions (e.g., `"plan" → "engineer"`, `"approve" → "architect"`)
3. The `skill_content` lookup also uses noun-based filenames consistently
4. The announcement line includes the resolved model: `{emoji} **Forge {AgentNoun}** — {TaskID} · {tagline} [{resolved_model}]`
5. `node --check` passes on all modified files (meta-workflows are Markdown, so N/A, but any JS touched must pass)

## Context

Currently the orchestrator does:
```python
persona_content = read_file(f".forge/personas/{phase.role}.md")  # e.g. "plan.md"
skill_content = read_file(f".forge/skills/{phase.role}-skills.md")
```

But persona files should be named by noun (engineer.md, supervisor.md, architect.md), not by role (plan.md, approve.md). The PERSONA_MAP already maps roles to nouns — we just need to use it for file lookups too.

The announcement line currently is:
```
{emoji} **Forge {persona_name}** — {phase.name} · {task_id}
```

It should become:
```
{emoji} **Forge {persona_name}** — {task_id} · {tagline} [{resolved_model}]
```

Note: the tagline is already in PERSONA_MAP, just not used in the current print line. The `{resolved_model}` is `phase_model` from the model resolution step.

## Plugin Artifacts Involved

- `forge/meta/workflows/meta-orchestrate.md` — the only file to modify

## Operational Impact

- **Version bump:** required — changes how generated orchestrators resolve persona files and format announcements
- **Regeneration:** users must run `/forge:update` to regenerate `orchestrate_task.md`
- **Security scan:** required