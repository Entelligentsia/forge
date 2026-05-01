---
requirements:
  reasoning: High
  context: Medium
  speed: Low
audience: subagent
phase: approve
context:
  architecture: true
  prior_summaries: all
  persona: summary
  master_index: false
  diff_mode: false
deps:
  personas: [architect]
  skills: [architect, generic]
  templates: []
  sub_workflows: []
  kb_docs: [architecture/stack.md]
  config_fields: [paths.engineering]
---

# Approve Task
## Algorithm

```

0. Pre-flight Gate Check:
   - Resolve FORGE_ROOT (`node -e "console.log(require('./.forge/config.json').paths.forgeRoot)"`).
   - Run: `node "$FORGE_ROOT/tools/preflight-gate.cjs" --phase approve --task {taskId}`
   - Exit 1 (gate failed) → print stderr and HALT. Do not proceed; do not attempt to produce the artifact.
   - Exit 2 (misconfiguration) → print stderr and HALT.
   - Exit 0 → continue.
1. Load Context:
   - Read task prompt
   - Read final PLAN.md
   - Read approved CODE_REVIEW.md
   - Read PROGRESS.md

2. Architectural Review:
   - Verify implementation aligns with project architecture
   - Check for cross-cutting concerns (impact on other modules)
   - Assess operational impact (deployment changes, migrations)

3. Sign Off:
   - Write ARCHITECT_APPROVAL.md with:
     - Approval status
     - Deployment notes
     - Follow-up items for future sprints

4. Finalize:
   - Update task status via `/forge:store update-status task {taskId} status approved`
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see `_fragments/finalize.md`)
```